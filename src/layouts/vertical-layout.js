function getVerticalLayout() {
    return `
        function verticalLayout(nodes, connections, calculateAllNodeWidths, analyzeTreeStructure) {
            const container = document.getElementById('treeContainer');
            let containerWidth = Math.max(800, container.clientWidth || 800);

            const nodeWidthMap = calculateAllNodeWidths(nodes);
            const treeStructure = analyzeTreeStructure(nodes, connections);
            const nodePositions = new Map();

            const levelHeight = 80;
            const leftMargin = 50;
            const fixedSpacing = 60;

            treeStructure.levels.forEach((level, levelIndex) => {
                const y = 50 + levelIndex * levelHeight;

                if (levelIndex === 0) {
                    let currentX = leftMargin;
                    level.forEach(node => {
                        const element = document.getElementById(node.id);
                        if (element && !element.classList.contains('hidden')) {
                            const nodeWidth = nodeWidthMap.get(node.label);
                            element.style.left = currentX + 'px';
                            element.style.top = y + 'px';
                            element.style.width = nodeWidth + 'px';
                            nodePositions.set(node.id, { x: currentX, y: y, width: nodeWidth });
                            currentX += nodeWidth + fixedSpacing;
                        }
                    });
                } else {
                    let levelMaxX = leftMargin;

                    level.forEach(node => {
                        const element = document.getElementById(node.id);
                        if (element && !element.classList.contains('hidden')) {
                            const nodeWidth = nodeWidthMap.get(node.label);
                            const parentId = connections.find(conn => conn.to === node.id)?.from;
                            if (parentId && nodePositions.has(parentId)) {
                                const parentPos = nodePositions.get(parentId);
                                const siblings = connections.filter(conn => conn.from === parentId).map(conn => conn.to);
                                const siblingIndex = siblings.indexOf(node.id);

                                let startX = parentPos.x + parentPos.width + fixedSpacing;

                                for (let i = 0; i < siblingIndex; i++) {
                                    const siblingId = siblings[i];
                                    if (nodePositions.has(siblingId)) {
                                        const siblingPos = nodePositions.get(siblingId);
                                        startX = Math.max(startX, siblingPos.x + siblingPos.width + fixedSpacing);
                                    }
                                }

                                startX = Math.max(startX, levelMaxX);

                                element.style.left = startX + 'px';
                                element.style.top = y + 'px';
                                element.style.width = nodeWidth + 'px';
                                nodePositions.set(node.id, { x: startX, y: y, width: nodeWidth });

                                levelMaxX = Math.max(levelMaxX, startX + nodeWidth + fixedSpacing);
                            } else {
                                element.style.left = levelMaxX + 'px';
                                element.style.top = y + 'px';
                                element.style.width = nodeWidth + 'px';
                                nodePositions.set(node.id, { x: levelMaxX, y: y, width: nodeWidth });
                                levelMaxX += nodeWidth + fixedSpacing;
                            }
                        }
                    });
                }
            });

            const maxX = Math.max(...Array.from(nodePositions.values()).map(pos => pos.x + pos.width));
            if (maxX + 100 > containerWidth) {
                containerWidth = maxX + 100;
                container.style.width = containerWidth + 'px';
                console.log("Container width expanded to: " + containerWidth + "px for vertical layout");
            }

            return nodePositions;
        }
    `;
}

module.exports = {
    getVerticalLayout
};