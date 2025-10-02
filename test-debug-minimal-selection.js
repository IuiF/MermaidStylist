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

// Kahn's algorithmでサイクル検出とBFS距離計算
function analyzeGraph(edgesToRemove = []) {
    const inDegree = new Map();
    const childrenMap = new Map();

    nodes.forEach(node => {
        inDegree.set(node.id, 0);
        childrenMap.set(node.id, []);
    });

    const edgeSet = new Set(edgesToRemove.map(e => `${e.from}->${e.to}`));
    const filteredConnections = connections.filter(conn =>
        !edgeSet.has(`${conn.from}->${conn.to}`)
    );

    filteredConnections.forEach(conn => {
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

    const isDAG = processedNodes.length === nodes.length;
    const cycleNodes = nodes.filter(n => !processedNodes.includes(n.id)).map(n => n.id);

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

    return { isDAG, cycleNodes, distance, childrenMap, filteredConnections };
}

console.log('=== 初期分析 ===\n');
const initial = analyzeGraph();
console.log('サイクル内ノード:', initial.cycleNodes);
console.log('DAG:', initial.isDAG);
console.log('');

// バックエッジ候補を収集
const backEdgeCandidates = [];

connections.forEach(conn => {
    if (initial.cycleNodes.includes(conn.from) && initial.cycleNodes.includes(conn.to)) {
        const fromDist = initial.distance.get(conn.from) || Infinity;
        const toDist = initial.distance.get(conn.to) || Infinity;
        const diff = fromDist - toDist;

        backEdgeCandidates.push({
            from: conn.from,
            to: conn.to,
            fromDist,
            toDist,
            diff
        });
    }
});

// 距離差でソート（降順）
backEdgeCandidates.sort((a, b) => b.diff - a.diff);

console.log('バックエッジ候補（距離差順）:');
backEdgeCandidates.forEach(edge => {
    console.log(`  ${edge.from}(${edge.fromDist}) --> ${edge.to}(${edge.toDist}) [差: ${edge.diff}]`);
});
console.log('');

// グリーディに選択
console.log('=== グリーディ選択 ===\n');
const selectedBackEdges = [];

for (const candidate of backEdgeCandidates) {
    // この候補を追加
    selectedBackEdges.push(candidate);
    console.log(`選択: ${candidate.from} --> ${candidate.to}`);

    // DAGになるかチェック
    const result = analyzeGraph(selectedBackEdges);
    console.log(`  → DAG: ${result.isDAG}, 残りサイクルノード: ${result.cycleNodes.length}個`);

    if (result.isDAG) {
        console.log('  → DAG達成！');
        break;
    }
}

console.log('');
console.log('選択されたバックエッジ:');
selectedBackEdges.forEach((edge, index) => {
    console.log(`  ${index + 1}. ${edge.from} --> ${edge.to}`);
});
console.log('');
console.log('期待されるバックエッジ: M --> H, L --> D');
