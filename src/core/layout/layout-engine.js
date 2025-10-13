const { LayoutResult, LayoutMetadata } = require('./types');
const { placeNodes } = require('./node-placer');
const { routeEdges } = require('./edge-router');
const { resolveCollisions } = require('./collision-resolver');

function calculateLayout(input) {
    const { nodes, connections, treeStructure, nodeWidths, dashedNodes = new Set() } = input;

    const placementResult = placeNodes({
        nodes,
        connections,
        treeStructure,
        nodeWidths
    });

    let nodePositions = placementResult.nodePositions;
    const levelXPositions = placementResult.levelXPositions;
    const levelMaxWidths = placementResult.levelMaxWidths;

    nodePositions = resolveCollisions({
        nodePositions,
        connections,
        treeStructure,
        dashedNodes
    });

    const edgeRoutes = routeEdges({
        nodePositions,
        connections,
        levelXPositions
    });

    const labelPositions = calculateLabelPositions(edgeRoutes, nodePositions, connections);

    const metadata = new LayoutMetadata(
        levelXPositions,
        levelMaxWidths,
        treeStructure.levels.length
    );

    return new LayoutResult(nodePositions, edgeRoutes, labelPositions, metadata);
}

function calculateLabelPositions(edgeRoutes, nodePositions, connections) {
    const labelPositions = new Map();

    return labelPositions;
}

module.exports = {
    calculateLayout
};
