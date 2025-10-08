function validateTreeStructure(nodes, connections) {
    const errors = [];
    const backEdges = []; // サイクルを引き起こすエッジ

    // Mermaidの点線エッジは自動的にバックエッジとして扱う
    const dashedEdges = connections.filter(conn => conn.isDashed);
    backEdges.push(...dashedEdges.map(({ from, to }) => ({ from, to })));

    // 点線エッジを除外した通常のエッジのみでマップを構築
    const regularConnections = connections.filter(conn => !conn.isDashed);

    // 子ノードマップを構築（通常のエッジのみ）
    const childrenMap = new Map();
    nodes.forEach(node => childrenMap.set(node.id, []));
    regularConnections.forEach(conn => {
        if (childrenMap.has(conn.from)) {
            childrenMap.get(conn.from).push(conn.to);
        }
    });

    // 各エッジについて、そのエッジを除外して to から from に到達可能かチェック
    // 到達可能なら、そのエッジはバックエッジ（サイクルを形成）
    function canReach(from, to, excludeEdge) {
        const visited = new Set();
        const queue = [from];

        while (queue.length > 0) {
            const current = queue.shift();
            if (current === to) {
                return true;
            }
            if (visited.has(current)) {
                continue;
            }
            visited.add(current);

            const children = childrenMap.get(current) || [];
            for (const childId of children) {
                // excludeEdgeを除外
                if (current === excludeEdge.from && childId === excludeEdge.to) {
                    continue;
                }
                queue.push(childId);
            }
        }

        return false;
    }

    // 通常のエッジについてのみバックエッジかチェック（点線エッジは既に除外済み）
    regularConnections.forEach(edge => {
        // edge.to から edge.from に（このエッジを除いて）到達できるか？
        if (canReach(edge.to, edge.from, edge)) {
            backEdges.push({ from: edge.from, to: edge.to });
        }
    });

    return {
        isValid: true, // バックエッジがあっても描画可能
        errors: errors,
        backEdges: backEdges
    };
}

module.exports = {
    validateTreeStructure
};