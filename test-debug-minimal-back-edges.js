// 最小限のバックエッジを選択

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

console.log('=== 処理済みノードからの距離を計算 ===\n');

// Kahn's algorithm
const inDegree = new Map();
const childrenMap = new Map();
const reductionCount = new Map(); // 入次数が減った回数

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

console.log('処理されたノード:', processedNodes);
console.log('サイクル内ノード:', cycleNodes);
console.log('');

// 各ノードの距離（reduction count）を表示
console.log('各ノードの処理済みノードからの近さ（入次数減少回数）:');
cycleNodes.forEach(nodeId => {
    console.log(`  ${nodeId}: ${reductionCount.get(nodeId)} 回`);
});
console.log('');

// サイクル内のエッジで、深いノードから浅いノードへのエッジを検出
const backEdges = [];
connections.forEach(conn => {
    if (cycleNodes.includes(conn.from) && cycleNodes.includes(conn.to)) {
        const fromDepth = reductionCount.get(conn.from);
        const toDepth = reductionCount.get(conn.to);

        if (fromDepth > toDepth) {
            console.log(`バックエッジ候補: ${conn.from}(${fromDepth}) --> ${conn.to}(${toDepth})`);
            backEdges.push({ from: conn.from, to: conn.to, fromDepth, toDepth });
        }
    }
});

console.log('');
console.log('検出されたバックエッジ:');
backEdges.forEach((edge, index) => {
    console.log(`  ${index + 1}. ${edge.from} --> ${edge.to}`);
});
console.log('');
console.log('期待されるバックエッジ: M --> H, L --> D');
