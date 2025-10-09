function getPathHighlighter() {
    return `
        const pathHighlighter = {
            currentHighlightedNodeId: null,

            highlightPathToRoot: function(nodeId) {
                this.clearPathHighlight();
                this.currentHighlightedNodeId = nodeId;

                const parentMap = new Map();
                allConnections.forEach(conn => {
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
                        pathConnections.add(connectionUtils.createEdgeKey(parentId, currentId));

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
                            svgHelpers.addDoubleStroke(element);
                        }
                    }
                });

                // エッジ要素を収集してハイライト適用
                const allEdgeElements = document.querySelectorAll('.connection-line, .connection-arrow');
                const edgeElementsByConnection = new Map();

                allEdgeElements.forEach(element => {
                    const from = element.getAttribute('data-from');
                    const to = element.getAttribute('data-to');
                    if (from && to) {
                        const connKey = connectionUtils.createEdgeKey(from, to);
                        if (!edgeElementsByConnection.has(connKey)) {
                            edgeElementsByConnection.set(connKey, []);
                        }
                        edgeElementsByConnection.get(connKey).push(element);
                    }
                });

                // エッジを最前面に移動（edge-highlighter機能を使用）
                const connectionsArray = Array.from(pathConnections).map(connKey => {
                    const [from, to] = connKey.split('->');
                    return { from, to };
                });
                window.edgeHighlighter.bringMultipleToFront(connectionsArray);

                // CSSクラスを追加
                pathConnections.forEach(connKey => {
                    const elements = edgeElementsByConnection.get(connKey);
                    if (elements) {
                        elements.forEach(element => {
                            element.classList.add('path-highlighted-line');
                        });
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