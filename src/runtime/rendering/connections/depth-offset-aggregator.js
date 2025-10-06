function getDepthOffsetAggregator() {
    return `
        // Depth単位で衝突回避オフセットを集約するモジュール

        const depthOffsetAggregator = {
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
    `;
}

module.exports = {
    getDepthOffsetAggregator
};
