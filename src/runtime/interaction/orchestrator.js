function getOrchestrator() {
    const collapseHandler = require('./collapse-handler').getCollapseHandler();
    const highlightHandler = require('./highlight-handler').getHighlightHandler();

    return collapseHandler + highlightHandler + `
        const v2Orchestrator = {
            state: {
                nodes: [],
                dashedNodes: [],
                connections: [],
                collapsed: new Set(),
                highlighted: new Set()
            },
            currentLayout: null,

            initialize: function(nodes, dashedNodes, connections, allConnections) {
                console.log('[V2 Orchestrator] Initializing...');
                this.state.nodes = nodes;
                this.state.dashedNodes = dashedNodes;
                this.state.connections = connections;
                this.state.allConnections = allConnections;

                collapseHandler.init(allConnections);

                createAllNodes(nodes, dashedNodes, connections, allConnections);

                this.recalculateAndRender();
            },

            recalculateAndRender: function() {
                console.log('[V2 Orchestrator] Recalculating and rendering...');

                const visibleNodes = this.getVisibleNodes();
                const visibleConnections = this.getVisibleConnections();

                const input = {
                    nodes: visibleNodes,
                    connections: visibleConnections,
                    treeStructure: analyzeTreeStructure(visibleNodes, visibleConnections),
                    nodeWidths: this.getNodeWidths(),
                    dashedNodes: this.getDashedNodeSet()
                };

                this.currentLayout = v2LayoutEngine.calculateLayout(input);

                renderFromLayoutResult(this.currentLayout, visibleConnections);

                this.updateVisibility();
            },

            getVisibleNodes: function() {
                const allNodes = [...this.state.nodes, ...this.state.dashedNodes];
                return collapseHandler.getVisibleNodes(allNodes, this.state.allConnections);
            },

            getVisibleConnections: function() {
                return collapseHandler.getVisibleConnections(this.state.allConnections);
            },

            getNodeWidths: function() {
                const nodeWidths = new Map();
                const allNodes = [...this.state.nodes, ...this.state.dashedNodes];
                allNodes.forEach(node => {
                    const element = document.getElementById(node.id);
                    if (element) {
                        const width = parseInt(element.getAttribute('data-width')) || 0;
                        nodeWidths.set(node.id, width);
                    }
                });
                return nodeWidths;
            },

            getDashedNodeSet: function() {
                const dashedNodes = new Set();
                this.state.dashedNodes.forEach(node => {
                    dashedNodes.add(node.id);
                });
                return dashedNodes;
            },

            handleCollapse: function(nodeId) {
                const changed = collapseHandler.toggle(nodeId);
                if (changed) {
                    this.recalculateAndRender();
                }
            },

            updateVisibility: function() {
                const allNodes = [...this.state.nodes, ...this.state.dashedNodes];

                allNodes.forEach(node => {
                    const element = svgHelpers.getNodeElement(node.id);
                    if (element) {
                        const visible = collapseHandler.isVisible(node.id, this.state.allConnections);
                        if (visible) {
                            element.classList.remove('hidden');
                        } else {
                            element.classList.add('hidden');
                        }
                    }

                    const nodeElement = document.getElementById(node.id);
                    if (nodeElement) {
                        const collapseButton = Array.from(nodeElement.children).find(el =>
                            el.classList && el.classList.contains('collapse-button')
                        );

                        if (collapseHandler.isCollapsed(node.id)) {
                            nodeElement.classList.add('collapsed-node');
                            if (collapseButton) collapseButton.textContent = '▲';
                        } else {
                            nodeElement.classList.remove('collapsed-node');
                            if (collapseButton) collapseButton.textContent = '▼';
                        }
                    }
                });

                this.state.allConnections.forEach(conn => {
                    const fromVisible = collapseHandler.isVisible(conn.from, this.state.allConnections);
                    const toVisible = collapseHandler.isVisible(conn.to, this.state.allConnections);
                    const fromCollapsed = collapseHandler.isCollapsed(conn.from);
                    const visible = fromVisible && toVisible && !fromCollapsed;

                    const edgeElements = document.querySelectorAll('.connection-line[data-from="' + conn.from + '"][data-to="' + conn.to + '"], .connection-arrow[data-from="' + conn.from + '"][data-to="' + conn.to + '"], .connection-label[data-from="' + conn.from + '"][data-to="' + conn.to + '"]');

                    edgeElements.forEach(element => {
                        if (visible) {
                            element.classList.remove('hidden');
                        } else {
                            element.classList.add('hidden');
                        }
                    });
                });
            }
        };

        window.v2Orchestrator = v2Orchestrator;
    `;
}

module.exports = {
    getOrchestrator
};
