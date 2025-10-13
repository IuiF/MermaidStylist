const COLLISION_CONSTANTS = {
    COLLISION_MARGIN: 20,
    BASE_SPACING: 60,
    MAX_ITERATIONS: 5,
    ESTIMATED_LABEL_HEIGHT: 20,
    LABEL_VERTICAL_SPACING: 10,
    LABEL_TOP_MARGIN: 5,
    ESTIMATED_LABEL_WIDTH: 100
};

function calculateNodeSpacing(nodeId, connections) {
    const childConnections = connections.filter(conn => conn.from === nodeId);
    if (childConnections.length > 0) {
        return COLLISION_CONSTANTS.BASE_SPACING;
    }
    return COLLISION_CONSTANTS.BASE_SPACING / 2;
}

function resolveDashedNodeEdgeCollisions(nodePositions, connections, treeStructure, dashedNodes) {
    const maxIterations = COLLISION_CONSTANTS.MAX_ITERATIONS;
    const collisionMargin = COLLISION_CONSTANTS.COLLISION_MARGIN;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
        let hasCollision = false;

        treeStructure.levels.forEach((level, levelIndex) => {
            level.forEach(node => {
                if (!dashedNodes.has(node.id)) return;

                const nodePos = nodePositions.get(node.id);
                if (!nodePos) return;

                connections.forEach(conn => {
                    if (conn.isDashed) return;

                    const fromPos = nodePositions.get(conn.from);
                    const toPos = nodePositions.get(conn.to);

                    if (!fromPos || !toPos) return;

                    let fromLevel = -1, toLevel = -1;
                    treeStructure.levels.forEach((lvl, idx) => {
                        if (lvl.some(n => n.id === conn.from)) fromLevel = idx;
                        if (lvl.some(n => n.id === conn.to)) toLevel = idx;
                    });

                    if (fromLevel === -1 || toLevel === -1 || fromLevel >= levelIndex || toLevel <= levelIndex) return;

                    const levelSpan = toLevel - fromLevel;
                    if (levelSpan >= 3) return;

                    const edgeMinY = Math.min(fromPos.y, toPos.y);
                    const edgeMaxY = Math.max(fromPos.y + fromPos.height, toPos.y + toPos.height);

                    const verticalLineMinX = fromPos.x + fromPos.width;
                    const verticalLineMaxX = toPos.x;

                    const nodeTop = nodePos.y - collisionMargin;
                    const nodeBottom = nodePos.y + nodePos.height + collisionMargin;
                    const yOverlap = nodeTop < edgeMaxY && nodeBottom > edgeMinY;

                    const nodeLeft = nodePos.x - collisionMargin;
                    const nodeRight = nodePos.x + nodePos.width + collisionMargin;
                    const xOverlap = !(verticalLineMaxX < nodeLeft || verticalLineMinX > nodeRight);

                    if (yOverlap && xOverlap) {
                        const shiftAmount = edgeMaxY - nodeTop + COLLISION_CONSTANTS.BASE_SPACING;
                        nodePos.y += shiftAmount;
                        hasCollision = true;
                    }
                });
            });
        });

        if (!hasCollision) break;
    }
}

function resolveSameLevelCollisions(nodePositions, connections, treeStructure) {
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
            const nodeSpacing = calculateNodeSpacing(next.node.id, connections);

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

function resolveNodeLabelCollisions(nodePositions, connections, treeStructure) {
    const maxIterations = COLLISION_CONSTANTS.MAX_ITERATIONS;
    const collisionMargin = 5;
    const estimatedLabelHeight = COLLISION_CONSTANTS.ESTIMATED_LABEL_HEIGHT;
    const labelVerticalSpacing = COLLISION_CONSTANTS.LABEL_VERTICAL_SPACING;
    const labelTopMargin = COLLISION_CONSTANTS.LABEL_TOP_MARGIN;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
        let hasCollision = false;

        const labelCountByTarget = {};
        connections.forEach(conn => {
            if (conn.label && !conn.isDashed) {
                if (!labelCountByTarget[conn.to]) {
                    labelCountByTarget[conn.to] = 0;
                }
                labelCountByTarget[conn.to]++;
            }
        });

        const predictedLabelBounds = [];
        const labelOffsets = {};

        connections.forEach(conn => {
            if (!conn.label || conn.isDashed) return;

            const toPos = nodePositions.get(conn.to);
            if (!toPos) return;

            if (!labelOffsets[conn.to]) {
                labelOffsets[conn.to] = 0;
            }
            const offset = labelOffsets[conn.to];
            labelOffsets[conn.to]++;

            const labelLeft = toPos.x;
            const labelTop = toPos.y - estimatedLabelHeight - labelTopMargin - (offset * (estimatedLabelHeight + labelVerticalSpacing));
            const labelWidth = COLLISION_CONSTANTS.ESTIMATED_LABEL_WIDTH;
            const labelHeight = estimatedLabelHeight;

            predictedLabelBounds.push({
                from: conn.from,
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

                const nodeLeft = nodePos.x;
                const nodeTop = nodePos.y;
                const nodeRight = nodePos.x + nodePos.width;
                const nodeBottom = nodePos.y + nodePos.height;

                predictedLabelBounds.forEach(label => {
                    if (label.to === node.id) return;

                    const xOverlap = !(nodeRight + collisionMargin < label.left || nodeLeft - collisionMargin > label.right);
                    const yOverlap = !(nodeBottom + collisionMargin < label.top || nodeTop - collisionMargin > label.bottom);

                    if (xOverlap && yOverlap) {
                        const shiftAmount = label.bottom + collisionMargin - nodeTop + COLLISION_CONSTANTS.BASE_SPACING;
                        nodePos.y += shiftAmount;
                        hasCollision = true;
                    }
                });
            });
        });

        if (!hasCollision) break;
    }
}

function resolveCollisions(input) {
    const { nodePositions, connections, treeStructure, dashedNodes } = input;

    resolveDashedNodeEdgeCollisions(nodePositions, connections, treeStructure, dashedNodes);
    resolveSameLevelCollisions(nodePositions, connections, treeStructure);
    resolveNodeLabelCollisions(nodePositions, connections, treeStructure);

    return nodePositions;
}

module.exports = {
    resolveCollisions,
    COLLISION_CONSTANTS
};
