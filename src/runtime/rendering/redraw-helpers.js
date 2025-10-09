function getRedrawHelpers() {
    return `
        const redrawHelpers = {
            /**
             * エッジを再描画し、すべてのハイライトを再適用
             * @param {Array} connections - 接続データ
             * @param {Object} nodePositions - ノード位置データ
             */
            redrawConnectionsWithHighlights: function(connections, nodePositions) {
                createCSSLines(connections, nodePositions);
                pathHighlighter.reapplyPathHighlight();
                highlightManager.reapplyRelationHighlight();
            },

            /**
             * ビューポートの境界を更新
             * @param {Object} options - オプション
             * @param {boolean} options.fitToContent - コンテンツに合わせて表示するか (デフォルト: false)
             */
            updateViewport: function(options = {}) {
                const { fitToContent = false } = options;

                requestAnimationFrame(() => {
                    viewportManager.updateContentBounds();
                    if (fitToContent) {
                        viewportManager.fitToContent();
                    }
                });
            },

            /**
             * 現在のレイアウトモードでレイアウトを再計算
             * @param {string} layoutMode - 'horizontal' または 'vertical'
             * @returns {Object} ノード位置データ
             */
            recalculateLayout: function(layoutMode) {
                if (layoutMode === 'vertical') {
                    return verticalLayout(
                        allNodes,
                        connections,
                        calculateAllNodeWidths,
                        (n, c) => analyzeTreeStructure(n, c, dashedNodes)
                    );
                } else {
                    return horizontalLayout(
                        allNodes,
                        connections,
                        calculateAllNodeWidths,
                        (n, c) => analyzeTreeStructure(n, c, dashedNodes)
                    );
                }
            }
        };
    `;
}

module.exports = {
    getRedrawHelpers
};
