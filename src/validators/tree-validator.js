function validateTreeStructure(nodes, connections) {
    const errors = [];

    // 各ノードの親をカウント
    const parentCount = new Map();
    nodes.forEach(node => parentCount.set(node.id, 0));

    connections.forEach(conn => {
        if (parentCount.has(conn.to)) {
            parentCount.set(conn.to, parentCount.get(conn.to) + 1);
        }
    });

    // ルートノード（親を持たないノード）の確認
    const rootNodes = [];
    parentCount.forEach((count, nodeId) => {
        if (count === 0) {
            rootNodes.push(nodeId);
        }
    });

    if (rootNodes.length === 0) {
        errors.push('ルートノードが存在しません。すべてのノードが親を持っているため、サイクルの可能性があります。');
    }

    // サイクル検出（DFSベースのトポロジカルソート）
    const visited = new Set();
    const recursionStack = new Set();
    const childrenMap = new Map();

    connections.forEach(conn => {
        if (!childrenMap.has(conn.from)) {
            childrenMap.set(conn.from, []);
        }
        childrenMap.get(conn.from).push(conn.to);
    });

    function hasCycle(nodeId) {
        if (recursionStack.has(nodeId)) {
            return true; // サイクル検出
        }
        if (visited.has(nodeId)) {
            return false; // 既に訪問済み
        }

        visited.add(nodeId);
        recursionStack.add(nodeId);

        const children = childrenMap.get(nodeId) || [];
        for (const childId of children) {
            if (hasCycle(childId)) {
                return true;
            }
        }

        recursionStack.delete(nodeId);
        return false;
    }

    // すべてのノードからサイクルをチェック
    for (const node of nodes) {
        if (!visited.has(node.id)) {
            if (hasCycle(node.id)) {
                errors.push('グラフにサイクル（循環参照）が検出されました。');
                break;
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

module.exports = {
    validateTreeStructure
};