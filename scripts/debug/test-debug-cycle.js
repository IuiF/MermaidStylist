// test-cycle-complex-dag.mmdの階層計算をデバッグ

const nodes = [
    {id: "A", label: "A: Root1"},
    {id: "B", label: "B: Root2"},
    {id: "C", label: "C: 親A"},
    {id: "D", label: "D: 親A"},
    {id: "E", label: "E: 親B"},
    {id: "F", label: "F: 親B"},
    {id: "G", label: "G: 親C,D"},
    {id: "H", label: "H: 親D,E"},
    {id: "I", label: "I: 親E"},
    {id: "J", label: "J: 親F,I"},
    {id: "K", label: "K: 親G,H"},
    {id: "L", label: "L: 親H,J"},
    {id: "M", label: "M: 親K,L"}
];

const allConnections = [
    {from: "A", to: "C"},
    {from: "A", to: "D"},
    {from: "B", to: "E"},
    {from: "B", to: "F"},
    {from: "C", to: "G"},
    {from: "D", to: "G"},
    {from: "D", to: "H"},
    {from: "E", to: "H"},
    {from: "E", to: "I"},
    {from: "F", to: "J"},
    {from: "I", to: "J"},
    {from: "G", to: "K"},
    {from: "H", to: "K"},
    {from: "H", to: "L"},
    {from: "J", to: "L"},
    {from: "K", to: "M"},
    {from: "L", to: "M"},
    {from: "M", to: "H"},  // バックエッジ
    {from: "L", to: "D"}   // バックエッジ
];

// バックエッジ（想定）
const backEdges = [
    {from: "H", to: "K"},
    {from: "L", to: "M"},
    {from: "D", to: "G"},
    {from: "D", to: "H"}
];

// バックエッジを除いた通常のエッジ
const regularConnections = allConnections.filter(conn => {
    return !backEdges.some(be => be.from === conn.from && be.to === conn.to);
});

console.log('通常のエッジ数:', regularConnections.length);
console.log('');

// 階層を計算
function calculateLevels(nodes, connections) {
    const childNodes = new Set(connections.map(c => c.to));
    const rootNodes = nodes.filter(node => !childNodes.has(node.id));

    const nodeLevel = new Map();
    const queue = [];

    rootNodes.forEach(rootNode => {
        nodeLevel.set(rootNode.id, 0);
        queue.push(rootNode.id);
    });

    let processed = 0;
    const maxIterations = nodes.length * nodes.length;

    while (queue.length > 0 && processed < maxIterations) {
        const currentId = queue.shift();
        processed++;
        const currentLevel = nodeLevel.get(currentId);
        const children = connections.filter(c => c.from === currentId).map(c => c.to);

        for (const childId of children) {
            const newLevel = currentLevel + 1;
            const existingLevel = nodeLevel.get(childId);

            if (existingLevel === undefined || newLevel > existingLevel) {
                nodeLevel.set(childId, newLevel);
                queue.push(childId);
            }
        }
    }

    return nodeLevel;
}

const levels = calculateLevels(nodes, regularConnections);

console.log('各ノードの階層:');
levels.forEach((level, nodeId) => {
    console.log(`  ${nodeId}: Level ${level}`);
});
console.log('');

// 各バックエッジの点線ノードの階層を計算
function calculateMaxDescendantDepth(nodeId, connections, currentDepth = 0, visited = new Set()) {
    if (visited.has(nodeId)) {
        return currentDepth - 1;
    }
    visited.add(nodeId);

    const children = connections.filter(c => c.from === nodeId).map(c => c.to);
    if (children.length === 0) {
        return currentDepth;
    }

    let maxDepth = currentDepth;
    for (const childId of children) {
        const childDepth = calculateMaxDescendantDepth(childId, connections, currentDepth + 1, visited);
        maxDepth = Math.max(maxDepth, childDepth);
    }
    return maxDepth;
}

console.log('点線ノードの階層:');
backEdges.forEach(backEdge => {
    const maxDepth = calculateMaxDescendantDepth(backEdge.to, regularConnections);
    const dashedNodeLevel = maxDepth + 1;
    console.log(`  ${backEdge.to}_dashed_${backEdge.from}: Level ${dashedNodeLevel} (元ノード${backEdge.to}の子孫の最大深度: ${maxDepth})`);
});
