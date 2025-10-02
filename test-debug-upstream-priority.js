// toノードの上流度を考慮したバックエッジ選択

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

// Kahn's algorithm with reduction count
const inDegree = new Map();
const childrenMap = new Map();
const reductionCount = new Map();

nodes.forEach(node => {
    inDegree.set(node.id, 0);
    childrenMap.set(node.id, []);
    reductionCount.set(node.id, 0);
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
        reductionCount.set(childId, reductionCount.get(childId) + 1);

        if (inDegree.get(childId) === 0) {
            queue.push(childId);
        }
    });
}

const processedSet = new Set(processedNodes);
const cycleNodes = nodes.filter(n => !processedSet.has(n.id)).map(n => n.id);

console.log('サイクル内ノード:', cycleNodes);
console.log('');

// BFS距離
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

console.log('各ノードの入次数減少回数（上流度）:');
cycleNodes.forEach(nodeId => {
    console.log(`  ${nodeId}: ${reductionCount.get(nodeId)} 回 (距離: ${distance.get(nodeId)})`);
});
console.log('');

// バックエッジ候補をソート
const backEdgeCandidates = [];

connections.forEach(conn => {
    if (cycleNodes.includes(conn.from) && cycleNodes.includes(conn.to)) {
        const fromDist = distance.get(conn.from) || Infinity;
        const toDist = distance.get(conn.to) || Infinity;
        const diff = fromDist - toDist;
        const toReduction = reductionCount.get(conn.to) || 0;

        backEdgeCandidates.push({
            from: conn.from,
            to: conn.to,
            fromDist,
            toDist,
            diff,
            toReduction
        });
    }
});

// ソート: 1) 距離差降順, 2) toの上流度（減少回数）降順
backEdgeCandidates.sort((a, b) => {
    if (a.diff !== b.diff) return b.diff - a.diff;
    return b.toReduction - a.toReduction;
});

console.log('バックエッジ候補（優先順）:');
backEdgeCandidates.forEach(edge => {
    console.log(`  ${edge.from}(距離${edge.fromDist}) --> ${edge.to}(距離${edge.toDist}, 上流度${edge.toReduction}) [距離差: ${edge.diff}]`);
});
console.log('');

// 上位2つを選択
const selectedBackEdges = backEdgeCandidates.slice(0, 2);
console.log('選択されたバックエッジ（上位2つ）:');
selectedBackEdges.forEach((edge, index) => {
    console.log(`  ${index + 1}. ${edge.from} --> ${edge.to}`);
});
console.log('');
console.log('期待されるバックエッジ: M --> H, L --> D');
