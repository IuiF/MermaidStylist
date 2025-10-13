function getEdgeRouter() {
    return `
        const EDGE_CONSTANTS = {
            DEFAULT_VERTICAL_OFFSET: 50,
            CORNER_RADIUS: 10
        };

        function createEdgeKey(from, to) {
            return from + '->' + to;
        }

        /**
         * ノードの階層（depth）を計算
         * @param {Array} connections - 接続情報の配列
         * @returns {Map} ノードIDをキーとした階層マップ
         */
        function calculateNodeDepths(connections) {
            const nodeDepths = new Map();
            const allNodeIds = new Set([...connections.map(c => c.from), ...connections.map(c => c.to)]);
            const childNodeIds = new Set(connections.map(c => c.to));
            const rootNodeIds = [...allNodeIds].filter(id => !childNodeIds.has(id));

            const childrenMap = new Map();
            connections.forEach(conn => {
                if (!childrenMap.has(conn.from)) {
                    childrenMap.set(conn.from, []);
                }
                childrenMap.get(conn.from).push(conn.to);
            });

            const queue = [];
            rootNodeIds.forEach(rootId => {
                nodeDepths.set(rootId, 0);
                queue.push(rootId);
            });

            const maxIterations = allNodeIds.size * allNodeIds.size;
            let processed = 0;

            while (queue.length > 0 && processed < maxIterations) {
                const currentId = queue.shift();
                processed++;
                const currentDepth = nodeDepths.get(currentId);
                const children = childrenMap.get(currentId) || [];

                for (const childId of children) {
                    const newDepth = currentDepth + 1;
                    const existingDepth = nodeDepths.get(childId);

                    if (existingDepth === undefined || newDepth > existingDepth) {
                        nodeDepths.set(childId, newDepth);
                        queue.push(childId);
                    }
                }
            }

            return nodeDepths;
        }

        /**
         * 接続の深さを計算（from→toのレベル差）
         * @param {Object} conn - 接続情報
         * @param {Map} nodeDepths - ノードの深さマップ
         * @returns {number} 深さ（レベル差）
         */
        function calculateConnectionDepth(conn, nodeDepths) {
            const fromDepth = nodeDepths.get(conn.from) || 0;
            const toDepth = nodeDepths.get(conn.to) || 0;
            return toDepth - fromDepth;
        }

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
    `;
}

module.exports = {
    getEdgeRouter
};
