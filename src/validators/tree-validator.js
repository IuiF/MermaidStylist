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

    // Kahn's algorithmでバックエッジを検出
    const inDegree = new Map();
    const childrenMap = new Map();

    // 入次数と子ノードマップを初期化
    nodes.forEach(node => {
        inDegree.set(node.id, 0);
        childrenMap.set(node.id, []);
    });

    connections.forEach(conn => {
        inDegree.set(conn.to, (inDegree.get(conn.to) || 0) + 1);
        childrenMap.get(conn.from).push(conn.to);
    });

    // 元の入次数を記録
    const originalInDegree = new Map();
    nodes.forEach(node => {
        originalInDegree.set(node.id, inDegree.get(node.id));
    });

    // 入次数0のノードから開始
    const queue = [];
    const processedNodes = [];

    nodes.forEach(node => {
        if (inDegree.get(node.id) === 0) {
            queue.push(node.id);
        }
    });

    // ルートノードがない場合（全て循環している場合）、任意のノードから開始
    const forcedStart = queue.length === 0 && nodes.length > 0;
    if (forcedStart) {
        const startNode = nodes[0].id;
        inDegree.set(startNode, 0);
        queue.push(startNode);
    }

    // トポロジカルソート
    while (queue.length > 0) {
        const nodeId = queue.shift();
        processedNodes.push(nodeId);

        const children = childrenMap.get(nodeId) || [];
        children.forEach(childId => {
            inDegree.set(childId, inDegree.get(childId) - 1);
            if (inDegree.get(childId) === 0) {
                queue.push(childId);
            }
        });
    }

    // サイクル内ノードを特定
    // forcedStartの場合は、元の入次数が1以上のノードをサイクル内とする
    let cycleNodes;
    if (forcedStart) {
        cycleNodes = nodes.filter(n => originalInDegree.get(n.id) > 0).map(n => n.id);
    } else {
        const processedSet = new Set(processedNodes);
        cycleNodes = nodes.filter(n => !processedSet.has(n.id)).map(n => n.id);
    }

    // デバッグ出力
    if (process.env.DEBUG) {
        console.log('処理済みノード:', processedNodes);
        console.log('サイクル内ノード:', cycleNodes);
    }

    // サイクルがある場合のみバックエッジを検出
    if (cycleNodes.length > 0) {
        if (forcedStart) {
            // 強制開始の場合: 処理順序を使ってバックエッジを検出
            // 後に処理されたノードから前に処理されたノードへのエッジがバックエッジ
            connections.forEach(conn => {
                if (cycleNodes.includes(conn.from) && cycleNodes.includes(conn.to)) {
                    const fromIndex = processedNodes.indexOf(conn.from);
                    const toIndex = processedNodes.indexOf(conn.to);

                    if (fromIndex >= toIndex) {
                        backEdges.push({ from: conn.from, to: conn.to });
                    }
                }
            });
        } else {
            // 通常の場合: BFS距離を使ってバックエッジを検出
            const distance = new Map();
            const bfsQueue = [...processedNodes];
            processedNodes.forEach(nodeId => distance.set(nodeId, 0));

            while (bfsQueue.length > 0) {
                const nodeId = bfsQueue.shift();
                const currentDistance = distance.get(nodeId);

                const children = childrenMap.get(nodeId) || [];
                children.forEach(childId => {
                    if (!distance.has(childId)) {
                        distance.set(childId, currentDistance + 1);
                        bfsQueue.push(childId);
                    }
                });
            }

            // バックエッジを検出
            const sameDistEdges = [];

            connections.forEach(conn => {
                if (cycleNodes.includes(conn.from) && cycleNodes.includes(conn.to)) {
                    const fromDist = distance.get(conn.from) || Infinity;
                    const toDist = distance.get(conn.to) || Infinity;

                    if (fromDist > toDist) {
                        // 距離差があるエッジは確実にバックエッジ
                        backEdges.push({ from: conn.from, to: conn.to });
                    } else if (fromDist === toDist) {
                        // 同距離エッジは後でサイクル確認
                        sameDistEdges.push({ from: conn.from, to: conn.to });
                    }
                }
            });

            // 同距離エッジに対してDFSでサイクル確認
            sameDistEdges.forEach(edge => {
                const visited = new Set();

                function dfs(nodeId, target) {
                    if (nodeId === target) {
                        return true;
                    }
                    if (visited.has(nodeId)) {
                        return false;
                    }

                    visited.add(nodeId);

                    const children = childrenMap.get(nodeId) || [];
                    for (const childId of children) {
                        if (dfs(childId, target)) {
                            return true;
                        }
                    }

                    return false;
                }

                // edge.to から探索して edge.from に戻れるか？
                if (dfs(edge.to, edge.from)) {
                    backEdges.push(edge);
                }
            });
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