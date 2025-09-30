function getHighlightManager() {
    return `
        const highlightManager = {
            currentHighlightedLabel: null,

            addDoubleStroke: function(nodeElement) {
                const rect = nodeElement.querySelector('.node-rect');
                if (!rect) return;

                const existingOverlay = nodeElement.querySelector('.double-stroke-overlay');
                if (existingOverlay) {
                    existingOverlay.remove();
                }

                const overlayRect = svgHelpers.createRect({
                    class: 'double-stroke-overlay',
                    x: rect.getAttribute('x'),
                    y: rect.getAttribute('y'),
                    width: rect.getAttribute('width'),
                    height: rect.getAttribute('height'),
                    rx: rect.getAttribute('rx'),
                    ry: rect.getAttribute('ry'),
                    fill: 'none',
                    stroke: '#ffc107',
                    'stroke-width': '2',
                    'pointer-events': 'none'
                });

                rect.parentNode.insertBefore(overlayRect, rect.nextSibling);
            },

            removeDoubleStroke: function(nodeElement) {
                const overlay = nodeElement.querySelector('.double-stroke-overlay');
                if (overlay) {
                    overlay.remove();
                }
            },

            highlightAllByLabel: function(label) {
                this.clearHighlight();

                nodes.forEach(node => {
                    if (node.label === label) {
                        const nodeElement = svgHelpers.getNodeElement(node.id);
                        if (nodeElement) {
                            nodeElement.classList.add('highlighted');

                            if (nodeElement.classList.contains('path-highlighted')) {
                                this.addDoubleStroke(nodeElement);
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
                            const nodeElement = svgHelpers.getNodeElement(node.id);
                            if (nodeElement) {
                                nodeElement.classList.remove('highlighted');
                                this.removeDoubleStroke(nodeElement);
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