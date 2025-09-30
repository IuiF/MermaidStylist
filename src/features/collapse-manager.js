function getCollapseManager() {
    return `
        const collapseManager = {
            collapsedNodes: new Set(),
            childrenMap: new Map(),

            init: function() {
                connections.forEach(conn => {
                    if (!this.childrenMap.has(conn.from)) {
                        this.childrenMap.set(conn.from, []);
                    }
                    this.childrenMap.get(conn.from).push(conn.to);
                });
            },

            isCollapsed: function(nodeId) {
                return this.collapsedNodes.has(nodeId);
            },

            canCollapse: function(nodeId) {
                return this.childrenMap.has(nodeId) && this.childrenMap.get(nodeId).length > 0;
            },

            toggleCollapse: function(nodeId) {
                if (this.canCollapse(nodeId)) {
                    const nodeElement = document.getElementById(nodeId);
                    const collapseButton = nodeElement.querySelector('.collapse-button');

                    if (this.collapsedNodes.has(nodeId)) {
                        this.collapsedNodes.delete(nodeId);
                        nodeElement.classList.remove('collapsed-node');
                        if (collapseButton) collapseButton.textContent = '▼';
                    } else {
                        this.collapsedNodes.add(nodeId);
                        nodeElement.classList.add('collapsed-node');
                        if (collapseButton) collapseButton.textContent = '▲';
                    }

                    this.updateVisibility();

                    // レイアウトを再計算
                    setTimeout(() => {
                        if (currentLayout === 'vertical') {
                            currentNodePositions = verticalLayout(nodes, connections, calculateAllNodeWidths, analyzeTreeStructure);
                        } else {
                            currentNodePositions = horizontalLayout(nodes, connections, calculateAllNodeWidths, analyzeTreeStructure);
                        }
                        createCSSLines(connections, currentNodePositions);
                    }, 50);
                }
            },

            isVisible: function(nodeId) {
                const isRoot = !connections.some(conn => conn.to === nodeId);
                if (isRoot) return true;

                const parentConnection = connections.find(conn => conn.to === nodeId);
                if (!parentConnection) return true;

                if (this.isCollapsed(parentConnection.from)) return false;

                return this.isVisible(parentConnection.from);
            },

            updateVisibility: function() {
                nodes.forEach(node => {
                    const element = document.getElementById(node.id);
                    if (element) {
                        if (this.isVisible(node.id)) {
                            element.classList.remove('hidden');
                        } else {
                            element.classList.add('hidden');
                        }
                    }
                });
            },

            collapseAll: function() {
                nodes.forEach(node => {
                    if (this.canCollapse(node.id) && !this.isCollapsed(node.id)) {
                        const nodeElement = document.getElementById(node.id);
                        const collapseButton = nodeElement.querySelector('.collapse-button');

                        this.collapsedNodes.add(node.id);
                        nodeElement.classList.add('collapsed-node');
                        if (collapseButton) collapseButton.textContent = '▲';
                    }
                });

                this.updateVisibility();

                setTimeout(() => {
                    if (currentLayout === 'vertical') {
                        currentNodePositions = verticalLayout(nodes, connections, calculateAllNodeWidths, analyzeTreeStructure);
                    } else {
                        currentNodePositions = horizontalLayout(nodes, connections, calculateAllNodeWidths, analyzeTreeStructure);
                    }
                    createCSSLines(connections, currentNodePositions);
                }, 50);
            },

            expandAll: function() {
                nodes.forEach(node => {
                    if (this.isCollapsed(node.id)) {
                        const nodeElement = document.getElementById(node.id);
                        const collapseButton = nodeElement.querySelector('.collapse-button');

                        this.collapsedNodes.delete(node.id);
                        nodeElement.classList.remove('collapsed-node');
                        if (collapseButton) collapseButton.textContent = '▼';
                    }
                });

                this.updateVisibility();

                setTimeout(() => {
                    if (currentLayout === 'vertical') {
                        currentNodePositions = verticalLayout(nodes, connections, calculateAllNodeWidths, analyzeTreeStructure);
                    } else {
                        currentNodePositions = horizontalLayout(nodes, connections, calculateAllNodeWidths, analyzeTreeStructure);
                    }
                    createCSSLines(connections, currentNodePositions);
                }, 50);
            }
        };

        function toggleNodeCollapse(nodeId) {
            collapseManager.toggleCollapse(nodeId);
        }

        function collapseAll() {
            collapseManager.collapseAll();
        }

        function expandAll() {
            collapseManager.expandAll();
        }
    `;
}

module.exports = {
    getCollapseManager
};