function getSVGHelpers() {
    return `
        const svgHelpers = {
            createElement: function(type, attributes = {}) {
                const element = document.createElementNS('http://www.w3.org/2000/svg', type);
                for (const [key, value] of Object.entries(attributes)) {
                    if (value !== null && value !== undefined) {
                        element.setAttribute(key, value);
                    }
                }
                return element;
            },

            createRect: function(attributes = {}) {
                return this.createElement('rect', attributes);
            },

            createText: function(content, attributes = {}) {
                const element = this.createElement('text', attributes);
                element.textContent = content;
                return element;
            },

            createGroup: function(attributes = {}) {
                return this.createElement('g', attributes);
            },

            createLine: function(attributes = {}) {
                return this.createElement('line', attributes);
            },

            createPolygon: function(points, attributes = {}) {
                return this.createElement('polygon', { ...attributes, points });
            },

            getSVGLayer: function() {
                return document.getElementById('svgLayer');
            },

            getNodeElement: function(nodeId) {
                return document.getElementById(nodeId);
            },

            parseTransform: function(transformAttr) {
                let x = 0, y = 0;
                if (transformAttr) {
                    const match = transformAttr.match(/translate\\(([^,\\s]+)\\s*,\\s*([^)]+)\\)/);
                    if (match) {
                        x = parseFloat(match[1]);
                        y = parseFloat(match[2]);
                    }
                }
                return { x, y };
            },

            addDoubleStroke: function(nodeElement) {
                const rect = nodeElement.querySelector('.node-rect');
                if (!rect) return;

                const existingOverlay = nodeElement.querySelector('.double-stroke-overlay');
                if (existingOverlay) {
                    existingOverlay.remove();
                }

                const overlayRect = this.createRect({
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
            }
        };
    `;
}

module.exports = {
    getSVGHelpers
};