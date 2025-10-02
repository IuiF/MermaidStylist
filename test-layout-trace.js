// horizontal-layout.jsのロジックをトレース

const nodes = [
    {id: "A", label: "Root (Level 0)"},
    {id: "B", label: "Level 1"},
    {id: "C", label: "Level 2"},
    {id: "D", label: "Level 3"},
    {id: "E", label: "Level 4 (親: B=Level1, D=Level3)"},
    {id: "F", label: "Level 5 (親: A=Level0, E=Level4)"}
];

const connections = [
    {from: "A", to: "B"},
    {from: "B", to: "C"},
    {from: "C", to: "D"},
    {from: "B", to: "E"},
    {from: "D", to: "E"},
    {from: "A", to: "F"},
    {from: "E", to: "F"}
];

// 階層構造を分析
function analyzeTreeStructure(nodes, connections) {
    const childNodes = new Set(connections.map(c => c.to));
    const rootNodes = nodes.filter(node => !childNodes.has(node.id));

    const childrenMap = new Map();
    connections.forEach(conn => {
        if (!childrenMap.has(conn.from)) {
            childrenMap.set(conn.from, []);
        }
        childrenMap.get(conn.from).push(conn.to);
    });

    const nodeLevel = new Map();
    const queue = [];

    rootNodes.forEach(rootNode => {
        nodeLevel.set(rootNode.id, 0);
        queue.push(rootNode.id);
    });

    let processed = 0;
    const maxIterations = nodes.length * nodes.length;

    while (queue.length > 0 && processed < maxIterations) {
        const currentId = queue.shift();
        processed++;
        const currentLevel = nodeLevel.get(currentId);
        const children = childrenMap.get(currentId) || [];

        for (const childId of children) {
            const newLevel = currentLevel + 1;
            const existingLevel = nodeLevel.get(childId);

            if (existingLevel === undefined || newLevel > existingLevel) {
                nodeLevel.set(childId, newLevel);
                queue.push(childId);
            }
        }
    }

    const levels = [];
    const maxLevel = Math.max(...Array.from(nodeLevel.values()), 0);

    for (let i = 0; i <= maxLevel; i++) {
        const levelNodes = [];
        nodeLevel.forEach((level, nodeId) => {
            if (level === i) {
                const node = nodes.find(n => n.id === nodeId);
                if (node) {
                    levelNodes.push(node);
                }
            }
        });
        if (levelNodes.length > 0) {
            levels.push(levelNodes);
        }
    }

    return { rootNodes, levels, childrenMap };
}

const treeStructure = analyzeTreeStructure(nodes, connections);

console.log('\n階層構造:');
treeStructure.levels.forEach((level, index) => {
    console.log(`Level ${index}: ${level.map(n => n.id).join(', ')}`);
});

console.log('\n\nレイアウト処理のトレース:');
console.log('='.repeat(60));

const nodePositions = new Map();
const leftMargin = 50;
const topMargin = 50;
const fixedSpacing = 60;

// 簡易的な幅と高さ（実際はDOM要素から取得）
const nodeWidth = 100;
const nodeHeight = 28;

treeStructure.levels.forEach((level, levelIndex) => {
    const levelX = leftMargin + levelIndex * (nodeWidth + fixedSpacing * 2);
    let currentY = topMargin;

    console.log(`\n--- Level ${levelIndex} (X=${levelX}) ---`);

    level.forEach(node => {
        // 最初の親を探す
        const parentId = connections.find(conn => conn.to === node.id)?.from;

        console.log(`\nノード ${node.id}:`);
        console.log(`  全ての親: ${connections.filter(c => c.to === node.id).map(c => c.from).join(', ')}`);
        console.log(`  find()で見つかった親: ${parentId || 'なし'}`);

        if (parentId && nodePositions.has(parentId)) {
            const parentPos = nodePositions.get(parentId);
            const siblings = connections.filter(conn => conn.from === parentId).map(conn => conn.to);
            const siblingIndex = siblings.indexOf(node.id);

            console.log(`  親の位置: Y=${parentPos.y}`);
            console.log(`  兄弟: ${siblings.join(', ')}`);
            console.log(`  兄弟インデックス: ${siblingIndex}`);

            let startY = parentPos.y;

            for (let i = 0; i < siblingIndex; i++) {
                const siblingId = siblings[i];
                if (nodePositions.has(siblingId)) {
                    const siblingPos = nodePositions.get(siblingId);
                    startY = Math.max(startY, siblingPos.y + nodeHeight + fixedSpacing);
                    console.log(`  兄弟 ${siblingId} の後: startY=${startY}`);
                }
            }

            startY = Math.max(startY, currentY);
            console.log(`  最終Y座標: ${startY}`);

            nodePositions.set(node.id, { x: levelX, y: startY, width: nodeWidth, height: nodeHeight });
            currentY = Math.max(currentY, startY + nodeHeight + fixedSpacing);
        } else {
            console.log(`  親なし、currentY使用: ${currentY}`);
            nodePositions.set(node.id, { x: levelX, y: currentY, width: nodeWidth, height: nodeHeight });
            currentY += nodeHeight + fixedSpacing;
        }
    });
});

console.log('\n\n最終的なノード位置:');
console.log('='.repeat(60));
nodePositions.forEach((pos, nodeId) => {
    console.log(`${nodeId}: (${pos.x}, ${pos.y})`);
});
