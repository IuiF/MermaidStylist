// 処理済みノードからのBFS距離でバックエッジを検出

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

console.log('=== Kahn\'s algorithmでサイクル内ノードを特定 ===\n');

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

console.log('=== 処理済みノードからサイクル内ノードへのBFS距離を計算 ===\n');

// 処理済みノードから全ノードへのBFS距離
const distance = new Map();
const bfsQueue = [];

// 処理済みノードを距離0で初期化
processedNodes.forEach(nodeId => {
    distance.set(nodeId, 0);
    bfsQueue.push(nodeId);
});

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

// 距離を表示
console.log('各ノードの処理済みノードからの距離:');
cycleNodes.forEach(nodeId => {
    console.log(`  ${nodeId}: ${distance.get(nodeId) || 'undefined'}`);
});
console.log('');

// 距離ベースでバックエッジ候補を検出
const backEdges = [];
const sameDistEdges = [];

connections.forEach(conn => {
    if (cycleNodes.includes(conn.from) && cycleNodes.includes(conn.to)) {
        const fromDist = distance.get(conn.from) || Infinity;
        const toDist = distance.get(conn.to) || Infinity;

        if (fromDist > toDist) {
            console.log(`バックエッジ: ${conn.from}(距離${fromDist}) --> ${conn.to}(距離${toDist})`);
            backEdges.push({ from: conn.from, to: conn.to, fromDist, toDist });
        } else if (fromDist === toDist) {
            console.log(`同距離エッジ（要DFS確認）: ${conn.from}(距離${fromDist}) --> ${conn.to}(距離${toDist})`);
            sameDistEdges.push({ from: conn.from, to: conn.to });
        } else {
            console.log(`前方エッジ: ${conn.from}(距離${fromDist}) --> ${conn.to}(距離${toDist})`);
        }
    }
});

console.log('');
console.log('=== 同距離エッジに対してDFSでサイクル確認 ===\n');

// 同距離エッジに対してDFSでサイクルを確認
sameDistEdges.forEach(edge => {
    const visited = new Set();

    function dfs(nodeId, target) {
        if (nodeId === target) {
            // 目標ノードに到達
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
        console.log(`${edge.from} --> ${edge.to} はサイクルを形成（バックエッジ）`);
        backEdges.push(edge);
    }
});

console.log('');
console.log('検出されたバックエッジ:');
backEdges.forEach((edge, index) => {
    console.log(`  ${index + 1}. ${edge.from} --> ${edge.to}`);
});
console.log('');
console.log('期待されるバックエッジ: M --> H, L --> D');
