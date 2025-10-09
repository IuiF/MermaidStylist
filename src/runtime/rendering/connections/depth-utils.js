function getDepthUtils() {
    return `
        // 階層（Depth）関連の計算モジュール

        const depthUtils = {
            /**
             * 階層ごとの親の右端と子の左端を計算
             * @param {Array} edgeInfos - エッジ情報の配列
             * @param {Object} levelInfo - レイアウトから提供される階層情報
             * @returns {Object} depthMaxParentRightとdepthMinChildLeftのオブジェクト
             */
            calculateDepthBounds: function(edgeInfos, levelInfo) {
                const levelXPositions = levelInfo.levelXPositions || [];
                const levelMaxWidths = levelInfo.levelMaxWidths || [];

                const depthMaxParentRight = {}; // depth -> max(parentRight)
                const depthMinChildLeft = {}; // depth -> min(childLeft)

                edgeInfos.forEach(info => {
                    // 真横の1:1のみレーン計算から除外
                    if (info.is1to1Horizontal) return;

                    const depth = info.depth;

                    // 階層情報がある場合は、その階層の最大ノード幅を使用
                    if (levelXPositions[depth] !== undefined && levelMaxWidths[depth] !== undefined) {
                        const levelMaxRight = levelXPositions[depth] + levelMaxWidths[depth];
                        depthMaxParentRight[depth] = levelMaxRight;
                    } else {
                        // フォールバック: 実際のエッジの開始位置から計算
                        if (!depthMaxParentRight[depth] || info.x1 > depthMaxParentRight[depth]) {
                            depthMaxParentRight[depth] = info.x1;
                        }
                    }

                    // 次の階層の左端
                    const nextDepth = depth + 1;
                    if (levelXPositions[nextDepth] !== undefined) {
                        if (!depthMinChildLeft[depth] || levelXPositions[nextDepth] < depthMinChildLeft[depth]) {
                            depthMinChildLeft[depth] = levelXPositions[nextDepth];
                        }
                    } else {
                        // フォールバック: 実際のエッジの終了位置から計算
                        if (!depthMinChildLeft[depth] || info.x2 < depthMinChildLeft[depth]) {
                            depthMinChildLeft[depth] = info.x2;
                        }
                    }
                });

                return {
                    depthMaxParentRight: depthMaxParentRight,
                    depthMinChildLeft: depthMinChildLeft
                };
            },

            /**
             * Depth単位で衝突回避オフセットを集約
             * 同じdepth内のすべての親に最大オフセット値を適用することで、
             * エッジの垂直セグメントが揃って配置される
             *
             * @param {Array} edgeInfos - エッジ情報配列
             * @param {Object} parentVerticalSegmentX - 親ID -> 基本X座標のマップ
             * @param {Array} labelBounds - ラベルのバウンディングボックス配列
             * @param {Function} getAllNodeBounds - ノードバウンディングボックス取得関数
             * @param {Function} calculateNodeAvoidanceOffset - ノード回避オフセット計算関数
             * @param {Function} calculateLabelAvoidanceOffset - ラベル回避オフセット計算関数
             * @returns {Object} parentId -> 集約されたオフセット値のマップ
             */
            aggregateOffsetsByDepth: function(
                edgeInfos,
                parentVerticalSegmentX,
                labelBounds,
                getAllNodeBounds,
                calculateNodeAvoidanceOffset,
                calculateLabelAvoidanceOffset
            ) {
                // 親をdepthごとにグループ化
                const parentsByDepth = connectionUtils.groupParentsByDepth(edgeInfos, parentVerticalSegmentX);

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

                    // 同じdepthの全親に同じオフセットを適用（垂直セグメントを揃える）
                    parentsInDepth.forEach(parentId => {
                        parentMaxOffset[parentId] = depthMaxOffset;
                    });
                });

                return parentMaxOffset;
            }
        };

        // 後方互換性のためのエイリアス
        const depthCalculator = {
            calculateDepthBounds: depthUtils.calculateDepthBounds
        };

        const depthOffsetAggregator = {
            aggregateOffsetsByDepth: depthUtils.aggregateOffsetsByDepth
        };
    `;
}

module.exports = {
    getDepthUtils
};
