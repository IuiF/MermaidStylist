// 2段階アプローチ: Kahn's algorithm + DFS

const nodes = [
    {id: "A"}, {id: "B"}, {id: "C"}, {id: "D"}, {id: "E"}, {id: "F"},
    {id: "G"}, {id: "H"}, {id: "I"}, {id: "J"}, {id: "K"}, {id: "L"}, {id: "M"}
];

const connections = [
    {from: "A", to: "C"}, {from: "A", to: "D"},
    {from: "B", to: "E"}, {from: "B", to: "F"},
    {from: "C", to: "G"}, {from: "D", to: "G"}, {from: "D", to: "H"},
    {from: "E", to: "H"}, {from: "E", to: "I"},
    {from: "F", to: "J"}, {from: "I", to: "J"},
    {from: "G", to: "K"}, {from: "H", to: "K"}, {from: "H", to: "L"},
    {from: "J", to: "L"}, {from: "K", to: "M"}, {from: "L", to: "M"},
    {from: "M", to: "H"}, {from: "L", to: "D"}
];

console.log('=== フェーズ1: Kahn\'s algorithmでサイクル内ノードを特定 ===\n');

// Kahn's algorithm
const inDegree = new Map();
const childrenMap = new Map();

nodes.forEach(node => {
    inDegree.set(node.id, 0);
    childrenMap.set(node.id, []);
});

connections.forEach(conn => {
    inDegree.set(conn.to, (inDegree.get(conn.to) || 0) + 1);
    childrenMap.get(conn.from).push(conn.to);
});

const queue = [];
nodes.forEach(node => {
    if (inDegree.get(node.id) === 0) {
        queue.push(node.id);
    }
});

const processedNodes = [];
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

const processedSet = new Set(processedNodes);
const cycleNodes = nodes.filter(n => !processedSet.has(n.id)).map(n => n.id);

console.log('処理されたノード:', processedNodes);
console.log('サイクル内ノード:', cycleNodes);
console.log('');

console.log('=== フェーズ2: サイクル内でDFSを実行してバックエッジを検出 ===\n');

// サイクル内ノード用の子ノードマップ
const cycleChildrenMap = new Map();
cycleNodes.forEach(nodeId => cycleChildrenMap.set(nodeId, []));

// サイクル内のエッジだけを追加
connections.forEach(conn => {
    if (cycleNodes.includes(conn.from)) {
        // fromがサイクル内の場合、全てのエッジを追加（処理済みノードへのエッジも含む）
        if (!cycleChildrenMap.has(conn.from)) {
            cycleChildrenMap.set(conn.from, []);
        }
        cycleChildrenMap.get(conn.from).push(conn.to);
    }
});

// 各ノードを開始点として独立したDFSを実行
const backEdgesSet = new Set();

function dfs(startNode, nodeId, visited = new Set(), path = []) {
    visited.add(nodeId);
    path.push(nodeId);

    const children = cycleChildrenMap.get(nodeId) || [];
    for (const childId of children) {
        if (path.includes(childId)) {
            // 現在のパスに含まれている = バックエッジ
            const edge = `${nodeId}-->${childId}`;
            if (!backEdgesSet.has(edge)) {
                console.log(`バックエッジ検出（${startNode}から）: ${nodeId} --> ${childId}`);
                backEdgesSet.add(edge);
            }
        } else if (!visited.has(childId)) {
            // 未訪問なら再帰
            dfs(startNode, childId, visited, [...path]);
        }
    }
}

// 各サイクル内ノードを開始点として独立したDFSを実行
cycleNodes.forEach(startNode => {
    console.log(`\n${startNode}を開始点としてDFS:`);
    dfs(startNode, startNode);
});

// Set から配列に変換
const backEdges = Array.from(backEdgesSet).map(edge => {
    const [from, to] = edge.split('-->');
    return { from, to };
});

console.log('');
console.log('検出されたバックエッジ:');
backEdges.forEach((edge, index) => {
    console.log(`  ${index + 1}. ${edge.from} --> ${edge.to}`);
});
console.log('');
console.log('期待されるバックエッジ: M --> H, L --> D');
