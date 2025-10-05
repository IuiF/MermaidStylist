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

                // 最終的な垂直セグメントX座標を返す
                const result = {};
                Object.keys(parentVerticalSegmentX).forEach(parentId => {
                    result[parentId] = parentVerticalSegmentX[parentId] + (parentMaxOffset[parentId] || 0);
                });

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

                Object.keys(parentChildrenYRanges).forEach(parentId => {
                    const firstEdge = edgeInfos.find(e => e.conn.from === parentId && !e.is1to1Horizontal);
                    if (!firstEdge) return;

                    const depth = firstEdge.depth;
                    const x1 = firstEdge.x1;
                    const x2 = firstEdge.x2;

                    // この階層内での親のランクを計算
                    const parentsAtThisDepth = edgeInfos
                        .filter(e => e.depth === depth && !e.is1to1Horizontal)
                        .map(e => e.conn.from)
                        .filter((v, i, a) => a.indexOf(v) === i)
                        .sort((a, b) => (parentYPositions[a] || 0) - (parentYPositions[b] || 0));

                    const parentRankInDepth = parentsAtThisDepth.indexOf(parentId);
                    const totalParentsInDepth = parentsAtThisDepth.length;
                    const basePreference = totalParentsInDepth - 1 - parentRankInDepth;
                    const preferredLane = basePreference * 3;

                    const childrenRange = parentChildrenYRanges[parentId];
                    const assignedLane = this._findBestLaneForParent(
                        parentId,
                        depth,
                        childrenRange.yMin,
                        childrenRange.yMax,
                        preferredLane,
                        lanesByDepth,
                        parentAssignedLanes
                    );

                    const maxParentRight = depthMaxParentRight[depth] || x1;
                    const minChildLeft = depthMinChildLeft[depth] || x2;
                    const availableWidth = Math.max(minChildLeft - maxParentRight - minOffset * 2, 50);
                    const maxLanes = Math.max(totalParentsInDepth * 3, 10);
                    const laneSpacing = Math.max(5, Math.min(laneWidth, availableWidth / maxLanes));

                    parentVerticalSegmentX[parentId] = maxParentRight + minOffset + (assignedLane * laneSpacing);
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
                const parentMaxOffset = {};

                Object.keys(parentVerticalSegmentX).forEach(parentId => {
                    const baseVerticalX = parentVerticalSegmentX[parentId];
                    let maxOffset = 0;

                    edgeInfos.filter(e => e.conn.from === parentId && !e.is1to1Horizontal).forEach(edgeInfo => {
                        const nodeBounds = getAllNodeBounds(edgeInfo.conn.from, edgeInfo.conn.to);
                        const nodeOffset = calculateNodeAvoidanceOffset(baseVerticalX, edgeInfo.y1, edgeInfo.y2, nodeBounds, edgeInfo.conn.from, edgeInfo.conn.to);
                        const labelOffset = calculateLabelAvoidanceOffset(baseVerticalX + nodeOffset, edgeInfo.y1, edgeInfo.y2, labelBounds, edgeInfo.conn.from, edgeInfo.conn.to);
                        const totalOffset = nodeOffset + labelOffset;
                        maxOffset = Math.max(maxOffset, totalOffset);
                    });

                    parentMaxOffset[parentId] = maxOffset;
                });

                return parentMaxOffset;
            }
        };
    `;
}

module.exports = {
    getVerticalSegmentCalculator
};
