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
            const edgeClearance = 40; // エッジとノード間のクリアランス

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
                levelSpacings[i] = calculateLevelSpacing(fromLevel, toLevel, connections, i, i + 1, treeStructure.levels);
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
                        // 全ての親を取得
                        const parents = connections.filter(conn => conn.to === node.id).map(conn => conn.from);

                        if (parents.length > 0) {
                            // 全ての親の中で最もY座標が大きい（下にある）親を選択
                            let selectedParent = null;
                            let maxParentY = -1;

                            for (const parentId of parents) {
                                if (nodePositions.has(parentId)) {
                                    const parentPos = nodePositions.get(parentId);
                                    if (parentPos.y > maxParentY) {
                                        maxParentY = parentPos.y;
                                        selectedParent = parentId;
                                    }
                                }
                            }

                            if (selectedParent) {
                                const parentPos = nodePositions.get(selectedParent);

                                // 複数の親を持つ場合は、全ての親からの兄弟を取得
                                let siblings;
                                if (parents.length > 1) {
                                    const allSiblings = new Set();
                                    for (const parentId of parents) {
                                        const parentChildren = connections.filter(conn => conn.from === parentId).map(conn => conn.to);
                                        parentChildren.forEach(child => allSiblings.add(child));
                                    }
                                    siblings = Array.from(allSiblings);
                                } else {
                                    siblings = connections.filter(conn => conn.from === selectedParent).map(conn => conn.to);
                                }

                                // 複数の親を持つ場合は親の下に、単一の親なら親と同じ高さから
                                let startY = parents.length > 1
                                    ? parentPos.y + parentPos.height + fixedSpacing
                                    : parentPos.y;

                                // 全ての兄弟（自分を除く）の中で最も下にあるノードの下に配置
                                siblings.forEach(siblingId => {
                                    if (siblingId !== node.id && nodePositions.has(siblingId)) {
                                        const siblingPos = nodePositions.get(siblingId);
                                        startY = Math.max(startY, siblingPos.y + siblingPos.height + fixedSpacing);
                                    }
                                });

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
                        } else {
                            setNodePosition(element, levelX, currentY);
                            const dimensions = getNodeDimensions(element);
                            nodePositions.set(node.id, { x: levelX, y: currentY, width: dimensions.width, height: dimensions.height });
                            currentY += dimensions.height + fixedSpacing;
                        }
                    }
                });
            });

            // ノードIDからレベルを取得するマップ
            const nodeToLevel = new Map();
            treeStructure.levels.forEach((level, levelIndex) => {
                level.forEach(node => {
                    nodeToLevel.set(node.id, levelIndex);
                });
            });

            // 長距離エッジとノードの衝突を調整
            connections.forEach(conn => {
                const fromLevel = nodeToLevel.get(conn.from);
                const toLevel = nodeToLevel.get(conn.to);
                const fromPos = nodePositions.get(conn.from);
                const toPos = nodePositions.get(conn.to);

                if (!fromPos || !toPos || fromLevel === undefined || toLevel === undefined) return;

                const levelDiff = Math.abs(toLevel - fromLevel);
                if (levelDiff >= 2) {
                    const minLevel = Math.min(fromLevel, toLevel);
                    const maxLevel = Math.max(fromLevel, toLevel);
                    const edgeYMin = Math.min(fromPos.y, toPos.y);
                    const edgeYMax = Math.max(fromPos.y, toPos.y);

                    // 途中のレベルのノードをチェック
                    for (let level = minLevel + 1; level < maxLevel; level++) {
                        treeStructure.levels[level].forEach(node => {
                            const nodePos = nodePositions.get(node.id);
                            if (!nodePos) return;

                            const nodeTop = nodePos.y;
                            const nodeBottom = nodePos.y + nodePos.height;

                            // ノードとエッジが重なるかチェック
                            if (nodeTop < edgeYMax + edgeClearance && nodeBottom > edgeYMin - edgeClearance) {
                                // 重なっている場合、ノードをエッジの下にシフト
                                const shiftAmount = (edgeYMax + edgeClearance) - nodeTop;
                                if (shiftAmount > 0) {
                                    nodePos.y += shiftAmount;
                                    // DOM要素も更新
                                    const element = document.getElementById(node.id);
                                    if (element) {
                                        setNodePosition(element, nodePos.x, nodePos.y);
                                    }
                                }
                            }
                        });
                    }
                }
            });

            const maxY = Math.max(...Array.from(nodePositions.values()).map(pos => pos.y + pos.height));
            const maxX = Math.max(...Array.from(nodePositions.values()).map(pos => pos.x + pos.width));

            if (maxY + 100 > containerHeight) {
                containerHeight = maxY + 100;
                container.style.height = containerHeight + 'px';
            }

            let containerWidth = Math.max(800, container.clientWidth || 800);
            if (maxX + 100 > containerWidth) {
                containerWidth = maxX + 100;
                container.style.width = containerWidth + 'px';
            }

            return nodePositions;
        }
    `;
}

module.exports = {
    getHorizontalLayout
};