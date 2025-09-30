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

            // 各階層の最大ノード幅を事前に計算
            const levelMaxWidths = [];
            treeStructure.levels.forEach((level, levelIndex) => {
                let maxWidth = 0;
                level.forEach(node => {
                    const element = document.getElementById(node.id);
                    if (element && !element.classList.contains('hidden')) {
                        const dimensions = getNodeDimensions(element);
                        maxWidth = Math.max(maxWidth, dimensions.width);
                    }
                });
                levelMaxWidths[levelIndex] = maxWidth;
            });

            // 各階層間の必要な距離を動的に計算
            const levelSpacings = [];
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
                // 基本距離 + レーンあたりの追加距離
                const baseSpacing = 60;
                const laneSpacing = 12;
                const minSpacing = 80;
                const maxSpacing = 250;

                const requiredSpacing = Math.max(minSpacing,
                    Math.min(maxSpacing, baseSpacing + parentNodes.size * laneSpacing));

                levelSpacings[i] = requiredSpacing;
            }

            // 各階層のX座標を計算
            const levelXPositions = [leftMargin];
            for (let i = 1; i < treeStructure.levels.length; i++) {
                const spacing = levelSpacings[i - 1] || fixedSpacing * 2;
                levelXPositions[i] = levelXPositions[i - 1] + levelMaxWidths[i - 1] + spacing;
            }

            treeStructure.levels.forEach((level, levelIndex) => {
                const levelX = levelXPositions[levelIndex];
                let currentY = topMargin;

                level.forEach(node => {
                    const element = document.getElementById(node.id);
                    if (element && !element.classList.contains('hidden')) {
                        const parentId = connections.find(conn => conn.to === node.id)?.from;

                        if (parentId && nodePositions.has(parentId)) {
                            const parentPos = nodePositions.get(parentId);
                            const siblings = connections.filter(conn => conn.from === parentId).map(conn => conn.to);
                            const siblingIndex = siblings.indexOf(node.id);

                            let startY = parentPos.y;

                            for (let i = 0; i < siblingIndex; i++) {
                                const siblingId = siblings[i];
                                if (nodePositions.has(siblingId)) {
                                    const siblingPos = nodePositions.get(siblingId);
                                    startY = Math.max(startY, siblingPos.y + siblingPos.height + fixedSpacing);
                                }
                            }

                            startY = Math.max(startY, currentY);

                            setNodePosition(element, levelX, startY);
                            const dimensions = getNodeDimensions(element);
                            nodePositions.set(node.id, { x: levelX, y: startY, width: dimensions.width, height: dimensions.height });

                            currentY = Math.max(currentY, startY + dimensions.height + fixedSpacing);
                        } else {
                            setNodePosition(element, levelX, currentY);
                            const dimensions = getNodeDimensions(element);
                            nodePositions.set(node.id, { x: levelX, y: currentY, width: dimensions.width, height: dimensions.height });
                            currentY += dimensions.height + fixedSpacing;
                        }
                    }
                });
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