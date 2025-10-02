// 子孫数を考慮したバックエッジ選択

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

console.log('サイクル内ノード:', cycleNodes);
console.log('');

// BFS距離を計算
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

// 各ノードのサイクル内子孫数を計算
function countCycleDescendants(nodeId, visited = new Set()) {
    if (visited.has(nodeId)) return 0;
    visited.add(nodeId);

    let count = 0;
    const children = childrenMap.get(nodeId) || [];
    for (const childId of children) {
        if (cycleNodes.includes(childId)) {
            count++;
            count += countCycleDescendants(childId, visited);
        }
    }
    return count;
}

const descendantCount = new Map();
cycleNodes.forEach(nodeId => {
    descendantCount.set(nodeId, countCycleDescendants(nodeId));
});

console.log('各ノードのサイクル内子孫数:');
cycleNodes.forEach(nodeId => {
    console.log(`  ${nodeId}: ${descendantCount.get(nodeId)} (距離: ${distance.get(nodeId)})`);
});
console.log('');

// バックエッジ候補を収集し、ソート
const backEdgeCandidates = [];

connections.forEach(conn => {
    if (cycleNodes.includes(conn.from) && cycleNodes.includes(conn.to)) {
        const fromDist = distance.get(conn.from) || Infinity;
        const toDist = distance.get(conn.to) || Infinity;
        const diff = fromDist - toDist;
        const fromDescendants = descendantCount.get(conn.from) || 0;

        backEdgeCandidates.push({
            from: conn.from,
            to: conn.to,
            fromDist,
            toDist,
            diff,
            fromDescendants
        });
    }
});

// ソート: 1) 距離差降順, 2) from子孫数降順
backEdgeCandidates.sort((a, b) => {
    if (a.diff !== b.diff) return b.diff - a.diff;
    return b.fromDescendants - a.fromDescendants;
});

console.log('バックエッジ候補（優先順）:');
backEdgeCandidates.forEach(edge => {
    console.log(`  ${edge.from}(距離${edge.fromDist}, 子孫${edge.fromDescendants}) --> ${edge.to}(距離${edge.toDist}) [差: ${edge.diff}]`);
});
console.log('');
console.log('期待されるバックエッジ: M --> H, L --> D');
