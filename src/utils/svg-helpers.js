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

            createPath: function(d, attributes = {}) {
                return this.createElement('path', { ...attributes, d });
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
            }
        };
    `;
}

module.exports = {
    getSVGHelpers
};