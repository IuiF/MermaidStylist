function getCollisionResolver() {
    return `
        const COLLISION_CONSTANTS_V2 = {
            COLLISION_MARGIN: 20,
            BASE_SPACING: 60,
            MAX_ITERATIONS: 5,
            ESTIMATED_LABEL_HEIGHT: 20,
            LABEL_VERTICAL_SPACING: 10,
            LABEL_TOP_MARGIN: 5,
            ESTIMATED_LABEL_WIDTH: 100
        };


        function resolveDashedNodeEdgeCollisionsV2(nodePositions, connections, treeStructure, dashedNodes) {
            const maxIterations = COLLISION_CONSTANTS_V2.MAX_ITERATIONS;
            const collisionMargin = COLLISION_CONSTANTS_V2.COLLISION_MARGIN;

            // ノードIDからレベルインデックスへのマップを事前構築
            const nodeToLevel = new Map();
            treeStructure.levels.forEach((level, idx) => {
                level.forEach(node => {
                    nodeToLevel.set(node.id, idx);
                });
            });

            // 実線エッジのみをフィルタリング
            const solidConnections = connections.filter(conn => !conn.isDashed);

            for (let iteration = 0; iteration < maxIterations; iteration++) {
                let hasCollision = false;

                treeStructure.levels.forEach((level, levelIndex) => {
                    level.forEach(node => {
                        if (!dashedNodes.has(node.id)) return;

                        const nodePos = nodePositions.get(node.id);
                        if (!nodePos) return;

                        const nodeTop = nodePos.y - collisionMargin;
                        const nodeBottom = nodePos.y + nodePos.height + collisionMargin;
                        const nodeLeft = nodePos.x - collisionMargin;
                        const nodeRight = nodePos.x + nodePos.width + collisionMargin;

                        solidConnections.forEach(conn => {
                            const fromPos = nodePositions.get(conn.from);
                            const toPos = nodePositions.get(conn.to);

                            if (!fromPos || !toPos) return;

                            const fromLevel = nodeToLevel.get(conn.from);
                            const toLevel = nodeToLevel.get(conn.to);

                            if (fromLevel === undefined || toLevel === undefined || fromLevel >= levelIndex || toLevel <= levelIndex) return;

                            const levelSpan = toLevel - fromLevel;
                            if (levelSpan >= 3) return;

                            const edgeMinY = Math.min(fromPos.y, toPos.y);
                            const edgeMaxY = Math.max(fromPos.y + fromPos.height, toPos.y + toPos.height);

                            const yOverlap = nodeTop < edgeMaxY && nodeBottom > edgeMinY;
                            if (!yOverlap) return;

                            const verticalLineMinX = fromPos.x + fromPos.width;
                            const verticalLineMaxX = toPos.x;

                            const xOverlap = !(verticalLineMaxX < nodeLeft || verticalLineMinX > nodeRight);

                            if (xOverlap) {
                                const shiftAmount = edgeMaxY - nodeTop + COLLISION_CONSTANTS_V2.BASE_SPACING;
                                nodePos.y += shiftAmount;
                                hasCollision = true;
                            }
                        });
                    });
                });

                if (!hasCollision) break;
            }
        }

        function resolveSameLevelCollisionsV2(nodePositions, connections, treeStructure) {
            treeStructure.levels.forEach((level, levelIndex) => {
                const levelNodes = level.map(node => ({
                    node: node,
                    pos: nodePositions.get(node.id)
                })).filter(item => item.pos).sort((a, b) => a.pos.y - b.pos.y);

                for (let i = 0; i < levelNodes.length - 1; i++) {
                    const current = levelNodes[i];
                    const next = levelNodes[i + 1];

                    const currentBottom = current.pos.y + current.pos.height;
                    const nextTop = next.pos.y;
                    const nodeSpacing = calculateNodeSpacingV2(next.node.id, connections);

                    if (currentBottom + nodeSpacing > nextTop) {
                        const shiftAmount = currentBottom + nodeSpacing - nextTop;
                        next.pos.y += shiftAmount;

                        for (let j = i + 2; j < levelNodes.length; j++) {
                            levelNodes[j].pos.y += shiftAmount;
                        }
                    }
                }
            });
        }

        function resolveNodeLabelCollisionsV2(nodePositions, connections, treeStructure) {
            const maxIterations = COLLISION_CONSTANTS_V2.MAX_ITERATIONS;
            const collisionMargin = 5;
            const estimatedLabelHeight = COLLISION_CONSTANTS_V2.ESTIMATED_LABEL_HEIGHT;
            const labelVerticalSpacing = COLLISION_CONSTANTS_V2.LABEL_VERTICAL_SPACING;
            const labelTopMargin = COLLISION_CONSTANTS_V2.LABEL_TOP_MARGIN;

            // ラベル付き実線エッジのみをフィルタリング
            const labeledConnections = connections.filter(conn => conn.label && !conn.isDashed);

            // ラベルがない場合は早期リターン
            if (labeledConnections.length === 0) return;

            for (let iteration = 0; iteration < maxIterations; iteration++) {
                let hasCollision = false;

                const predictedLabelBounds = [];
                const labelOffsets = {};

                labeledConnections.forEach(conn => {
                    const toPos = nodePositions.get(conn.to);
                    if (!toPos) return;

                    if (!labelOffsets[conn.to]) {
                        labelOffsets[conn.to] = 0;
                    }
                    const offset = labelOffsets[conn.to];
                    labelOffsets[conn.to]++;

                    const labelLeft = toPos.x;
                    const labelTop = toPos.y - estimatedLabelHeight - labelTopMargin - (offset * (estimatedLabelHeight + labelVerticalSpacing));
                    const labelWidth = COLLISION_CONSTANTS_V2.ESTIMATED_LABEL_WIDTH;
                    const labelHeight = estimatedLabelHeight;

                    predictedLabelBounds.push({
                        to: conn.to,
                        left: labelLeft,
                        top: labelTop,
                        right: labelLeft + labelWidth,
                        bottom: labelTop + labelHeight
                    });
                });

                treeStructure.levels.forEach((level, levelIndex) => {
                    level.forEach(node => {
                        const nodePos = nodePositions.get(node.id);
                        if (!nodePos) return;

                        const nodeLeft = nodePos.x - collisionMargin;
                        const nodeTop = nodePos.y - collisionMargin;
                        const nodeRight = nodePos.x + nodePos.width + collisionMargin;
                        const nodeBottom = nodePos.y + nodePos.height + collisionMargin;

                        for (let i = 0; i < predictedLabelBounds.length; i++) {
                            const label = predictedLabelBounds[i];

                            if (label.to === node.id) continue;

                            const xOverlap = !(nodeRight < label.left || nodeLeft > label.right);
                            if (!xOverlap) continue;

                            const yOverlap = !(nodeBottom < label.top || nodeTop > label.bottom);
                            if (!yOverlap) continue;

                            const shiftAmount = label.bottom + collisionMargin - nodePos.y + COLLISION_CONSTANTS_V2.BASE_SPACING;
                            nodePos.y += shiftAmount;
                            hasCollision = true;
                        }
                    });
                });

                if (!hasCollision) break;
            }
        }

        function resolveCollisionsV2(input) {
            const { nodePositions, connections, treeStructure, dashedNodes } = input;

            resolveDashedNodeEdgeCollisionsV2(nodePositions, connections, treeStructure, dashedNodes);
            resolveSameLevelCollisionsV2(nodePositions, connections, treeStructure);
            resolveNodeLabelCollisionsV2(nodePositions, connections, treeStructure);

            return nodePositions;
        }
    `;
}

module.exports = {
    getCollisionResolver
};
