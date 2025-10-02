function getCollapseManager() {
    return `
        const collapseManager = {
            collapsedNodes: new Set(),
            childrenMap: new Map(),

            init: function() {
                allConnections.forEach(conn => {
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

            setNodeState: function(nodeId, collapsed) {
                const nodeElement = svgHelpers.getNodeElement(nodeId);
                const collapseButton = Array.from(nodeElement.children).find(el =>
                    el.classList && el.classList.contains('collapse-button')
                );

                if (collapsed) {
                    this.collapsedNodes.add(nodeId);
                    nodeElement.classList.add('collapsed-node');
                    shadowManager.add(nodeElement);
                    if (collapseButton) collapseButton.textContent = '▲';
                } else {
                    this.collapsedNodes.delete(nodeId);
                    nodeElement.classList.remove('collapsed-node');
                    shadowManager.remove(nodeElement);
                    if (collapseButton) collapseButton.textContent = '▼';
                }
            },

            recalculateLayout: function() {
                requestAnimationFrame(() => {
                    if (currentLayout === 'vertical') {
                        currentNodePositions = verticalLayout(allNodes, allConnections, calculateAllNodeWidths,
                            (n, c) => analyzeTreeStructure(n, c, dashedNodes));
                    } else {
                        currentNodePositions = horizontalLayout(allNodes, allConnections, calculateAllNodeWidths,
                            (n, c) => analyzeTreeStructure(n, c, dashedNodes));
                    }
                    createCSSLines(allConnections, currentNodePositions);
                    shadowManager.updatePositions(this.collapsedNodes);
                    pathHighlighter.reapplyPathHighlight();

                    // 座標を更新
                    requestAnimationFrame(() => {
                        viewportManager.updateContentBounds();
                    });
                });
            },

            toggleCollapse: function(nodeId) {
                if (this.canCollapse(nodeId)) {
                    this.setNodeState(nodeId, !this.isCollapsed(nodeId));
                    this.updateVisibility();
                    this.recalculateLayout();
                }
            },

            isVisible: function(nodeId) {
                const isRoot = !allConnections.some(conn => conn.to === nodeId);
                if (isRoot) return true;

                const parentConnection = allConnections.find(conn => conn.to === nodeId);
                if (!parentConnection) return true;

                if (this.isCollapsed(parentConnection.from)) return false;

                return this.isVisible(parentConnection.from);
            },

            updateVisibility: function() {
                const svgLayer = svgHelpers.getSVGLayer();
                allNodes.forEach(node => {
                    const element = svgHelpers.getNodeElement(node.id);
                    if (element) {
                        const visible = this.isVisible(node.id);
                        if (window.DEBUG_CONNECTIONS && node.isDashed) {
                            console.log('Visibility check for dashed node ' + node.id + ': ' + visible);
                        }
                        if (visible) {
                            element.classList.remove('hidden');
                        } else {
                            element.classList.add('hidden');
                        }
                    }

                    if (svgLayer) {
                        const shadowElement = svgLayer.querySelector(\`[data-shadow-for="\${node.id}"]\`);
                        if (shadowElement) {
                            if (this.isVisible(node.id)) {
                                shadowElement.classList.remove('hidden');
                            } else {
                                shadowElement.classList.add('hidden');
                            }
                        }
                    }
                });
            },

            applyToNodes: function(filterFn, collapsed) {
                let changed = false;
                allNodes.forEach(node => {
                    if (filterFn(node) && this.canCollapse(node.id) &&
                        this.isCollapsed(node.id) !== collapsed) {
                        this.setNodeState(node.id, collapsed);
                        changed = true;
                    }
                });

                if (changed) {
                    this.updateVisibility();
                    this.recalculateLayout();
                }
            },

            collapseAll: function() {
                this.applyToNodes(() => true, true);
            },

            expandAll: function() {
                this.applyToNodes(() => true, false);
            },

            collapseAllByLabel: function(label) {
                this.applyToNodes(node => node.label === label, true);
            },

            expandAllByLabel: function(label) {
                this.applyToNodes(node => node.label === label, false);
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