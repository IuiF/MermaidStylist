function getHighlightHandler() {
    return `
        const highlightHandler = {
            currentHighlightedLabel: null,
            currentHighlightedNodeId: null,
            currentHighlightTimeout: null,
            currentRelationNodeId: null,

            highlightAllByLabel: function(label, nodes) {
                this.clearHighlight(nodes);

                nodes.forEach(node => {
                    if (node.label === label) {
                        const nodeElement = svgHelpers.getNodeElement(node.id);
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

            clearHighlight: function(nodes) {
                if (this.currentHighlightedLabel) {
                    nodes.forEach(node => {
                        if (node.label === this.currentHighlightedLabel) {
                            const nodeElement = svgHelpers.getNodeElement(node.id);
                            if (nodeElement) {
                                nodeElement.classList.remove('highlighted');
                                svgHelpers.removeDoubleStroke(nodeElement);
                            }
                        }
                    });
                    this.currentHighlightedLabel = null;
                }
            },

            highlightOriginalNode: function(originalNodeId, duration = 2000) {
                if (this.currentHighlightTimeout) {
                    clearTimeout(this.currentHighlightTimeout);
                }
                if (this.currentHighlightedNodeId) {
                    const prevNode = svgHelpers.getNodeElement(this.currentHighlightedNodeId);
                    if (prevNode) {
                        prevNode.classList.remove('highlighted');
                        svgHelpers.removeDoubleStroke(prevNode);
                    }
                }

                const nodeElement = svgHelpers.getNodeElement(originalNodeId);
                if (!nodeElement) {
                    return;
                }

                nodeElement.classList.add('highlighted');
                svgHelpers.addDoubleStroke(nodeElement);
                this.currentHighlightedNodeId = originalNodeId;

                this.currentHighlightTimeout = setTimeout(() => {
                    nodeElement.classList.remove('highlighted');
                    svgHelpers.removeDoubleStroke(nodeElement);
                    this.currentHighlightedNodeId = null;
                    this.currentHighlightTimeout = null;
                }, duration);
            },

            highlightRelations: function(nodeId, connections) {
                this.currentRelationNodeId = nodeId;

                const parents = connections.filter(conn => conn.to === nodeId).map(conn => conn.from);
                const children = connections.filter(conn => conn.from === nodeId).map(conn => conn.to);

                const targetNode = svgHelpers.getNodeElement(nodeId);
                if (targetNode) {
                    targetNode.classList.add('relation-highlighted', 'relation-target');
                }

                parents.forEach(parentId => {
                    const parentNode = svgHelpers.getNodeElement(parentId);
                    if (parentNode) {
                        parentNode.classList.add('relation-highlighted', 'relation-parent');
                    }
                });

                children.forEach(childId => {
                    const childNode = svgHelpers.getNodeElement(childId);
                    if (childNode) {
                        childNode.classList.add('relation-highlighted', 'relation-child');
                    }
                });

                connections.forEach(conn => {
                    if (conn.from === nodeId || conn.to === nodeId) {
                        window.edgeHighlighter.bringToFront(conn.from, conn.to);

                        const edgeElements = document.querySelectorAll('.connection-line[data-from="' + conn.from + '"][data-to="' + conn.to + '"], .connection-arrow[data-from="' + conn.from + '"][data-to="' + conn.to + '"]');
                        edgeElements.forEach(edgeElement => {
                            if (edgeElement) {
                                edgeElement.classList.add('relation-edge-highlighted');
                            }
                        });
                    }
                });
            },

            clearRelationHighlight: function() {
                document.querySelectorAll('.relation-highlighted').forEach(node => {
                    node.classList.remove('relation-highlighted', 'relation-target', 'relation-parent', 'relation-child');
                });

                document.querySelectorAll('.relation-edge-highlighted').forEach(edge => {
                    edge.classList.remove('relation-edge-highlighted');
                });

                this.currentRelationNodeId = null;
            },

            reapplyRelationHighlight: function(connections) {
                if (this.currentRelationNodeId) {
                    const nodeId = this.currentRelationNodeId;
                    document.querySelectorAll('.relation-highlighted').forEach(node => {
                        node.classList.remove('relation-highlighted', 'relation-target', 'relation-parent', 'relation-child');
                    });
                    document.querySelectorAll('.relation-edge-highlighted').forEach(edge => {
                        edge.classList.remove('relation-edge-highlighted');
                    });

                    this.highlightRelations(nodeId, connections);
                }
            }
        };
    `;
}

module.exports = {
    getHighlightHandler
};
