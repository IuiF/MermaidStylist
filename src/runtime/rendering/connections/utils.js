function getConnectionUtils() {
    return `
        // エッジ処理に関する汎用ユーティリティ関数

        const connectionUtils = {
            /**
             * ノードの階層（depth）を計算
             * @param {Array} connections - 接続情報の配列
             * @returns {Object} ノードIDをキーとした階層マップ
             */
            calculateNodeDepths: function(connections) {
                const nodeDepths = {};
                const allNodeIds = new Set([...connections.map(c => c.from), ...connections.map(c => c.to)]);
                const childNodeIds = new Set(connections.map(c => c.to));
                const rootNodeIds = [...allNodeIds].filter(id => !childNodeIds.has(id));

                // 子ノードマップを事前作成（O(E)）
                const childrenMap = {};
                connections.forEach(conn => {
                    if (!childrenMap[conn.from]) {
                        childrenMap[conn.from] = [];
                    }
                    childrenMap[conn.from].push(conn.to);
                });

                // ルートノードをレベル0として開始
                const queue = [];
                rootNodeIds.forEach(rootId => {
                    nodeDepths[rootId] = 0;
                    queue.push(rootId);
                });

                // BFSで階層を計算（複数回訪問を許可し、より浅い階層を採用）
                let processed = 0;
                const maxIterations = allNodeIds.size * allNodeIds.size;

                while (queue.length > 0 && processed < maxIterations) {
                    const currentId = queue.shift();
                    processed++;
                    const currentDepth = nodeDepths[currentId];
                    const children = childrenMap[currentId] || [];

                    for (const childId of children) {
                        const newDepth = currentDepth + 1;
                        const existingDepth = nodeDepths[childId];

                        // より浅い階層が見つかった場合、または未設定の場合は更新
                        if (existingDepth === undefined || newDepth < existingDepth) {
                            nodeDepths[childId] = newDepth;
                            queue.push(childId);
                        }
                    }
                }

                return nodeDepths;
            },

            /**
             * 親ごとに接続をグループ化してY座標でソート
             * @param {Array} connections - 接続情報の配列
             * @returns {Object} 親IDをキーとした接続配列のマップ
             */
            sortConnectionsByParent: function(connections) {
                const connectionsByParent = {};
                connections.forEach(conn => {
                    if (!connectionsByParent[conn.from]) {
                        connectionsByParent[conn.from] = [];
                    }
                    connectionsByParent[conn.from].push(conn);
                });

                Object.keys(connectionsByParent).forEach(parentId => {
                    connectionsByParent[parentId].sort((a, b) => {
                        const aElement = svgHelpers.getNodeElement(a.to);
                        const bElement = svgHelpers.getNodeElement(b.to);
                        if (!aElement || !bElement) return 0;
                        const aPos = svgHelpers.getNodePosition(aElement);
                        const bPos = svgHelpers.getNodePosition(bElement);
                        return aPos.top - bPos.top;
                    });
                });

                return connectionsByParent;
            },

            /**
             * 親ノードのY座標マップを作成
             * @param {Array} edgeInfos - エッジ情報の配列
             * @returns {Object} 親IDをキーとしたY座標のマップ
             */
            calculateParentYPositions: function(edgeInfos) {
                const parentYPositions = {};
                edgeInfos.forEach(info => {
                    if (!parentYPositions[info.conn.from]) {
                        const fromElement = svgHelpers.getNodeElement(info.conn.from);
                        if (fromElement) {
                            const pos = svgHelpers.getNodePosition(fromElement);
                            parentYPositions[info.conn.from] = pos.top;
                        }
                    }
                });
                return parentYPositions;
            },

            /**
             * 親ノードをdepthごとにグループ化
             * @param {Array} edgeInfos - エッジ情報の配列
             * @param {Array|Object} parentIds - 親ノードIDの配列、またはキーが親IDのオブジェクト
             * @returns {Object} depth -> [parentId...]のマップ
             */
            groupParentsByDepth: function(edgeInfos, parentIds) {
                const parentsByDepth = {};
                const parentIdArray = Array.isArray(parentIds) ? parentIds : Object.keys(parentIds);

                parentIdArray.forEach(parentId => {
                    const firstEdge = edgeInfos.find(e => e.conn.from === parentId && !e.is1to1Horizontal);
                    if (!firstEdge) return;

                    const depth = firstEdge.depth;
                    if (!parentsByDepth[depth]) {
                        parentsByDepth[depth] = [];
                    }
                    parentsByDepth[depth].push(parentId);
                });

                return parentsByDepth;
            },

            /**
             * エッジキーを生成
             * @param {string} fromId - 開始ノードID
             * @param {string} toId - 終了ノードID
             * @returns {string} エッジキー
             */
            createEdgeKey: function(fromId, toId) {
                return fromId + '->' + toId;
            }
        };
    `;
}

module.exports = {
    getConnectionUtils
};
