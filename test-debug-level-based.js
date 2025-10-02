// レベルベースのバックエッジ検出

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

// Kahn's algorithm でレベルを計算
const inDegree = new Map();
const childrenMap = new Map();
const nodeLevel = new Map();

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
        nodeLevel.set(node.id, 0);
    }
});

console.log('初期キュー（入次数0）:', queue);
console.log('');

const processedNodes = [];
while (queue.length > 0) {
    const nodeId = queue.shift();
    processedNodes.push(nodeId);
    const currentLevel = nodeLevel.get(nodeId);

    console.log(`処理: ${nodeId}, レベル: ${currentLevel}`);

    const children = childrenMap.get(nodeId) || [];
    children.forEach(childId => {
        const oldDegree = inDegree.get(childId);
        inDegree.set(childId, oldDegree - 1);

        if (inDegree.get(childId) === 0) {
            // 入次数が0になったときだけレベルを設定
            const childLevel = nodeLevel.get(childId) || 0;
            nodeLevel.set(childId, Math.max(childLevel, currentLevel + 1));
            queue.push(childId);
            console.log(`  ${childId}をキューに追加（レベル: ${nodeLevel.get(childId)}）`);
        }
    });
}

console.log('');
console.log('処理されたノード:', processedNodes);
console.log('未処理ノード:', nodes.filter(n => !processedNodes.includes(n.id)).map(n => n.id));
console.log('');

// レベル情報を表示
console.log('ノードレベル:');
nodes.forEach(node => {
    const level = nodeLevel.get(node.id);
    if (level !== undefined) {
        console.log(`  ${node.id}: ${level}`);
    } else {
        console.log(`  ${node.id}: undefined (サイクル内)`);
    }
});
console.log('');

// バックエッジを検出
const backEdges = [];
const processedSet = new Set(processedNodes);

connections.forEach(conn => {
    const fromLevel = nodeLevel.get(conn.from);
    const toLevel = nodeLevel.get(conn.to);

    // 両方レベルが定義されている場合
    if (fromLevel !== undefined && toLevel !== undefined) {
        if (fromLevel >= toLevel) {
            console.log(`バックエッジ候補: ${conn.from}(${fromLevel}) --> ${conn.to}(${toLevel})`);
            backEdges.push({ from: conn.from, to: conn.to });
        }
    }
    // fromが未処理（サイクル内）、toが処理済み
    else if (!processedSet.has(conn.from) && processedSet.has(conn.to)) {
        console.log(`バックエッジ候補: ${conn.from}(サイクル内) --> ${conn.to}(${toLevel})`);
        backEdges.push({ from: conn.from, to: conn.to });
    }
    // 両方が未処理（サイクル内）の場合
    else if (!processedSet.has(conn.from) && !processedSet.has(conn.to)) {
        // サイクル内のエッジは、さらに分析が必要
        console.log(`サイクル内エッジ: ${conn.from}(サイクル内) --> ${conn.to}(サイクル内)`);
    }
});

console.log('');
console.log('検出されたバックエッジ:');
backEdges.forEach((edge, index) => {
    console.log(`  ${index + 1}. ${edge.from} --> ${edge.to}`);
});
console.log('');
console.log('期待されるバックエッジ: M --> H, L --> D');
