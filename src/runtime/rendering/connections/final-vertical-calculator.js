function getFinalVerticalCalculator() {
    return `
        // 最終垂直セグメントX座標計算モジュール

        const finalVerticalCalculator = {
            /**
             * 同じターゲットノードに複数エッジが入る場合のX座標を計算
             * @param {Array} edgeInfos - エッジ情報配列
             * @returns {Object} エッジキー -> 最終垂直X座標のマップ
             */
            calculateFinalVerticalX: function(edgeInfos) {
                // 同じノードに入るエッジをグループ化
                const edgesByTarget = connectionUtils.groupEdgesByTarget(edgeInfos);

                // 各ターゲットノードに対して、エッジの順序を決定
                const edgeToFinalVerticalX = {};
                Object.keys(edgesByTarget).forEach(target => {
                    const edges = edgesByTarget[target];
                    if (edges.length > 1) {
                        // 複数のエッジがある場合、X座標で分散（ノードの左側に配置）
                        const toElement = svgHelpers.getNodeElement(target);
                        if (toElement) {
                            const toPos = getNodePosition(toElement);
                            const spacing = CONNECTION_CONSTANTS.EDGE_SPACING;

                            edges.forEach((edge, index) => {
                                const offset = spacing * (edges.length - index);
                                edgeToFinalVerticalX[edge.conn.from + '->' + edge.conn.to] = toPos.left - offset;
                            });
                        }
                    }
                });

                return edgeToFinalVerticalX;
            }
        };
    `;
}

module.exports = {
    getFinalVerticalCalculator
};
