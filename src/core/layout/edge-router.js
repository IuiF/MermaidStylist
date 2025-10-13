function getEdgeRouter() {
    return `
        const EDGE_CONSTANTS = {
            DEFAULT_VERTICAL_OFFSET: 50,
            CORNER_RADIUS: 10,
            MIN_OFFSET: 20,
            EDGE_SPACING: 30,
            CLUSTER_X_THRESHOLD: 200
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

        /**
         * 階層ごとの親の右端と子の左端を計算
         * @param {Map} nodePositions - ノード位置マップ
         * @param {Array} connections - 接続配列
         * @param {Map} nodeDepths - ノードの深さマップ
         * @param {Array} levelXPositions - 階層のX座標配列
         * @param {Array} levelMaxWidths - 階層の最大幅配列
         * @returns {Object} depthMaxParentRightとdepthMinChildLeftのオブジェクト
         */
        function calculateDepthBounds(nodePositions, connections, nodeDepths, levelXPositions, levelMaxWidths) {
            const depthMaxParentRight = new Map();
            const depthMinChildLeft = new Map();

            connections.forEach(conn => {
                const fromPos = nodePositions.get(conn.from);
                const toPos = nodePositions.get(conn.to);
                if (!fromPos || !toPos) return;

                const fromDepth = nodeDepths.get(conn.from) || 0;
                const x1 = fromPos.x + fromPos.width;
                const x2 = toPos.x;

                // 階層情報がある場合は使用
                if (levelXPositions && levelXPositions[fromDepth] !== undefined &&
                    levelMaxWidths && levelMaxWidths[fromDepth] !== undefined) {
                    const levelMaxRight = levelXPositions[fromDepth] + levelMaxWidths[fromDepth];
                    if (!depthMaxParentRight.has(fromDepth) || levelMaxRight > depthMaxParentRight.get(fromDepth)) {
                        depthMaxParentRight.set(fromDepth, levelMaxRight);
                    }
                } else {
                    if (!depthMaxParentRight.has(fromDepth) || x1 > depthMaxParentRight.get(fromDepth)) {
                        depthMaxParentRight.set(fromDepth, x1);
                    }
                }

                // 次の階層の左端
                const nextDepth = fromDepth + 1;
                if (levelXPositions && levelXPositions[nextDepth] !== undefined) {
                    if (!depthMinChildLeft.has(fromDepth) || levelXPositions[nextDepth] < depthMinChildLeft.get(fromDepth)) {
                        depthMinChildLeft.set(fromDepth, levelXPositions[nextDepth]);
                    }
                } else {
                    if (!depthMinChildLeft.has(fromDepth) || x2 < depthMinChildLeft.get(fromDepth)) {
                        depthMinChildLeft.set(fromDepth, x2);
                    }
                }
            });

            return { depthMaxParentRight, depthMinChildLeft };
        }

        /**
         * 親ノードをdepthごとにグループ化
         * @param {Array} connections - 接続配列
         * @param {Map} nodeDepths - ノードの深さマップ
         * @returns {Map} depth -> [parentId...]のマップ
         */
        function groupParentsByDepth(connections, nodeDepths) {
            const parentsByDepth = new Map();
            const seenParents = new Set();

            connections.forEach(conn => {
                if (seenParents.has(conn.from)) return;
                seenParents.add(conn.from);

                const depth = nodeDepths.get(conn.from) || 0;
                if (!parentsByDepth.has(depth)) {
                    parentsByDepth.set(depth, []);
                }
                parentsByDepth.get(depth).push(conn.from);
            });

            return parentsByDepth;
        }

        /**
         * 各depthを通過する全エッジ数をカウント
         * @param {Array} connections - 接続配列
         * @param {Map} nodeDepths - ノードの深さマップ
         * @returns {Map} depth -> 通過エッジ数のマップ
         */
        function countEdgesPassingThroughDepth(connections, nodeDepths) {
            const edgesPassingThrough = new Map();

            connections.forEach(conn => {
                const fromDepth = nodeDepths.get(conn.from) || 0;
                const toDepth = nodeDepths.get(conn.to) || 0;

                // エッジが通過する各depthをカウント
                for (let d = fromDepth; d < toDepth; d++) {
                    edgesPassingThrough.set(d, (edgesPassingThrough.get(d) || 0) + 1);
                }
            });

            return edgesPassingThrough;
        }

        /**
         * 等間隔配置のX座標を計算
         * @param {Array} parentInfos - 親ノード情報配列 [{parentId, yPosition, x1, x2}]
         * @param {number} totalEdges - この階層を通過する全エッジ数
         * @param {number} maxParentRight - 親ノード群の最大右端X座標
         * @param {number} minChildLeft - 子ノード群の最小左端X座標
         * @returns {Map} parentId -> X座標のマップ
         */
        function calculateEvenSpacing(parentInfos, totalEdges, maxParentRight, minChildLeft) {
            const result = new Map();

            // Y座標でソート
            parentInfos.sort((a, b) => a.yPosition - b.yPosition);

            const totalParents = parentInfos.length;
            const rawAvailableWidth = minChildLeft - maxParentRight - EDGE_CONSTANTS.MIN_OFFSET * 2;

            // 有効なレーン数は親ノード数とエッジ数の大きい方
            const effectiveLaneCount = Math.max(totalParents, totalEdges);
            const laneSpacing = Math.max(EDGE_CONSTANTS.EDGE_SPACING, rawAvailableWidth / (effectiveLaneCount + 1));

            // 中央配置計算
            const centerX = (maxParentRight + minChildLeft) / 2;
            const totalWidth = laneSpacing * totalParents;
            const startX = centerX - totalWidth / 2;

            // 各親に等間隔でX座標を割り当て
            parentInfos.forEach((parent, index) => {
                let x = startX + (index + 0.5) * laneSpacing;

                // 垂直セグメントX座標は親ノードの右端より右側にある必要がある
                const minX = parent.x1 + EDGE_CONSTANTS.MIN_OFFSET;
                if (x < minX) {
                    x = minX;
                }

                result.set(parent.parentId, x);
            });

            return result;
        }

        /**
         * 親ノードをX座標でクラスタリング
         * X座標が大きく離れているノードを別クラスタに分離
         * @param {Array} parentInfos - 親ノード情報配列
         * @returns {Array<Array>} クラスタの配列
         */
        function clusterParentsByXPosition(parentInfos) {
            if (parentInfos.length === 0) return [];
            if (parentInfos.length === 1) return [parentInfos];

            // X座標でソート
            const sorted = [...parentInfos].sort((a, b) => a.x1 - b.x1);

            const clusters = [];
            let currentCluster = [sorted[0]];

            // X座標の差が大きい箇所で分割
            for (let i = 1; i < sorted.length; i++) {
                const gap = sorted[i].x1 - sorted[i - 1].x1;

                if (gap > EDGE_CONSTANTS.CLUSTER_X_THRESHOLD) {
                    // 大きなギャップ → 新しいクラスタを開始
                    clusters.push(currentCluster);
                    currentCluster = [sorted[i]];
                } else {
                    // 同じクラスタに追加
                    currentCluster.push(sorted[i]);
                }
            }

            // 最後のクラスタを追加
            clusters.push(currentCluster);

            return clusters;
        }

        /**
         * 親ごとの垂直セグメントX座標を計算
         * @param {Map} nodePositions - ノード位置マップ
         * @param {Array} connections - 接続配列
         * @param {Map} nodeDepths - ノードの深さマップ
         * @param {Array} levelXPositions - 階層のX座標配列
         * @param {Array} levelMaxWidths - 階層の最大幅配列
         * @returns {Map} parentId -> 垂直セグメントX座標のマップ
         */
        function calculateVerticalSegmentX(nodePositions, connections, nodeDepths, levelXPositions, levelMaxWidths) {
            const result = new Map();

            // 深さ境界を計算
            const { depthMaxParentRight, depthMinChildLeft } = calculateDepthBounds(
                nodePositions, connections, nodeDepths, levelXPositions, levelMaxWidths
            );

            // 通過エッジ数をカウント
            const edgesPassingThrough = countEdgesPassingThroughDepth(connections, nodeDepths);

            // 親をdepthごとにグループ化
            const parentsByDepth = groupParentsByDepth(connections, nodeDepths);

            // 各depthの親情報を構築
            parentsByDepth.forEach((parentIds, depth) => {
                const parentInfos = parentIds.map(parentId => {
                    const pos = nodePositions.get(parentId);
                    return {
                        parentId: parentId,
                        yPosition: pos.y + pos.height / 2,
                        x1: pos.x + pos.width,
                        x2: pos.x
                    };
                });

                // X座標でクラスタリング
                const clusters = clusterParentsByXPosition(parentInfos);

                // 各クラスタごとに配置を計算
                clusters.forEach(cluster => {
                    // クラスタ内の最大右端
                    const clusterMaxRight = Math.max(...cluster.map(p => p.x1));

                    // クラスタ内の親から出ている全エッジの子ノードの最小左端
                    const clusterChildXs = [];
                    cluster.forEach(p => {
                        connections.forEach(conn => {
                            if (conn.from === p.parentId) {
                                const childPos = nodePositions.get(conn.to);
                                if (childPos) {
                                    clusterChildXs.push(childPos.x);
                                }
                            }
                        });
                    });
                    const clusterMinLeft = clusterChildXs.length > 0 ? Math.min(...clusterChildXs) : depthMinChildLeft.get(depth);

                    // 通過エッジ数
                    const totalEdges = edgesPassingThrough.get(depth) || cluster.length;

                    // 等間隔配置を計算
                    const spacing = calculateEvenSpacing(cluster, totalEdges, clusterMaxRight, clusterMinLeft);

                    // 結果にマージ
                    spacing.forEach((x, parentId) => {
                        result.set(parentId, x);
                    });
                });
            });

            return result;
        }

        function routeEdges(input) {
            const { nodePositions, connections, levelXPositions, levelMaxWidths } = input;

            const edgeRoutes = new Map();

            // ノード深さを計算
            const nodeDepths = calculateNodeDepths(connections);

            // 親ごとの垂直セグメントX座標を計算
            const verticalSegmentXByParent = calculateVerticalSegmentX(
                nodePositions, connections, nodeDepths, levelXPositions, levelMaxWidths
            );

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
                    // 水平エッジ
                    const segments = [
                        new Segment('horizontal', new Point(x1, y1), new Point(x2, y2))
                    ];
                    const arrowPoint = new Point(x2, y2);
                    edgeRoutes.set(createEdgeKey(conn.from, conn.to), new EdgeRoute(segments, arrowPoint));
                } else {
                    // 垂直セグメントを含むエッジ
                    let verticalSegmentX = verticalSegmentXByParent.get(conn.from);

                    // 垂直セグメントX座標が計算されていない場合はフォールバック
                    if (verticalSegmentX === undefined) {
                        verticalSegmentX = x1 + EDGE_CONSTANTS.DEFAULT_VERTICAL_OFFSET;
                    }

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
