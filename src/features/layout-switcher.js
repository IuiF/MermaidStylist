function getLayoutSwitcher() {
    return `
        // Layout state
        let currentLayout = 'horizontal';
        let currentNodePositions = null;

        function switchLayout(layoutType) {
            currentLayout = layoutType;

            // Update button states
            document.getElementById('verticalBtn').classList.toggle('active', layoutType === 'vertical');
            document.getElementById('horizontalBtn').classList.toggle('active', layoutType === 'horizontal');

            // Apply layout
            if (layoutType === 'vertical') {
                currentNodePositions = verticalLayout(nodes, connections, calculateAllNodeWidths, analyzeTreeStructure);
            } else {
                currentNodePositions = horizontalLayout(nodes, connections, calculateAllNodeWidths, analyzeTreeStructure);
            }

            // Redraw lines
            requestAnimationFrame(() => {
                createCSSLines(connections, currentNodePositions);
                pathHighlighter.reapplyPathHighlight();

                // レイアウト変更後、コンテンツ全体が見えるように位置を調整
                requestAnimationFrame(() => {
                    viewportManager.fitToContent();
                });
            });
        }

        function toggleConnectionLineStyle() {
            const isCurved = toggleLineStyle();

            // Update button states
            document.getElementById('straightLineBtn').classList.toggle('active', !isCurved);
            document.getElementById('curvedLineBtn').classList.toggle('active', isCurved);

            // Redraw lines
            requestAnimationFrame(() => {
                createCSSLines(connections, currentNodePositions);
                pathHighlighter.reapplyPathHighlight();
            });
        }
    `;
}

module.exports = {
    getLayoutSwitcher
};