function getNodePlacer() {
    return `
        const LAYOUT_CONSTANTS = {
            LEFT_MARGIN: 50,
            TOP_MARGIN: 50,
            BASE_SPACING: 60,
            EDGE_CLEARANCE: 80,
            MIN_LEVEL_SPACING: 200,
            LABEL_HEIGHT: 20,
            LABEL_VERTICAL_SPACING: 10,
            LABEL_TOP_MARGIN: 5,
            DEFAULT_NODE_HEIGHT: 50
        };

        function calculateNodeSpacingV2(nodeId, connections) {
            const incomingEdges = connections.filter(conn => conn.to === nodeId);
            const labelsCount = incomingEdges.filter(conn => conn.label).length;
            if (labelsCount === 0) return LAYOUT_CONSTANTS.BASE_SPACING;

            const totalLabelHeight = LAYOUT_CONSTANTS.LABEL_HEIGHT + LAYOUT_CONSTANTS.LABEL_TOP_MARGIN +
                                      (labelsCount - 1) * (LAYOUT_CONSTANTS.LABEL_HEIGHT + LAYOUT_CONSTANTS.LABEL_VERTICAL_SPACING);
            return LAYOUT_CONSTANTS.BASE_SPACING + totalLabelHeight;
        }

        function placeNodesV2(input) {
            const { nodes, connections, treeStructure, nodeWidths } = input;

            const nodePositions = new Map();

            const levelMaxWidths = [];
            treeStructure.levels.forEach((level, levelIndex) => {
                let maxWidth = 0;
                level.forEach(node => {
                    const width = nodeWidths.get(node.id) || 0;
                    maxWidth = Math.max(maxWidth, width);
                });
                levelMaxWidths[levelIndex] = maxWidth;
            });

            const levelSpacings = [];
            for (let i = 0; i < treeStructure.levels.length - 1; i++) {
                levelSpacings[i] = LAYOUT_CONSTANTS.MIN_LEVEL_SPACING;
            }

            const levelXPositions = [LAYOUT_CONSTANTS.LEFT_MARGIN];
            for (let i = 1; i < treeStructure.levels.length; i++) {
                const spacing = Math.max(levelSpacings[i - 1] || LAYOUT_CONSTANTS.MIN_LEVEL_SPACING, LAYOUT_CONSTANTS.MIN_LEVEL_SPACING);
                levelXPositions[i] = levelXPositions[i - 1] + levelMaxWidths[i - 1] + spacing + LAYOUT_CONSTANTS.EDGE_CLEARANCE;
            }

            treeStructure.levels.forEach((level, levelIndex) => {
                const levelX = levelXPositions[levelIndex];
                let currentY = LAYOUT_CONSTANTS.TOP_MARGIN;

                level.forEach(node => {
                    const width = nodeWidths.get(node.id) || 0;
                    const element = document.getElementById(node.id);
                    const height = element ? parseInt(element.getAttribute('data-height')) || LAYOUT_CONSTANTS.DEFAULT_NODE_HEIGHT : LAYOUT_CONSTANTS.DEFAULT_NODE_HEIGHT;

                    const parents = connections.filter(conn => conn.to === node.id).map(conn => conn.from);

                    if (parents.length > 0) {
                        let selectedParent = null;
                        let minResultY = Infinity;

                        for (const parentId of parents) {
                            if (nodePositions.has(parentId)) {
                                const parentPos = nodePositions.get(parentId);
                                const siblings = connections.filter(conn => conn.from === parentId).map(conn => conn.to);
                                const nodeSpacing = calculateNodeSpacingV2(node.id, connections);

                                let candidateY = parentPos.y;

                                siblings.forEach(siblingId => {
                                    if (siblingId !== node.id && nodePositions.has(siblingId)) {
                                        const siblingPos = nodePositions.get(siblingId);
                                        const siblingSpacing = calculateNodeSpacingV2(siblingId, connections);
                                        candidateY = Math.max(candidateY, siblingPos.y + siblingPos.height + siblingSpacing);
                                    }
                                });

                                candidateY = Math.max(candidateY, currentY);

                                if (candidateY < minResultY) {
                                    minResultY = candidateY;
                                    selectedParent = parentId;
                                }
                            }
                        }

                        if (selectedParent) {
                            const nodeSpacing = calculateNodeSpacingV2(node.id, connections);
                            nodePositions.set(node.id, { x: levelX, y: minResultY, width: width, height: height });
                            currentY = Math.max(currentY, minResultY + height + nodeSpacing);
                        } else {
                            const nodeSpacing = calculateNodeSpacingV2(node.id, connections);
                            nodePositions.set(node.id, { x: levelX, y: currentY, width: width, height: height });
                            currentY += height + nodeSpacing;
                        }
                    } else {
                        const nodeSpacing = calculateNodeSpacingV2(node.id, connections);
                        nodePositions.set(node.id, { x: levelX, y: currentY, width: width, height: height });
                        currentY += height + nodeSpacing;
                    }
                });
            });

            return {
                nodePositions,
                levelXPositions,
                levelMaxWidths
            };
        }
    `;
}

module.exports = {
    getNodePlacer
};
