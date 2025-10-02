function validateTreeStructure(nodes, connections) {
    const errors = [];
    const backEdges = []; // サイクルを引き起こすエッジ

    // 子ノードマップを構築
    const childrenMap = new Map();
    nodes.forEach(node => childrenMap.set(node.id, []));
    connections.forEach(conn => {
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

    // 全てのエッジについてバックエッジかチェック
    connections.forEach(edge => {
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