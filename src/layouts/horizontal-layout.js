function getHorizontalLayout() {
    return `
        function horizontalLayout(nodes, connections, calculateAllNodeWidths, analyzeTreeStructure) {
            const container = document.getElementById('treeContainer');
            let containerHeight = Math.max(800, container.clientHeight || 800);

            const nodeWidthMap = calculateAllNodeWidths(nodes);
            const treeStructure = analyzeTreeStructure(nodes, connections);
            const nodePositions = new Map();

            const leftMargin = 50;
            const topMargin = 50;
            const fixedSpacing = 60;
            const nodeHeight = 40;

            treeStructure.levels.forEach((level, levelIndex) => {
                if (levelIndex === 0) {
                    let currentY = topMargin;
                    level.forEach(node => {
                        const element = document.getElementById(node.id);
                        if (element && !element.classList.contains('hidden')) {
                            const nodeWidth = nodeWidthMap.get(node.label);
                            element.style.left = leftMargin + 'px';
                            element.style.top = currentY + 'px';
                            element.style.width = nodeWidth + 'px';
                            nodePositions.set(node.id, { x: leftMargin, y: currentY, width: nodeWidth, height: nodeHeight });
                            currentY += nodeHeight + fixedSpacing;
                        }
                    });
                } else {
                    let levelMaxY = topMargin;

                    level.forEach(node => {
                        const element = document.getElementById(node.id);
                        if (element && !element.classList.contains('hidden')) {
                            const nodeWidth = nodeWidthMap.get(node.label);
                            const parentId = connections.find(conn => conn.to === node.id)?.from;
                            if (parentId && nodePositions.has(parentId)) {
                                const parentPos = nodePositions.get(parentId);
                                const siblings = connections.filter(conn => conn.from === parentId).map(conn => conn.to);
                                const siblingIndex = siblings.indexOf(node.id);

                                // 親子間の距離を一定にする（横方向は倍のスペース）
                                const nodeX = parentPos.x + parentPos.width + fixedSpacing * 2;

                                let startY = parentPos.y;

                                for (let i = 0; i < siblingIndex; i++) {
                                    const siblingId = siblings[i];
                                    if (nodePositions.has(siblingId)) {
                                        const siblingPos = nodePositions.get(siblingId);
                                        startY = Math.max(startY, siblingPos.y + siblingPos.height + fixedSpacing);
                                    }
                                }

                                startY = Math.max(startY, levelMaxY);

                                element.style.left = nodeX + 'px';
                                element.style.top = startY + 'px';
                                element.style.width = nodeWidth + 'px';
                                nodePositions.set(node.id, { x: nodeX, y: startY, width: nodeWidth, height: nodeHeight });

                                levelMaxY = Math.max(levelMaxY, startY + nodeHeight + fixedSpacing);
                            } else {
                                element.style.left = leftMargin + 'px';
                                element.style.top = levelMaxY + 'px';
                                element.style.width = nodeWidth + 'px';
                                nodePositions.set(node.id, { x: leftMargin, y: levelMaxY, width: nodeWidth, height: nodeHeight });
                                levelMaxY += nodeHeight + fixedSpacing;
                            }
                        }
                    });
                }
            });

            const maxY = Math.max(...Array.from(nodePositions.values()).map(pos => pos.y + pos.height));
            const maxX = Math.max(...Array.from(nodePositions.values()).map(pos => pos.x + pos.width));

            if (maxY + 100 > containerHeight) {
                containerHeight = maxY + 100;
                container.style.height = containerHeight + 'px';
                console.log("Container height expanded to: " + containerHeight + "px for horizontal layout");
            }

            let containerWidth = Math.max(800, container.clientWidth || 800);
            if (maxX + 100 > containerWidth) {
                containerWidth = maxX + 100;
                container.style.width = containerWidth + 'px';
                console.log("Container width expanded to: " + containerWidth + "px for horizontal layout");
            }

            return nodePositions;
        }
    `;
}

module.exports = {
    getHorizontalLayout
};