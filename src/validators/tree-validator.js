function validateTreeStructure(nodes, connections) {
    const errors = [];
    const backEdges = []; // サイクルを引き起こすエッジ

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

    // ルートノードが存在しない場合は、任意のノードから開始してサイクルを検出
    let startNodes = rootNodes;
    if (rootNodes.length === 0 && nodes.length > 0) {
        startNodes = [nodes[0].id]; // 最初のノードを開始点とする
    }

    // サイクル検出（DFSベースでバックエッジを識別）
    const visited = new Set();
    const recursionStack = new Set();
    const childrenMap = new Map();

    connections.forEach(conn => {
        if (!childrenMap.has(conn.from)) {
            childrenMap.set(conn.from, []);
        }
        childrenMap.get(conn.from).push(conn.to);
    });

    function detectBackEdges(nodeId) {
        if (recursionStack.has(nodeId)) {
            return; // 既に現在のパスで訪問中
        }
        if (visited.has(nodeId)) {
            return; // 既に完全に訪問済み
        }

        visited.add(nodeId);
        recursionStack.add(nodeId);

        const children = childrenMap.get(nodeId) || [];
        for (const childId of children) {
            if (recursionStack.has(childId)) {
                // バックエッジを検出
                backEdges.push({ from: nodeId, to: childId });
            } else {
                detectBackEdges(childId);
            }
        }

        recursionStack.delete(nodeId);
    }

    // すべてのノードからバックエッジをチェック
    for (const node of nodes) {
        if (!visited.has(node.id)) {
            detectBackEdges(node.id);
        }
    }

    return {
        isValid: true, // バックエッジがあっても描画可能
        errors: errors,
        backEdges: backEdges
    };
}

module.exports = {
    validateTreeStructure
};