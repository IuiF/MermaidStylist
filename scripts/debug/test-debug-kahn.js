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
const processedNodes = [];

nodes.forEach(node => {
    if (inDegree.get(node.id) === 0) {
        queue.push(node.id);
    }
});

console.log('初期キュー（入次数0）:', queue);
console.log('');

while (queue.length > 0) {
    const nodeId = queue.shift();
    processedNodes.push(nodeId);
    console.log(`処理: ${nodeId}, processedNodes: [${processedNodes.join(', ')}]`);

    const children = childrenMap.get(nodeId) || [];
    children.forEach(childId => {
        const oldDegree = inDegree.get(childId);
        inDegree.set(childId, oldDegree - 1);
        console.log(`  ${childId}の入次数: ${oldDegree} → ${oldDegree - 1}`);
        if (inDegree.get(childId) === 0) {
            queue.push(childId);
            console.log(`  ${childId}をキューに追加`);
        }
    });
}

console.log('');
console.log('最終 processedNodes:', processedNodes);
console.log('処理されたノード数:', processedNodes.length, '/ 全ノード数:', nodes.length);
