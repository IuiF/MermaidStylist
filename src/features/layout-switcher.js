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
            setTimeout(() => {
                createCSSLines(connections, currentNodePositions);
            }, 50);
        }
    `;
}

module.exports = {
    getLayoutSwitcher
};