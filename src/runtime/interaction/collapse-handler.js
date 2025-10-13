function getCollapseHandler() {
    return `
        const collapseHandler = {
            collapsedNodes: new Set(),
            childrenMap: new Map(),

            init: function(connections) {
                this.childrenMap.clear();
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

            toggle: function(nodeId) {
                if (!this.canCollapse(nodeId)) {
                    return false;
                }

                if (this.collapsedNodes.has(nodeId)) {
                    this.collapsedNodes.delete(nodeId);
                } else {
                    this.collapsedNodes.add(nodeId);
                }

                return true;
            },

            isVisible: function(nodeId, connections) {
                const isRoot = !connections.some(conn => conn.to === nodeId);
                if (isRoot) return true;

                const parentConnections = connections.filter(conn => conn.to === nodeId);
                if (parentConnections.length === 0) return true;

                const hasVisibleParent = parentConnections.some(conn => {
                    if (!this.isCollapsed(conn.from)) {
                        return this.isVisible(conn.from, connections);
                    }
                    return false;
                });

                return hasVisibleParent;
            },

            getVisibleNodes: function(nodes, connections) {
                return nodes.filter(node => this.isVisible(node.id, connections));
            },

            getVisibleConnections: function(connections) {
                return connections.filter(conn => {
                    if (this.isCollapsed(conn.from)) {
                        return false;
                    }
                    if (!this.isVisible(conn.from, connections)) {
                        return false;
                    }
                    if (!this.isVisible(conn.to, connections)) {
                        return false;
                    }
                    return true;
                });
            }
        };
    `;
}

module.exports = {
    getCollapseHandler
};
