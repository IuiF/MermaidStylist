function getHighlightManager() {
    return `
        const highlightManager = {
            currentHighlightedLabel: null,
            currentHighlightedNodeId: null,
            currentHighlightTimeout: null,

            addDoubleStroke: function(nodeElement) {
                const rect = nodeElement.querySelector('.node-rect');
                if (!rect) return;

                const existingOverlay = nodeElement.querySelector('.double-stroke-overlay');
                if (existingOverlay) {
                    existingOverlay.remove();
                }

                const overlayRect = svgHelpers.createRect({
                    class: 'double-stroke-overlay',
                    x: rect.getAttribute('x') || 0,
                    y: rect.getAttribute('y') || 0,
                    width: rect.getAttribute('width'),
                    height: rect.getAttribute('height'),
                    rx: rect.getAttribute('rx'),
                    ry: rect.getAttribute('ry'),
                    fill: 'none',
                    stroke: '#ffc107',
                    'stroke-width': '3',
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
            },

            highlightOriginalNode: function(originalNodeId, duration = 2000) {
                // 既存のハイライトをクリア
                if (this.currentHighlightTimeout) {
                    clearTimeout(this.currentHighlightTimeout);
                }
                if (this.currentHighlightedNodeId) {
                    const prevNode = svgHelpers.getNodeElement(this.currentHighlightedNodeId);
                    if (prevNode) {
                        prevNode.classList.remove('highlighted');
                        this.removeDoubleStroke(prevNode);
                    }
                }

                // 新しいハイライトを設定
                const nodeElement = svgHelpers.getNodeElement(originalNodeId);
                if (!nodeElement) {
                    return;
                }

                nodeElement.classList.add('highlighted');
                this.addDoubleStroke(nodeElement);
                this.currentHighlightedNodeId = originalNodeId;

                this.currentHighlightTimeout = setTimeout(() => {
                    nodeElement.classList.remove('highlighted');
                    this.removeDoubleStroke(nodeElement);
                    this.currentHighlightedNodeId = null;
                    this.currentHighlightTimeout = null;
                }, duration);
            }
        };
    `;
}

module.exports = {
    getHighlightManager
};