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

                // 最終的な垂直セグメントX座標を計算し、depthごとに中央配置調整
                const tempResult = {};
                Object.keys(parentVerticalSegmentX).forEach(parentId => {
                    const baseX = parentVerticalSegmentX[parentId];
                    const offset = parentMaxOffset[parentId] || 0;
                    tempResult[parentId] = baseX + offset;
                });

                // depthごとに平均X座標と利用可能幅の中央を計算
                const depthAdjustments = {};
                const parentsByDepth = {};
                Object.keys(tempResult).forEach(parentId => {
                    const firstEdge = edgeInfos.find(e => e.conn.from === parentId && !e.is1to1Horizontal);
                    if (!firstEdge) return;

                    const depth = firstEdge.depth;
                    if (!parentsByDepth[depth]) {
                        parentsByDepth[depth] = {
                            parents: [],
                            maxParentRight: depthMaxParentRight[depth],
                            minChildLeft: depthMinChildLeft[depth]
                        };
                    }
                    parentsByDepth[depth].parents.push({
                        parentId: parentId,
                        x: tempResult[parentId]
                    });
                });

                // depthごとに中央配置のための調整値を計算
                Object.keys(parentsByDepth).forEach(depth => {
                    const info = parentsByDepth[depth];
                    const avgX = info.parents.reduce((sum, p) => sum + p.x, 0) / info.parents.length;
                    const centerX = (info.maxParentRight + info.minChildLeft) / 2;
                    depthAdjustments[depth] = centerX - avgX;
                });

                // 調整を適用して最終結果を生成
                const result = {};
                Object.keys(tempResult).forEach(parentId => {
                    const firstEdge = edgeInfos.find(e => e.conn.from === parentId && !e.is1to1Horizontal);
                    const depth = firstEdge ? firstEdge.depth : null;
                    const adjustment = depth !== null ? (depthAdjustments[depth] || 0) : 0;
                    result[parentId] = tempResult[parentId] + adjustment;

                    if (window.DEBUG_CONNECTIONS && (parentId === 'A1' || parentId === 'A2')) {
                        console.log('[VerticalSegmentCalculator] Final', parentId, ':', result[parentId].toFixed(1), '= temp:', tempResult[parentId].toFixed(1), '+ centerAdj:', adjustment.toFixed(1));
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

                // 階層ごとに等間隔配置を計算
                Object.keys(parentsByDepth).forEach(depth => {
                    const parents = parentsByDepth[depth];

                    // Y座標でソート（上から下）
                    parents.sort((a, b) => a.yPosition - b.yPosition);

                    const totalParentsInDepth = parents.length;
                    const maxParentRight = depthMaxParentRight[depth] || parents[0].x1;
                    const minChildLeft = depthMinChildLeft[depth] || parents[0].x2;
                    const rawAvailableWidth = minChildLeft - maxParentRight - minOffset * 2;

                    // 衝突回避オフセットの平均的な値を見込んで、availableWidthを調整
                    // これにより、最終的な位置が中央付近になる
                    const estimatedCollisionOffset = rawAvailableWidth * 0.5;
                    const availableWidth = Math.max(rawAvailableWidth - estimatedCollisionOffset, 50);

                    // Y範囲を計算
                    const yMin = parents[0].yPosition;
                    const yMax = parents[parents.length - 1].yPosition;
                    const yRange = yMax - yMin;

                    // Y範囲が大きい場合は最小間隔を確保
                    const minSpacing = yRange > 100 ? 30 : 10;
                    const requiredWidth = minSpacing * (totalParentsInDepth + 1);
                    const effectiveWidth = Math.max(availableWidth, requiredWidth);

                    // 親の数で等分してレーン間隔を計算（+1で割って端のマージンを確保）
                    const laneSpacing = effectiveWidth / (totalParentsInDepth + 1);

                    if (window.DEBUG_CONNECTIONS) {
                        console.log('[VerticalSegmentCalculator] Depth', depth, ':', parents.length, 'parents, yRange:', yRange.toFixed(1), 'availableWidth:', availableWidth.toFixed(1), 'effectiveWidth:', effectiveWidth.toFixed(1), 'laneSpacing:', laneSpacing.toFixed(1));
                        parents.forEach(p => console.log('  -', p.parentId, 'y:', p.yPosition.toFixed(1)));
                    }

                    // 各親に等間隔でX座標を割り当て（上から下へ順に、右から左へ配置）
                    parents.forEach((parent, index) => {
                        const positionIndex = index;
                        const x = maxParentRight + minOffset + ((totalParentsInDepth - positionIndex) * laneSpacing);
                        parentVerticalSegmentX[parent.parentId] = x;
                        if (window.DEBUG_CONNECTIONS && (parent.parentId === 'A1' || parent.parentId === 'A2')) {
                            console.log('[VerticalSegmentCalculator] Assigning', parent.parentId, 'index:', index, 'x:', x.toFixed(1), '= maxParentRight:', maxParentRight.toFixed(1), '+ minOffset:', minOffset, '+', (totalParentsInDepth - positionIndex), '*', laneSpacing.toFixed(1));
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
