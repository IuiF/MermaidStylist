function getLayoutEngine() {
    const types = require('./types').getTypes();
    const nodePlacer = require('./node-placer').getNodePlacer();
    const collisionResolver = require('./collision-resolver').getCollisionResolver();
    const edgeRouter = require('./edge-router').getEdgeRouter();

    return types + nodePlacer + collisionResolver + edgeRouter + `
        const v2LayoutEngine = {
            calculateLayout: function(input) {
                console.log('[V2 Layout Engine] Starting layout calculation');

                const { nodes, connections, treeStructure, nodeWidths, dashedNodes = new Set() } = input;

                const placementResult = placeNodesV2({
                    nodes,
                    connections,
                    treeStructure,
                    nodeWidths
                });

                let nodePositions = placementResult.nodePositions;
                const levelXPositions = placementResult.levelXPositions;
                const levelMaxWidths = placementResult.levelMaxWidths;

                nodePositions = resolveCollisionsV2({
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

                const labelPositions = new Map();

                const metadata = new LayoutMetadata(
                    levelXPositions,
                    levelMaxWidths,
                    treeStructure.levels.length
                );

                window.layoutLevelInfo = {
                    levelXPositions: levelXPositions,
                    levelMaxWidths: levelMaxWidths,
                    levelCount: treeStructure.levels.length
                };

                console.log('[V2 Layout Engine] Layout calculation complete');

                const layoutResult = new LayoutResult(nodePositions, edgeRoutes, labelPositions, metadata);
                return layoutResult;
            }
        };
    `;
}

module.exports = {
    getLayoutEngine
};
