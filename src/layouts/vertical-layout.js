function getVerticalLayout() {
    return `
        function verticalLayout(nodes, connections, calculateAllNodeWidths, analyzeTreeStructure) {
            const container = document.getElementById('treeContainer');
            let containerWidth = Math.max(800, container.clientWidth || 800);

            const nodeWidthMap = calculateAllNodeWidths(nodes);
            const treeStructure = analyzeTreeStructure(nodes, connections);
            const nodePositions = new Map();

            const leftMargin = 50;
            const fixedSpacing = 60;

            // 各階層間の必要な距離を動的に計算
            const levelHeights = [];
            for (let i = 0; i < treeStructure.levels.length - 1; i++) {
                const fromLevel = treeStructure.levels[i];
                const toLevel = treeStructure.levels[i + 1];

                // この階層から次の階層へ接続する親ノードの数をカウント
                const parentNodes = new Set();
                connections.forEach(conn => {
                    const fromInLevel = fromLevel.find(n => n.id === conn.from);
                    const toInLevel = toLevel.find(n => n.id === conn.to);
                    if (fromInLevel && toInLevel) {
                        parentNodes.add(conn.from);
                    }
                });

                // 親の数に基づいて必要な距離を計算
                const baseHeight = 60;
                const laneSpacing = 12;
                const minHeight = 80;
                const maxHeight = 250;

                const requiredHeight = Math.max(minHeight,
                    Math.min(maxHeight, baseHeight + parentNodes.size * laneSpacing));

                levelHeights[i] = requiredHeight;
            }

            // 各階層のY座標を計算
            const levelYPositions = [50];
            for (let i = 1; i < treeStructure.levels.length; i++) {
                const height = levelHeights[i - 1] || 80;
                levelYPositions[i] = levelYPositions[i - 1] + height;
            }

            treeStructure.levels.forEach((level, levelIndex) => {
                const y = levelYPositions[levelIndex];

                if (levelIndex === 0) {
                    let currentX = leftMargin;
                    level.forEach(node => {
                        const element = document.getElementById(node.id);
                        if (element && !element.classList.contains('hidden')) {
                            setNodePosition(element, currentX, y);
                            const dimensions = getNodeDimensions(element);
                            nodePositions.set(node.id, { x: currentX, y: y, width: dimensions.width });
                            currentX += dimensions.width + fixedSpacing;
                        }
                    });
                } else {
                    let levelMaxX = leftMargin;

                    level.forEach(node => {
                        const element = document.getElementById(node.id);
                        if (element && !element.classList.contains('hidden')) {
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

                                setNodePosition(element, startX, y);
                                const dimensions = getNodeDimensions(element);
                                nodePositions.set(node.id, { x: startX, y: y, width: dimensions.width });

                                levelMaxX = Math.max(levelMaxX, startX + dimensions.width + fixedSpacing);
                            } else {
                                setNodePosition(element, levelMaxX, y);
                                const dimensions = getNodeDimensions(element);
                                nodePositions.set(node.id, { x: levelMaxX, y: y, width: dimensions.width });
                                levelMaxX += dimensions.width + fixedSpacing;
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