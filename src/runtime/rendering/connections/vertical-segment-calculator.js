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
                    minOffset = 30,
                    laneWidth = 20
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
                const edgesPassingThroughDepth = {};
                edgeInfos.forEach(info => {
                    if (info.is1to1Horizontal) return;

                    const fromDepth = info.depth;
                    // 子ノードのdepthを推定：子ノードが親として他のエッジを持っていればそのdepth、なければfromDepth+1
                    const childDepth = nodeDepthMap[info.conn.to];
                    const toDepth = childDepth !== undefined ? childDepth : fromDepth + 1;

                    // エッジが通過する各depthをカウント
                    // 例: depth=1の親からdepth=3の子へのエッジは、depth=1とdepth=2を通過する
                    for (let d = fromDepth; d < toDepth; d++) {
                        if (!edgesPassingThroughDepth[d]) {
                            edgesPassingThroughDepth[d] = 0;
                        }
                        edgesPassingThroughDepth[d]++;
                    }
                });

                if (window.DEBUG_CONNECTIONS) {
                    console.log('[VerticalSegmentCalculator] Edges passing through each depth:', edgesPassingThroughDepth);
                }

                // 階層ごとに等間隔配置を計算
                Object.keys(parentsByDepth).forEach(depth => {
                    const parents = parentsByDepth[depth];

                    // Y座標でソート（上から下）
                    parents.sort((a, b) => a.yPosition - b.yPosition);

                    const totalParentsInDepth = parents.length;

                    // このdepthを通過する全エッジ数（長距離エッジを含む）
                    const totalEdgesPassingThrough = edgesPassingThroughDepth[depth] || totalParentsInDepth;

                    const maxParentRight = depthMaxParentRight[depth] || parents[0].x1;
                    const minChildLeft = depthMinChildLeft[depth] || parents[0].x2;
                    const rawAvailableWidth = minChildLeft - maxParentRight - minOffset * 2;

                    // Y範囲を計算
                    const yMin = parents[0].yPosition;
                    const yMax = parents[parents.length - 1].yPosition;
                    const yRange = yMax - yMin;

                    // Y範囲が大きい場合は最小間隔を確保
                    const minSpacing = yRange > 100 ? 30 : 10;

                    // 必要な幅は、通過する全エッジ数に基づいて計算
                    const requiredWidth = minSpacing * (Math.max(totalParentsInDepth, totalEdgesPassingThrough) + 1);

                    // 衝突回避オフセットの平均的な値を見込む
                    const estimatedCollisionOffset = requiredWidth * 0.5;

                    // 親の数で等分してレーン間隔を計算
                    const laneSpacing = Math.max(minSpacing, rawAvailableWidth / (totalParentsInDepth + 1));

                    // 中央X座標を計算し、衝突回避オフセットを考慮して配置開始位置を決定
                    const centerX = (maxParentRight + minChildLeft) / 2;
                    const totalWidth = laneSpacing * totalParentsInDepth;
                    const startX = centerX - totalWidth / 2 - estimatedCollisionOffset / 2;

                    if (window.DEBUG_CONNECTIONS) {
                        console.log('[VerticalSegmentCalculator] Depth', depth, ':', parents.length, 'parents,', totalEdgesPassingThrough, 'edges passing, yRange:', yRange.toFixed(1), 'rawAvailableWidth:', rawAvailableWidth.toFixed(1), 'estimatedOffset:', estimatedCollisionOffset.toFixed(1), 'laneSpacing:', laneSpacing.toFixed(1), 'centerX:', centerX.toFixed(1), 'startX:', startX.toFixed(1));
                        parents.forEach(p => console.log('  -', p.parentId, 'y:', p.yPosition.toFixed(1)));
                    }

                    // 各親に等間隔でX座標を割り当て（中央基準で左から右へ配置）
                    parents.forEach((parent, index) => {
                        const x = startX + (index + 0.5) * laneSpacing;
                        parentVerticalSegmentX[parent.parentId] = x;
                        if (window.DEBUG_CONNECTIONS && (parent.parentId === 'A1' || parent.parentId === 'A2')) {
                            console.log('[VerticalSegmentCalculator] Assigning', parent.parentId, 'index:', index, 'x:', x.toFixed(1), '= startX:', startX.toFixed(1), '+ (', index, '+ 0.5 ) *', laneSpacing.toFixed(1));
                        }
                    });
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
                // 親をdepthごとにグループ化
                const parentsByDepth = {};
                Object.keys(parentVerticalSegmentX).forEach(parentId => {
                    const firstEdge = edgeInfos.find(e => e.conn.from === parentId && !e.is1to1Horizontal);
                    if (!firstEdge) return;

                    const depth = firstEdge.depth;
                    if (!parentsByDepth[depth]) {
                        parentsByDepth[depth] = [];
                    }
                    parentsByDepth[depth].push(parentId);
                });

                const parentMaxOffset = {};

                // depthごとに最大オフセットを計算し、同じdepthの全親に適用
                Object.keys(parentsByDepth).forEach(depth => {
                    const parentsInDepth = parentsByDepth[depth];
                    let depthMaxOffset = 0;

                    parentsInDepth.forEach(parentId => {
                        const baseVerticalX = parentVerticalSegmentX[parentId];
                        let parentOffset = 0;

                        edgeInfos.filter(e => e.conn.from === parentId && !e.is1to1Horizontal).forEach(edgeInfo => {
                            const nodeBounds = getAllNodeBounds(edgeInfo.conn.from, edgeInfo.conn.to);
                            const nodeOffset = calculateNodeAvoidanceOffset(baseVerticalX, edgeInfo.y1, edgeInfo.y2, nodeBounds, edgeInfo.conn.from, edgeInfo.conn.to);
                            const labelOffset = calculateLabelAvoidanceOffset(baseVerticalX + nodeOffset, edgeInfo.y1, edgeInfo.y2, labelBounds, edgeInfo.conn.from, edgeInfo.conn.to);
                            const totalOffset = nodeOffset + labelOffset;
                            parentOffset = Math.max(parentOffset, totalOffset);
                        });

                        depthMaxOffset = Math.max(depthMaxOffset, parentOffset);
                    });

                    // 同じdepthの全親に同じオフセットを適用
                    parentsInDepth.forEach(parentId => {
                        parentMaxOffset[parentId] = depthMaxOffset;
                    });
                });

                return parentMaxOffset;
            }
        };
    `;
}

module.exports = {
    getVerticalSegmentCalculator
};
