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

    // サイクル検出（BFSでレベルを割り当て、上位レベルへの接続を検出）
    const childrenMap = new Map();
    connections.forEach(conn => {
        if (!childrenMap.has(conn.from)) {
            childrenMap.set(conn.from, []);
        }
        childrenMap.get(conn.from).push(conn.to);
    });

    // BFSで各ノードにレベルを割り当て
    const nodeLevel = new Map();
    const queue = [];

    // ルートノードをレベル0として開始
    rootNodes.forEach(rootId => {
        nodeLevel.set(rootId, 0);
        queue.push(rootId);
    });

    // BFSでレベルを割り当て
    while (queue.length > 0) {
        const currentId = queue.shift();
        const currentLevel = nodeLevel.get(currentId);
        const children = childrenMap.get(currentId) || [];

        for (const childId of children) {
            if (!nodeLevel.has(childId)) {
                nodeLevel.set(childId, currentLevel + 1);
                queue.push(childId);
            }
        }
    }

    // すべての接続をチェックして、上位レベルに戻る接続がないか確認
    for (const conn of connections) {
        const fromLevel = nodeLevel.get(conn.from);
        const toLevel = nodeLevel.get(conn.to);

        // fromとtoの両方がレベル割り当て済みの場合のみチェック
        if (fromLevel !== undefined && toLevel !== undefined) {
            // toのレベルがfrom以下（同じか上位）の場合、サイクル
            if (toLevel <= fromLevel) {
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