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
                }

                // horizontal layoutはV2システムを使用
                const nodeWidths = new Map();
                allNodes.forEach(node => {
                    const element = document.getElementById(node.id);
                    if (element) {
                        const width = parseInt(element.getAttribute('data-width')) || 0;
                        nodeWidths.set(node.id, width);
                    }
                });

                const dashedNodeSet = new Set();
                dashedNodes.forEach(node => {
                    dashedNodeSet.add(node.id);
                });

                const treeStructure = analyzeTreeStructure(allNodes, connections, dashedNodes);

                const input = {
                    nodes: allNodes,
                    connections: connections,
                    treeStructure: treeStructure,
                    nodeWidths: nodeWidths,
                    dashedNodes: dashedNodeSet
                };

                const nodePositions = v2LayoutEngine.calculateLayout(input);

                const nodePositionsObj = {};
                nodePositions.forEach((pos, nodeId) => {
                    nodePositionsObj[nodeId] = pos;
                });

                Object.keys(nodePositionsObj).forEach(nodeId => {
                    const element = document.getElementById(nodeId);
                    if (element) {
                        const pos = nodePositionsObj[nodeId];
                        element.setAttribute('transform', 'translate(' + pos.x + ',' + pos.y + ')');
                    }
                });

                return nodePositionsObj;
            }
        };
    `;
}

module.exports = {
    getRedrawHelpers
};
