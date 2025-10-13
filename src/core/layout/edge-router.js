const { EdgeRoute, Segment, Point } = require('./types');

const EDGE_CONSTANTS = {
    DEFAULT_VERTICAL_OFFSET: 50,
    CORNER_RADIUS: 10
};

function routeEdges(input) {
    const { nodePositions, connections, levelXPositions } = input;

    const edgeRoutes = new Map();

    connections.forEach(conn => {
        const fromPos = nodePositions.get(conn.from);
        const toPos = nodePositions.get(conn.to);

        if (!fromPos || !toPos) {
            return;
        }

        const x1 = fromPos.x + fromPos.width;
        const y1 = fromPos.y + fromPos.height / 2;
        const x2 = toPos.x;
        const y2 = toPos.y + toPos.height / 2;

        if (y1 === y2) {
            const segments = [
                new Segment('horizontal', new Point(x1, y1), new Point(x2, y2))
            ];
            const arrowPoint = new Point(x2, y2);
            edgeRoutes.set(createEdgeKey(conn.from, conn.to), new EdgeRoute(segments, arrowPoint));
        } else {
            const verticalSegmentX = x1 + EDGE_CONSTANTS.DEFAULT_VERTICAL_OFFSET;

            const segments = [
                new Segment('horizontal', new Point(x1, y1), new Point(verticalSegmentX, y1)),
                new Segment('vertical', new Point(verticalSegmentX, y1), new Point(verticalSegmentX, y2)),
                new Segment('horizontal', new Point(verticalSegmentX, y2), new Point(x2, y2))
            ];

            const arrowPoint = new Point(x2, y2);
            edgeRoutes.set(createEdgeKey(conn.from, conn.to), new EdgeRoute(segments, arrowPoint));
        }
    });

    return edgeRoutes;
}

function createEdgeKey(from, to) {
    return `${from}->${to}`;
}

module.exports = {
    routeEdges,
    createEdgeKey,
    EDGE_CONSTANTS
};
