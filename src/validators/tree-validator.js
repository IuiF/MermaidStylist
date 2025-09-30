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

    // 複数の親を持つノードをチェック
    const multipleParentNodes = [];
    parentCount.forEach((count, nodeId) => {
        if (count > 1) {
            const node = nodes.find(n => n.id === nodeId);
            multipleParentNodes.push(node ? node.label : nodeId);
        }
    });

    if (multipleParentNodes.length > 0) {
        errors.push(`以下のノードが複数の親を持っているため、木構造ではありません: ${multipleParentNodes.join(', ')}`);
    }

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

    // サイクル検出
    const childrenMap = new Map();
    connections.forEach(conn => {
        if (!childrenMap.has(conn.from)) {
            childrenMap.set(conn.from, []);
        }
        childrenMap.get(conn.from).push(conn.to);
    });

    const visited = new Set();
    const recursionStack = new Set();

    function hasCycle(nodeId) {
        visited.add(nodeId);
        recursionStack.add(nodeId);

        const children = childrenMap.get(nodeId) || [];
        for (const childId of children) {
            if (!visited.has(childId)) {
                if (hasCycle(childId)) {
                    return true;
                }
            } else if (recursionStack.has(childId)) {
                return true;
            }
        }

        recursionStack.delete(nodeId);
        return false;
    }

    for (const rootId of rootNodes) {
        if (!visited.has(rootId)) {
            if (hasCycle(rootId)) {
                errors.push('グラフにサイクル（循環参照）が検出されました。木構造ではありません。');
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