// 階層計算のテスト
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

    // 各ノードの階層レベルを計算（複数の親がある場合は最も深い階層+1）
    const nodeLevel = new Map();
    const queue = [];

    // ルートノードをレベル0として開始
    rootNodes.forEach(rootNode => {
        nodeLevel.set(rootNode.id, 0);
        queue.push(rootNode.id);
    });

    // BFSで階層を計算（複数回訪問を許可し、より深い階層を採用）
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

            // より深い階層が見つかった場合、または未設定の場合は更新
            if (existingLevel === undefined || newLevel > existingLevel) {
                nodeLevel.set(childId, newLevel);
                queue.push(childId);
            }
        }
    }

    // 結果を出力
    console.log('\n各ノードの計算された階層:');
    nodeLevel.forEach((level, nodeId) => {
        const node = nodes.find(n => n.id === nodeId);
        const parents = parentsMap.get(nodeId) || [];
        const parentLevels = parents.map(p => `${p}=${nodeLevel.get(p)}`).join(', ');
        console.log(`  ${nodeId}: Level ${level} (親: ${parentLevels || 'なし'})`);
    });

    // 階層レベルごとにノードを分類
    const levels = [];
    const maxLevel = Math.max(...Array.from(nodeLevel.values()), 0);

    for (let i = 0; i <= maxLevel; i++) {
        const levelNodes = [];
        nodeLevel.forEach((level, nodeId) => {
            if (level === i) {
                const node = nodes.find(n => n.id === nodeId);
                if (node) {
                    levelNodes.push(node.id);
                }
            }
        });
        if (levelNodes.length > 0) {
            levels.push(levelNodes);
            console.log(`\nLevel ${i}: ${levelNodes.join(', ')}`);
        }
    }

    return { rootNodes, levels, childrenMap };
}

analyzeTreeStructure(nodes, connections);
