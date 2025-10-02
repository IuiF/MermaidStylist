// 複雑なDAG構造の階層計算をトレース

const nodes = [
    {id: "A", label: "A: ルート1"},
    {id: "B", label: "B: ルート2"},
    {id: "C", label: "C: Aの子"},
    {id: "D", label: "D: Aの子"},
    {id: "E", label: "E: Bの子"},
    {id: "F", label: "F: Bの子"},
    {id: "G", label: "G: 親C,D"},
    {id: "H", label: "H: 親D,E"},
    {id: "I", label: "I: 親E"},
    {id: "J", label: "J: 親F,I"},
    {id: "K", label: "K: 親G,H"},
    {id: "L", label: "L: 親H,J"},
    {id: "M", label: "M: 親K,L"}
];

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
    {from: "L", to: "M"}
];

// 階層構造を分析
function analyzeTreeStructure(nodes, connections) {
    const childNodes = new Set(connections.map(c => c.to));
    const rootNodes = nodes.filter(node => !childNodes.has(node.id));

    const childrenMap = new Map();
    const parentsMap = new Map();

    connections.forEach(conn => {
        if (!childrenMap.has(conn.from)) {
            childrenMap.set(conn.from, []);
        }
        childrenMap.get(conn.from).push(conn.to);

        if (!parentsMap.has(conn.to)) {
            parentsMap.set(conn.to, []);
        }
        parentsMap.get(conn.to).push(conn.from);
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

    return { rootNodes, levels, childrenMap, parentsMap, nodeLevel };
}

const result = analyzeTreeStructure(nodes, connections);

console.log('複雑なDAG構造の階層分析');
console.log('='.repeat(60));

console.log('\n各ノードの階層レベル:');
result.nodeLevel.forEach((level, nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    const parents = result.parentsMap.get(nodeId) || [];
    const parentLevels = parents.map(p => `${p}(L${result.nodeLevel.get(p)})`).join(', ');
    console.log(`  ${nodeId}: Level ${level} - 親: ${parentLevels || 'なし'}`);
});

console.log('\n階層ごとのノード配置:');
result.levels.forEach((level, index) => {
    console.log(`Level ${index}: ${level.map(n => n.id).join(', ')}`);
});

console.log('\n複数親ノードの詳細:');
result.parentsMap.forEach((parents, nodeId) => {
    if (parents.length > 1) {
        const parentLevels = parents.map(p => `${p}(L${result.nodeLevel.get(p)})`);
        const maxParentLevel = Math.max(...parents.map(p => result.nodeLevel.get(p)));
        console.log(`  ${nodeId}: ${parents.length}親 [${parentLevels.join(', ')}]`);
        console.log(`    → 最深親レベル: ${maxParentLevel}, 配置レベル: ${result.nodeLevel.get(nodeId)}`);
    }
});
