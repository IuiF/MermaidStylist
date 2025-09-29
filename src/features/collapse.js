// Node collapse functionality
class NodeCollapseManager {
    constructor(nodes, connections) {
        this.nodes = nodes;
        this.connections = connections;
        this.collapsedNodes = new Set();
        this.childrenMap = new Map();

        // 親子関係マップを構築
        connections.forEach(conn => {
            if (!this.childrenMap.has(conn.from)) {
                this.childrenMap.set(conn.from, []);
            }
            this.childrenMap.get(conn.from).push(conn.to);
        });
    }

    isCollapsed(nodeId) {
        return this.collapsedNodes.has(nodeId);
    }

    canCollapse(nodeId) {
        return this.childrenMap.has(nodeId) && this.childrenMap.get(nodeId).length > 0;
    }

    toggleCollapse(nodeId) {
        if (this.canCollapse(nodeId)) {
            if (this.collapsedNodes.has(nodeId)) {
                this.collapsedNodes.delete(nodeId);
            } else {
                this.collapsedNodes.add(nodeId);
            }
        }
    }

    isVisible(nodeId) {
        // ルートノードは常に表示
        const isRoot = !this.connections.some(conn => conn.to === nodeId);
        if (isRoot) return true;

        // 親ノードを探す
        const parentConnection = this.connections.find(conn => conn.to === nodeId);
        if (!parentConnection) return true;

        // 親が折りたたまれていたら非表示
        if (this.isCollapsed(parentConnection.from)) return false;

        // 親の可視性を再帰的にチェック
        return this.isVisible(parentConnection.from);
    }
}

function addCollapseButtons(nodeId, hasChildren) {
    if (!hasChildren) return '';
    return '<span class="collapse-button">▼</span>';
}

module.exports = {
    NodeCollapseManager,
    addCollapseButtons
};