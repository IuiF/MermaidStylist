function getLayoutEngine() {
    const nodePlacer = require('./node-placer').getNodePlacer();
    const collisionResolver = require('./collision-resolver').getCollisionResolver();

    return nodePlacer + collisionResolver + `
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

                window.layoutLevelInfo = {
                    levelXPositions: levelXPositions,
                    levelMaxWidths: levelMaxWidths,
                    levelCount: treeStructure.levels.length
                };

                console.log('[V2 Layout Engine] Layout calculation complete');

                return nodePositions;
            }
        };
    `;
}

module.exports = {
    getLayoutEngine
};
