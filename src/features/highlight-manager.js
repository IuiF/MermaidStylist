function getHighlightManager() {
    return `
        const highlightManager = {
            currentHighlightedLabel: null,

            highlightAllByLabel: function(label) {
                this.clearHighlight();

                nodes.forEach(node => {
                    if (node.label === label) {
                        const nodeElement = document.getElementById(node.id);
                        if (nodeElement) {
                            nodeElement.classList.add('highlighted');

                            if (nodeElement.classList.contains('path-highlighted')) {
                                svgHelpers.addDoubleStroke(nodeElement);
                            }
                        }
                    }
                });

                this.currentHighlightedLabel = label;
            },

            clearHighlight: function() {
                if (this.currentHighlightedLabel) {
                    nodes.forEach(node => {
                        if (node.label === this.currentHighlightedLabel) {
                            const nodeElement = document.getElementById(node.id);
                            if (nodeElement) {
                                nodeElement.classList.remove('highlighted');
                                svgHelpers.removeDoubleStroke(nodeElement);
                            }
                        }
                    });
                    this.currentHighlightedLabel = null;
                }
            }
        };
    `;
}

module.exports = {
    getHighlightManager
};