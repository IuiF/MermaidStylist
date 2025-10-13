function getCollisionUtils() {
    return `
        // 衝突検出と回避計算モジュール

        const COLLISION_UTILS_CONSTANTS = {
            SECOND_VERTICAL_DISTANCE_RATIO: 0.6    // 2本目の垂直セグメント配置距離の係数
        };

        const collisionUtils = {
            /**
             * 2つの矩形範囲が重なるかチェック
             * @param {Object} rect1 - 矩形1
             * @param {Object} rect2 - 矩形2
             * @returns {boolean} 重なっているかどうか
             */
            checkRectOverlap: function(rect1, rect2) {
                const xOverlap = !(rect1.right < rect2.left || rect1.left > rect2.right);
                const yOverlap = !(rect1.bottom < rect2.top || rect1.top > rect2.bottom);
                return xOverlap && yOverlap;
            },

            /**
             * 垂直線と交差するオブジェクトを検出
             * @param {number} x - 垂直線のX座標
             * @param {number} y1 - 開始Y座標
             * @param {number} y2 - 終了Y座標
             * @param {Array} objects - オブジェクトの配列
             * @param {number} padding - パディング
             * @returns {Array} 交差するオブジェクトの配列
             */
            findVerticalLineIntersections: function(x, y1, y2, objects, padding) {
                const yMin = Math.min(y1, y2);
                const yMax = Math.max(y1, y2);
                const lineRect = {
                    left: x - padding,
                    right: x + padding,
                    top: yMin - padding,
                    bottom: yMax + padding
                };

                return objects.filter(obj => this.checkRectOverlap(lineRect, obj));
            },

            /**
             * 水平線と交差するオブジェクトを検出
             * @param {number} x1 - 開始X座標
             * @param {number} x2 - 終了X座標
             * @param {number} y - 水平線のY座標
             * @param {Array} objects - オブジェクトの配列
             * @param {number} padding - パディング
             * @returns {Array} 交差するオブジェクトの配列
             */
            findHorizontalLineIntersections: function(x1, x2, y, objects, padding) {
                const xMin = Math.min(x1, x2);
                const xMax = Math.max(x1, x2);
                const lineRect = {
                    left: xMin - padding,
                    right: xMax + padding,
                    top: y - padding,
                    bottom: y + padding
                };

                return objects.filter(obj => this.checkRectOverlap(lineRect, obj));
            },

            /**
             * エッジの経路全体でノードとの衝突をチェック
             * @param {number} x1 - 開始X座標
             * @param {number} y1 - 開始Y座標
             * @param {number} x2 - 終了X座標
             * @param {number} y2 - 終了Y座標
             * @param {Array} nodeBounds - ノードのバウンディングボックス配列
             * @returns {Array} 衝突するノードの配列
             */
            checkEdgePathIntersectsNodes: function(x1, y1, x2, y2, nodeBounds) {
                const padding = CONNECTION_CONSTANTS.COLLISION_PADDING_NODE;
                const pathRect = {
                    left: Math.min(x1, x2) - padding,
                    right: Math.max(x1, x2) + padding,
                    top: Math.min(y1, y2) - padding,
                    bottom: Math.max(y1, y2) + padding
                };

                return nodeBounds.filter(node => this.checkRectOverlap(pathRect, node));
            },

            /**
             * 垂直線の衝突回避オフセットを計算
             * @param {number} x - 垂直線のX座標
             * @param {number} y1 - 開始Y座標
             * @param {number} y2 - 終了Y座標
             * @param {Array} objects - オブジェクトの配列
             * @param {number} padding - パディング
             * @param {string} edgeFrom - 開始ノードID
             * @param {string} edgeTo - 終了ノードID
             * @param {string} objectType - オブジェクトタイプ
             * @returns {number} オフセット値
             */
            calculateVerticalAvoidanceOffset: function(x, y1, y2, objects, padding, edgeFrom, edgeTo, objectType) {
                const intersections = this.findVerticalLineIntersections(x, y1, y2, objects, padding);

                if (intersections.length === 0) return 0;

                const maxRight = Math.max(...intersections.map(obj => obj.right));
                const offset = maxRight + padding - x;

                if (window.DEBUG_CONNECTIONS) {
                    const ids = intersections.map(obj => obj.id || 'label').join(',');
                    console.log(objectType + ' collision: edge=' + edgeFrom + '->' + edgeTo +
                        ', intersecting=' + ids + ', offset=' + offset);
                }

                return offset;
            },

            /**
             * ノードを避けるためのX座標オフセットを計算
             * @param {number} x - X座標
             * @param {number} y1 - 開始Y座標
             * @param {number} y2 - 終了Y座標
             * @param {Array} nodeBounds - ノードのバウンディングボックス配列
             * @param {string} edgeFrom - 開始ノードID
             * @param {string} edgeTo - 終了ノードID
             * @returns {number} オフセット値
             */
            calculateNodeAvoidanceOffset: function(x, y1, y2, nodeBounds, edgeFrom, edgeTo) {
                return this.calculateVerticalAvoidanceOffset(
                    x, y1, y2, nodeBounds,
                    CONNECTION_CONSTANTS.COLLISION_PADDING_NODE,
                    edgeFrom, edgeTo, 'Node'
                );
            },

            /**
             * ラベルを避けるためのX座標オフセットを計算
             * @param {number} x - X座標
             * @param {number} y1 - 開始Y座標
             * @param {number} y2 - 終了Y座標
             * @param {Array} labelBounds - ラベルのバウンディングボックス配列
             * @param {string} edgeFrom - 開始ノードID
             * @param {string} edgeTo - 終了ノードID
             * @returns {number} オフセット値
             */
            calculateLabelAvoidanceOffset: function(x, y1, y2, labelBounds, edgeFrom, edgeTo) {
                return this.calculateVerticalAvoidanceOffset(
                    x, y1, y2, labelBounds,
                    CONNECTION_CONSTANTS.COLLISION_PADDING_LABEL,
                    edgeFrom, edgeTo, 'Label'
                );
            },

            /**
             * 衝突回避が必要なエッジの2本目の垂直セグメントX座標を計算
             * 異なる親から出ているエッジは異なるX座標で折れる（親階層右端と子階層左端の間で等分）
             * @param {Array} edgeInfos - エッジ情報配列
             * @param {Object} edgeToYAdjustment - エッジキー -> Y調整情報のマップ
             * @param {Object} edgeToFinalVerticalX - エッジキー -> 最終垂直X座標のマップ
             * @param {Object} parentFinalVerticalSegmentX - 親ID -> 垂直セグメントX座標のマップ
             * @param {Object} nodeDepthMap - ノードID -> depth のマップ
             * @param {Object} parentYPositions - 親ID -> Y座標のマップ
             * @param {Object} depthMaxParentRight - 階層 -> 親ノードの最大右端X座標のマップ
             * @param {Object} depthMinChildLeft - 階層 -> 子ノードの最小左端X座標のマップ
             * @returns {Object} エッジキー -> 2本目の垂直セグメントX座標のマップ
             */
            calculateSecondVerticalSegmentX: function(edgeInfos, edgeToYAdjustment, edgeToFinalVerticalX, parentFinalVerticalSegmentX, nodeDepthMap, parentYPositions, depthMaxParentRight, depthMinChildLeft) {
                const edgeToSecondVerticalX = {};

                // 衝突回避が必要なエッジのみを抽出
                const collisionEdges = [];
                edgeInfos.forEach(info => {
                    if (info.is1to1Horizontal) return;

                    const edgeKey = info.conn.from + '->' + info.conn.to;
                    if (edgeToYAdjustment[edgeKey] && edgeToYAdjustment[edgeKey].needsAdjustment) {
                        const verticalSegmentX = parentFinalVerticalSegmentX[info.conn.from] || info.x1 + CONNECTION_CONSTANTS.DEFAULT_VERTICAL_OFFSET;
                        const finalVerticalX = edgeToFinalVerticalX[edgeKey];
                        const p4x = finalVerticalX !== undefined ? finalVerticalX : verticalSegmentX;

                        collisionEdges.push({
                            edgeKey: edgeKey,
                            edgeInfo: info,
                            p4x: p4x,
                            endX: info.x2,
                            fromDepth: info.depth,
                            toDepth: nodeDepthMap[info.conn.to] !== undefined ? nodeDepthMap[info.conn.to] : info.depth + 1,
                            parentId: info.conn.from
                        });
                    }
                });

                if (collisionEdges.length === 0) {
                    return edgeToSecondVerticalX;
                }

                // depthごとにエッジをグループ化
                const edgesByDepth = {};
                collisionEdges.forEach(edge => {
                    const depth = edge.fromDepth;
                    if (!edgesByDepth[depth]) {
                        edgesByDepth[depth] = [];
                    }
                    edgesByDepth[depth].push(edge);
                });

                // 各depthグループについて処理
                Object.keys(edgesByDepth).forEach(depthStr => {
                    const depth = parseInt(depthStr);
                    const depthEdges = edgesByDepth[depth];

                    // この階層の範囲を取得
                    const startX = depthMaxParentRight[depth];
                    const endX = depthMinChildLeft[depth];

                    if (startX === undefined || endX === undefined) {
                        return;
                    }

                    const availableWidth = endX - startX;

                    // 親ごとにエッジをグループ化
                    const edgesByParent = {};
                    depthEdges.forEach(edge => {
                        const parentId = edge.parentId;
                        if (!edgesByParent[parentId]) {
                            edgesByParent[parentId] = [];
                        }
                        edgesByParent[parentId].push(edge);
                    });

                    // 親をY座標でソートしてインデックスを割り当て
                    const parentInfos = [];
                    Object.keys(edgesByParent).forEach(parentId => {
                        const edges = edgesByParent[parentId];
                        const yPosition = parentYPositions[parentId] || 0;
                        parentInfos.push({
                            parentId: parentId,
                            yPosition: yPosition,
                            edges: edges
                        });
                    });
                    parentInfos.sort((a, b) => a.yPosition - b.yPosition);

                    const parentCount = parentInfos.length;

                    // 親の数で等分（両端のマージンを含めてparentCount+1で割る）
                    const spacing = availableWidth / (parentCount + 1);

                    // 各親グループに対して位置を計算
                    parentInfos.forEach((parentInfo, parentIndex) => {
                        const edges = parentInfo.edges;

                        // この親の2本目垂直セグメントX座標
                        const secondVerticalX = startX + spacing * (parentIndex + 1);

                        edges.forEach(edge => {
                            edgeToSecondVerticalX[edge.edgeKey] = secondVerticalX;

                            if (window.DEBUG_CONNECTIONS) {
                                console.log('[CollisionUtils]', edge.edgeKey,
                                    'parent:', edge.parentId, 'index:', parentIndex, 'depth:', depth,
                                    'startX:', startX.toFixed(1),
                                    'endX:', endX.toFixed(1),
                                    'availableWidth:', availableWidth.toFixed(1),
                                    'spacing:', spacing.toFixed(1),
                                    'secondVerticalX:', secondVerticalX.toFixed(1));
                            }
                        });
                    });
                });

                return edgeToSecondVerticalX;
            }
        };

        // 後方互換性のための関数エイリアス
        const checkRectOverlap = collisionUtils.checkRectOverlap.bind(collisionUtils);
        const findVerticalLineIntersections = collisionUtils.findVerticalLineIntersections.bind(collisionUtils);
        const findHorizontalLineIntersections = collisionUtils.findHorizontalLineIntersections.bind(collisionUtils);
        const checkEdgePathIntersectsNodes = collisionUtils.checkEdgePathIntersectsNodes.bind(collisionUtils);
        const calculateNodeAvoidanceOffset = collisionUtils.calculateNodeAvoidanceOffset.bind(collisionUtils);
        const calculateLabelAvoidanceOffset = collisionUtils.calculateLabelAvoidanceOffset.bind(collisionUtils);

        const collisionAvoidanceSegmentCalculator = {
            calculateSecondVerticalSegmentX: collisionUtils.calculateSecondVerticalSegmentX.bind(collisionUtils)
        };
    `;
}

module.exports = {
    getCollisionUtils
};
