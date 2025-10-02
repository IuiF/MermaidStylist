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
            const baseSpacing = 60; // 基本スペース
            const edgeClearance = 80; // エッジとノード間のクリアランス
            const minLevelSpacing = 200; // 階層間の最小距離

            // ノード間のエッジラベル数を計算
            function calculateNodeSpacing(nodeId, connections) {
                const incomingEdges = connections.filter(conn => conn.to === nodeId);
                const labelsCount = incomingEdges.filter(conn => conn.label).length;
                if (labelsCount === 0) return baseSpacing;

                // 推定ラベル高さ（padding含む）
                const estimatedLabelHeight = 20;
                const labelSpacing = 2;
                const topMargin = 5;

                // 全ラベルの積み重ね高さを考慮
                const totalLabelHeight = estimatedLabelHeight + topMargin +
                                          (labelsCount - 1) * (estimatedLabelHeight + labelSpacing);

                return baseSpacing + totalLabelHeight;
            }

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
                const spacing = Math.max(levelSpacings[i - 1] || minLevelSpacing, minLevelSpacing);
                levelXPositions[i] = levelXPositions[i - 1] + levelMaxWidths[i - 1] + spacing + edgeClearance;
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
                                const nodeSpacing = calculateNodeSpacing(node.id, connections);
                                let startY = parents.length > 1
                                    ? parentPos.y + parentPos.height + nodeSpacing
                                    : parentPos.y;

                                // 全ての兄弟（自分を除く）の中で最も下にあるノードの下に配置
                                siblings.forEach(siblingId => {
                                    if (siblingId !== node.id && nodePositions.has(siblingId)) {
                                        const siblingPos = nodePositions.get(siblingId);
                                        const siblingSpacing = calculateNodeSpacing(siblingId, connections);
                                        startY = Math.max(startY, siblingPos.y + siblingPos.height + siblingSpacing);
                                    }
                                });

                                startY = Math.max(startY, currentY);

                                setNodePosition(element, levelX, startY);
                                const dimensions = getNodeDimensions(element);
                                nodePositions.set(node.id, { x: levelX, y: startY, width: dimensions.width, height: dimensions.height });

                                currentY = Math.max(currentY, startY + dimensions.height + nodeSpacing);
                            } else {
                                const nodeSpacing = calculateNodeSpacing(node.id, connections);
                                setNodePosition(element, levelX, currentY);
                                const dimensions = getNodeDimensions(element);
                                nodePositions.set(node.id, { x: levelX, y: currentY, width: dimensions.width, height: dimensions.height });
                                currentY += dimensions.height + nodeSpacing;
                            }
                        } else {
                            const nodeSpacing = calculateNodeSpacing(node.id, connections);
                            setNodePosition(element, levelX, currentY);
                            const dimensions = getNodeDimensions(element);
                            nodePositions.set(node.id, { x: levelX, y: currentY, width: dimensions.width, height: dimensions.height });
                            currentY += dimensions.height + nodeSpacing;
                        }
                    }
                });
            });

            // エッジとノードの衝突を検知して回避
            function resolveEdgeNodeCollisions() {
                const maxIterations = 10;
                const collisionMargin = 20;

                for (let iteration = 0; iteration < maxIterations; iteration++) {
                    let hasCollision = false;

                    connections.forEach(conn => {
                        const fromPos = nodePositions.get(conn.from);
                        const toPos = nodePositions.get(conn.to);

                        if (!fromPos || !toPos) return;

                        // 始点と終点の階層を取得
                        let fromLevel = -1, toLevel = -1;
                        treeStructure.levels.forEach((level, idx) => {
                            if (level.some(n => n.id === conn.from)) fromLevel = idx;
                            if (level.some(n => n.id === conn.to)) toLevel = idx;
                        });

                        if (fromLevel === -1 || toLevel === -1 || toLevel <= fromLevel) return;

                        // エッジの経路のY座標範囲を計算
                        const edgeMinY = Math.min(fromPos.y, toPos.y);
                        const edgeMaxY = Math.max(fromPos.y + fromPos.height, toPos.y + toPos.height);

                        // 中間階層のノードをチェック
                        for (let levelIdx = fromLevel + 1; levelIdx < toLevel; levelIdx++) {
                            const level = treeStructure.levels[levelIdx];
                            level.forEach(node => {
                                const nodePos = nodePositions.get(node.id);
                                if (!nodePos) return;

                                const element = document.getElementById(node.id);
                                if (!element || element.classList.contains('hidden')) return;

                                // ノードがエッジの経路内にあるかチェック
                                const nodeTop = nodePos.y - collisionMargin;
                                const nodeBottom = nodePos.y + nodePos.height + collisionMargin;

                                if (nodeTop < edgeMaxY && nodeBottom > edgeMinY) {
                                    // 衝突検出：ノードを下にシフト
                                    const shiftAmount = edgeMaxY - nodeTop + baseSpacing;
                                    nodePos.y += shiftAmount;
                                    setNodePosition(element, nodePos.x, nodePos.y);
                                    hasCollision = true;
                                }
                            });
                        }
                    });

                    if (!hasCollision) break;
                }
            }

            // resolveEdgeNodeCollisions(); // 一旦無効化

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

            // 階層情報をグローバルに保存（エッジレンダラーで使用）
            window.layoutLevelInfo = {
                levelXPositions: levelXPositions,
                levelMaxWidths: levelMaxWidths,
                levelCount: treeStructure.levels.length
            };

            return nodePositions;
        }
    `;
}

module.exports = {
    getHorizontalLayout
};