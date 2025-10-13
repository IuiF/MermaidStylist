const { NodeRect } = require('./types');

const LAYOUT_CONSTANTS = {
    LEFT_MARGIN: 50,
    TOP_MARGIN: 50,
    BASE_SPACING: 60,
    EDGE_CLEARANCE: 80,
    MIN_LEVEL_SPACING: 200
};

function calculateLevelSpacing(fromLevel, toLevel, connections, fromLevelIndex, toLevelIndex, allLevels) {
    return LAYOUT_CONSTANTS.MIN_LEVEL_SPACING;
}

function calculateNodeSpacing(nodeId, connections, isDashed) {
    const childConnections = connections.filter(conn => conn.from === nodeId);
    if (childConnections.length > 0) {
        return LAYOUT_CONSTANTS.BASE_SPACING;
    }
    return LAYOUT_CONSTANTS.BASE_SPACING / 2;
}

function placeNodes(input) {
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
        const fromLevel = treeStructure.levels[i];
        const toLevel = treeStructure.levels[i + 1];
        levelSpacings[i] = calculateLevelSpacing(fromLevel, toLevel, connections, i, i + 1, treeStructure.levels);
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
            const height = 50;

            const parents = connections.filter(conn => conn.to === node.id).map(conn => conn.from);

            if (parents.length > 0) {
                let selectedParent = null;
                let minResultY = Infinity;

                for (const parentId of parents) {
                    if (nodePositions.has(parentId)) {
                        const parentPos = nodePositions.get(parentId);
                        const siblings = connections.filter(conn => conn.from === parentId).map(conn => conn.to);
                        const nodeSpacing = calculateNodeSpacing(node.id, connections, false);

                        let candidateY = parentPos.y;

                        siblings.forEach(siblingId => {
                            if (siblingId !== node.id && nodePositions.has(siblingId)) {
                                const siblingPos = nodePositions.get(siblingId);
                                const siblingSpacing = calculateNodeSpacing(siblingId, connections, false);
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
                    const nodeSpacing = calculateNodeSpacing(node.id, connections, false);
                    nodePositions.set(node.id, new NodeRect(levelX, minResultY, width, height));
                    currentY = Math.max(currentY, minResultY + height + nodeSpacing);
                } else {
                    const nodeSpacing = calculateNodeSpacing(node.id, connections, false);
                    nodePositions.set(node.id, new NodeRect(levelX, currentY, width, height));
                    currentY += height + nodeSpacing;
                }
            } else {
                const nodeSpacing = calculateNodeSpacing(node.id, connections, false);
                nodePositions.set(node.id, new NodeRect(levelX, currentY, width, height));
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

module.exports = {
    placeNodes,
    LAYOUT_CONSTANTS
};
