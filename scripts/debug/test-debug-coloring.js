// DFS with coloring でバックエッジを検出

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

// 子ノードマップを構築
const childrenMap = new Map();
nodes.forEach(node => childrenMap.set(node.id, []));
connections.forEach(conn => {
    childrenMap.get(conn.from).push(conn.to);
});

// White: 0, Gray: 1, Black: 2
const color = new Map();
nodes.forEach(node => color.set(node.id, 0));

const backEdges = [];

function dfs(nodeId, depth = 0) {
    const indent = '  '.repeat(depth);
    console.log(`${indent}訪問開始: ${nodeId} (WHITE → GRAY)`);

    color.set(nodeId, 1); // Gray

    const children = childrenMap.get(nodeId) || [];
    for (const childId of children) {
        const childColor = color.get(childId);

        if (childColor === 1) {
            // Gray → Gray = バックエッジ
            console.log(`${indent}  → バックエッジ検出: ${nodeId} --> ${childId} (GRAY → GRAY)`);
            backEdges.push({ from: nodeId, to: childId });
        } else if (childColor === 0) {
            // White → 再帰
            console.log(`${indent}  → 再帰: ${childId}`);
            dfs(childId, depth + 1);
        } else {
            // Black → スキップ
            console.log(`${indent}  → スキップ: ${childId} (BLACK)`);
        }
    }

    color.set(nodeId, 2); // Black
    console.log(`${indent}訪問終了: ${nodeId} (GRAY → BLACK)`);
}

// ルートノード（入次数0）を見つける
const inDegree = new Map();
nodes.forEach(node => inDegree.set(node.id, 0));
connections.forEach(conn => {
    inDegree.set(conn.to, (inDegree.get(conn.to) || 0) + 1);
});

const roots = [];
nodes.forEach(node => {
    if (inDegree.get(node.id) === 0) {
        roots.push(node.id);
    }
});

console.log('ルートノード:', roots);
console.log('');

// 各ルートからDFS
roots.forEach(rootId => {
    if (color.get(rootId) === 0) {
        console.log(`=== ${rootId}から探索開始 ===`);
        dfs(rootId);
        console.log('');
    }
});

// 未訪問ノードがあれば、そこからも開始（孤立したサイクル対応）
nodes.forEach(node => {
    if (color.get(node.id) === 0) {
        console.log(`=== ${node.id}から探索開始（未訪問） ===`);
        dfs(node.id);
        console.log('');
    }
});

console.log('検出されたバックエッジ:');
backEdges.forEach((edge, index) => {
    console.log(`  ${index + 1}. ${edge.from} --> ${edge.to}`);
});
console.log('');
console.log('期待されるバックエッジ: M --> H, L --> D');
