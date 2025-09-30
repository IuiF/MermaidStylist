function getPathHighlighter() {
    return `
        const pathHighlighter = {
            currentHighlightedNodeId: null,

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

            highlightPathToRoot: function(nodeId) {
                this.clearPathHighlight();
                this.currentHighlightedNodeId = nodeId;

                const parentMap = new Map();
                connections.forEach(conn => {
                    if (!parentMap.has(conn.to)) {
                        parentMap.set(conn.to, []);
                    }
                    parentMap.get(conn.to).push(conn.from);
                });

                const pathNodes = new Set();
                const pathConnections = new Set();
                const queue = [nodeId];
                const visited = new Set([nodeId]);
                pathNodes.add(nodeId);

                while (queue.length > 0) {
                    const currentId = queue.shift();
                    const parents = parentMap.get(currentId) || [];

                    for (const parentId of parents) {
                        pathNodes.add(parentId);
                        pathConnections.add(parentId + '->' + currentId);

                        if (!visited.has(parentId)) {
                            visited.add(parentId);
                            queue.push(parentId);
                        }
                    }
                }

                pathNodes.forEach(id => {
                    const element = svgHelpers.getNodeElement(id);
                    if (element) {
                        element.classList.add('path-highlighted');

                        if (element.classList.contains('highlighted')) {
                            this.addDoubleStroke(element);
                        }
                    }
                });

                const allLines = document.querySelectorAll('.connection-line, .connection-arrow');
                allLines.forEach(line => {
                    const from = line.getAttribute('data-from');
                    const to = line.getAttribute('data-to');
                    if (from && to) {
                        const connKey = from + '->' + to;
                        if (pathConnections.has(connKey)) {
                            line.classList.add('path-highlighted-line');
                        }
                    }
                });
            },

            clearPathHighlight: function() {
                document.querySelectorAll('.double-stroke-overlay').forEach(element => {
                    element.remove();
                });

                document.querySelectorAll('.path-highlighted').forEach(element => {
                    element.classList.remove('path-highlighted');
                });

                document.querySelectorAll('.path-highlighted-line').forEach(element => {
                    element.classList.remove('path-highlighted-line');
                });

                this.currentHighlightedNodeId = null;
            },

            reapplyPathHighlight: function() {
                if (this.currentHighlightedNodeId) {
                    const nodeId = this.currentHighlightedNodeId;
                    this.currentHighlightedNodeId = null;
                    this.highlightPathToRoot(nodeId);
                }
            }
        };
    `;
}

module.exports = {
    getPathHighlighter
};