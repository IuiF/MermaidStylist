function getTreeStructureAnalyzer() {
    return `
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

            const levels = [];
            const visited = new Set();

            if (rootNodes.length > 0) {
                let currentLevel = rootNodes.map(node => node.id);
                let maxDepth = 0;

                while (currentLevel.length > 0 && maxDepth < 50) {
                    const levelNodes = currentLevel.map(nodeId => nodes.find(n => n.id === nodeId)).filter(Boolean);
                    levels.push(levelNodes);

                    currentLevel.forEach(nodeId => visited.add(nodeId));

                    const nextLevel = [];
                    currentLevel.forEach(nodeId => {
                        const children = childrenMap.get(nodeId) || [];
                        children.forEach(childId => {
                            if (!visited.has(childId)) {
                                nextLevel.push(childId);
                            }
                        });
                    });

                    currentLevel = [...new Set(nextLevel)];
                    maxDepth++;
                }
            }

            return { rootNodes, levels, childrenMap };
        }
    `;
}

module.exports = {
    getTreeStructureAnalyzer
};