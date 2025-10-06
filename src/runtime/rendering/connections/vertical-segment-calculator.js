function getVerticalSegmentCalculator() {
    return `
        // 親ごとの垂直セグメントX座標を計算する統一モジュール
        const verticalSegmentCalculator = {
            /**
             * 親ごとの垂直セグメントX座標を計算
             * @param {Array} edgeInfos - エッジ情報の配列
             * @param {Object} options - 計算オプション
             * @returns {Object} 親IDをキーとした垂直セグメントX座標のマップ
             */
            calculate: function(edgeInfos, options) {
                if (window.DEBUG_CONNECTIONS) {
                    console.log('[VerticalSegmentCalculator] Starting calculation for', edgeInfos.length, 'edges');
                }
                const {
                    parentYPositions = {},
                    depthMaxParentRight = {},
                    depthMinChildLeft = {},
                    labelBounds = [],
                    getAllNodeBounds = () => [],
                    calculateNodeAvoidanceOffset = () => 0,
                    calculateLabelAvoidanceOffset = () => 0,
                    minOffset = CONNECTION_CONSTANTS.MIN_OFFSET,
                    laneWidth = CONNECTION_CONSTANTS.LANE_WIDTH
                } = options;

                // 親ごとの子のY範囲を計算
                const parentChildrenYRanges = this._calculateParentChildrenYRanges(edgeInfos);

                // レーン管理
                const lanesByDepth = {};
                const parentAssignedLanes = {};

                // 親ごとの基本垂直セグメントX座標を計算
                const parentVerticalSegmentX = this._calculateBaseVerticalSegmentX(
                    edgeInfos,
                    parentChildrenYRanges,
                    parentYPositions,
                    depthMaxParentRight,
                    depthMinChildLeft,
                    lanesByDepth,
                    parentAssignedLanes,
                    minOffset,
                    laneWidth
                );

                // 衝突回避オフセットを計算
                const parentMaxOffset = this._calculateCollisionOffsets(
                    edgeInfos,
                    parentVerticalSegmentX,
                    labelBounds,
                    getAllNodeBounds,
                    calculateNodeAvoidanceOffset,
                    calculateLabelAvoidanceOffset
                );

                // 最終的な垂直セグメントX座標を計算（baseX + collisionOffset）
                const result = {};
                Object.keys(parentVerticalSegmentX).forEach(parentId => {
                    const baseX = parentVerticalSegmentX[parentId];
                    const offset = parentMaxOffset[parentId] || 0;
                    result[parentId] = baseX + offset;

                    if (window.DEBUG_CONNECTIONS && (parentId === 'A1' || parentId === 'A2')) {
                        console.log('[VerticalSegmentCalculator] Final', parentId, ':', result[parentId].toFixed(1), '= baseX:', baseX.toFixed(1), '+ offset:', offset.toFixed(1));
                    }
                });

                if (window.DEBUG_CONNECTIONS) {
                    console.log('[VerticalSegmentCalculator] Result:', result);
                    Object.keys(result).forEach(parentId => {
                        const edges = edgeInfos.filter(e => e.conn.from === parentId && !e.is1to1Horizontal);
                        const firstEdge = edges[0];
                        const depth = firstEdge ? firstEdge.depth : 'unknown';
                        const yPos = parentYPositions[parentId] || 0;
                        console.log('  Parent', parentId, 'depth:', depth, 'y:', yPos.toFixed(1), 'x:', result[parentId].toFixed(1), '(', edges.length, 'edges )');
                    });
                }

                return result;
            },

            /**
             * 親ごとの子のY範囲を計算
             */
            _calculateParentChildrenYRanges: function(edgeInfos) {
                const parentChildrenYRanges = {};
                edgeInfos.forEach(info => {
                    if (info.is1to1Horizontal) return;

                    if (!parentChildrenYRanges[info.conn.from]) {
                        parentChildrenYRanges[info.conn.from] = { yMin: Infinity, yMax: -Infinity };
                    }
                    const range = parentChildrenYRanges[info.conn.from];
                    range.yMin = Math.min(range.yMin, info.y2);
                    range.yMax = Math.max(range.yMax, info.y2);
                });
                return parentChildrenYRanges;
            },

            /**
             * 基本垂直セグメントX座標を計算
             */
            _calculateBaseVerticalSegmentX: function(
                edgeInfos,
                parentChildrenYRanges,
                parentYPositions,
                depthMaxParentRight,
                depthMinChildLeft,
                lanesByDepth,
                parentAssignedLanes,
                minOffset,
                laneWidth
            ) {
                const parentVerticalSegmentX = {};

                // 階層ごとに親をグループ化
                const parentsByDepth = {};
                Object.keys(parentChildrenYRanges).forEach(parentId => {
                    const firstEdge = edgeInfos.find(e => e.conn.from === parentId && !e.is1to1Horizontal);
                    if (!firstEdge) return;

                    const depth = firstEdge.depth;
                    if (!parentsByDepth[depth]) {
                        parentsByDepth[depth] = [];
                    }
                    parentsByDepth[depth].push({
                        parentId: parentId,
                        yPosition: parentYPositions[parentId] || 0,
                        x1: firstEdge.x1,
                        x2: firstEdge.x2
                    });
                });

                // 各ノードのdepthをマッピング
                const nodeDepthMap = {};
                edgeInfos.forEach(info => {
                    nodeDepthMap[info.conn.from] = info.depth;
                });

                // 各depthを通過する全エッジ数をカウント（長距離エッジを含む）
                const edgesPassingThroughDepth = edgeSpacingCalculator.countEdgesPassingThroughDepth(edgeInfos, nodeDepthMap);

                // 階層ごとに等間隔配置を計算
                Object.keys(parentsByDepth).forEach(depth => {
                    const parents = parentsByDepth[depth];
                    const totalParentsInDepth = parents.length;
                    const totalEdgesPassingThrough = edgesPassingThroughDepth[depth] || totalParentsInDepth;
                    const maxParentRight = depthMaxParentRight[depth] || parents[0].x1;
                    const minChildLeft = depthMinChildLeft[depth] || parents[0].x2;

                    const spacing = edgeSpacingCalculator.calculateEvenSpacing(
                        parents,
                        depth,
                        totalEdgesPassingThrough,
                        maxParentRight,
                        minChildLeft,
                        minOffset
                    );

                    Object.assign(parentVerticalSegmentX, spacing);
                });

                return parentVerticalSegmentX;
            },

            /**
             * レーンを検索・割り当て
             */
            _findBestLaneForParent: function(
                parentId,
                depth,
                childrenYMin,
                childrenYMax,
                preferredLane,
                lanesByDepth,
                parentAssignedLanes
            ) {
                if (parentAssignedLanes[parentId] !== undefined) {
                    return parentAssignedLanes[parentId];
                }

                if (!lanesByDepth[depth]) {
                    lanesByDepth[depth] = [];
                }
                const occupiedLanes = lanesByDepth[depth];

                let laneIndex = preferredLane;

                while (true) {
                    let hasConflict = false;
                    for (const lane of occupiedLanes) {
                        if (lane.laneIndex === laneIndex) {
                            for (const seg of lane.segments) {
                                const yOverlap = !(childrenYMax < seg.yMin || childrenYMin > seg.yMax);
                                if (yOverlap) {
                                    hasConflict = true;
                                    break;
                                }
                            }
                            if (hasConflict) break;
                        }
                    }

                    if (!hasConflict) {
                        let lane = occupiedLanes.find(l => l.laneIndex === laneIndex);
                        if (!lane) {
                            lane = { laneIndex: laneIndex, segments: [] };
                            occupiedLanes.push(lane);
                        }
                        lane.segments.push({
                            yMin: childrenYMin,
                            yMax: childrenYMax
                        });

                        parentAssignedLanes[parentId] = laneIndex;
                        return laneIndex;
                    }

                    laneIndex++;
                }
            },

            /**
             * 衝突回避オフセットを計算
             */
            _calculateCollisionOffsets: function(
                edgeInfos,
                parentVerticalSegmentX,
                labelBounds,
                getAllNodeBounds,
                calculateNodeAvoidanceOffset,
                calculateLabelAvoidanceOffset
            ) {
                return collisionOffsetCalculator.calculate(
                    edgeInfos,
                    parentVerticalSegmentX,
                    labelBounds,
                    getAllNodeBounds,
                    calculateNodeAvoidanceOffset,
                    calculateLabelAvoidanceOffset
                );
            }
        };
    `;
}

module.exports = {
    getVerticalSegmentCalculator
};
