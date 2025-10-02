// DFSの動作をデバッグ

const connections = [
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
    {from: "M", to: "H"},  // 循環エッジ1
    {from: "L", to: "D"}   // 循環エッジ2
];

const childrenMap = new Map();
connections.forEach(conn => {
    if (!childrenMap.has(conn.from)) {
        childrenMap.set(conn.from, []);
    }
    childrenMap.get(conn.from).push(conn.to);
});

const visited = new Set();
const backEdges = [];

function detectBackEdges(nodeId, path = [], depth = 0) {
    const indent = '  '.repeat(depth);
    console.log(`${indent}訪問: ${nodeId}, パス: [${path.join(', ')}]`);

    // 現在のパスに追加
    path.push(nodeId);
    visited.add(nodeId);

    const children = childrenMap.get(nodeId) || [];
    for (const childId of children) {
        // 子ノードが現在のパスに含まれている場合、バックエッジ
        if (path.includes(childId)) {
            console.log(`${indent}  → バックエッジ検出: ${nodeId} --> ${childId}`);
            backEdges.push({ from: nodeId, to: childId });
        } else if (!visited.has(childId)) {
            // 未訪問の場合は再帰的に探索
            detectBackEdges(childId, [...path], depth + 1);
        } else {
            console.log(`${indent}  → スキップ（既訪問）: ${childId}`);
        }
    }
}

// ルートから開始
const nodes = ["A", "B"];
nodes.forEach(nodeId => {
    if (!visited.has(nodeId)) {
        console.log(`\n=== ${nodeId}から探索開始 ===`);
        detectBackEdges(nodeId);
    }
});

console.log('\n検出されたバックエッジ:');
backEdges.forEach((edge, index) => {
    console.log(`  ${index + 1}. ${edge.from} --> ${edge.to}`);
});
