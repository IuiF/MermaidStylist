function getCollisionUtils() {
    return `
        // 衝突検出と回避計算モジュール

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
             * @param {Array} edgeInfos - エッジ情報配列
             * @param {Object} edgeToYAdjustment - エッジキー -> Y調整情報のマップ
             * @param {Object} edgeToFinalVerticalX - エッジキー -> 最終垂直X座標のマップ
             * @param {Object} parentFinalVerticalSegmentX - 親ID -> 垂直セグメントX座標のマップ
             * @param {Object} nodeDepthMap - ノードID -> depth のマップ
             * @returns {Object} エッジキー -> 2本目の垂直セグメントX座標のマップ
             */
            calculateSecondVerticalSegmentX: function(edgeInfos, edgeToYAdjustment, edgeToFinalVerticalX, parentFinalVerticalSegmentX, nodeDepthMap) {
                const edgeToSecondVerticalX = {};

                // 衝突回避が必要なエッジのみを抽出
                const collisionEdges = [];
                edgeInfos.forEach(info => {
                    if (info.is1to1Horizontal) return;

                    const edgeKey = info.conn.from + '->' + info.conn.to;
                    if (edgeToYAdjustment[edgeKey] && edgeToYAdjustment[edgeKey].needsAdjustment) {
                        const verticalSegmentX = parentFinalVerticalSegmentX[info.conn.from] || info.x1 + 50;
                        const finalVerticalX = edgeToFinalVerticalX[edgeKey];
                        const p4x = finalVerticalX !== undefined ? finalVerticalX : verticalSegmentX;

                        collisionEdges.push({
                            edgeKey: edgeKey,
                            edgeInfo: info,
                            p4x: p4x,
                            endX: info.x2,
                            fromDepth: info.depth,
                            toDepth: nodeDepthMap[info.conn.to] !== undefined ? nodeDepthMap[info.conn.to] : info.depth + 1
                        });
                    }
                });

                if (collisionEdges.length === 0) {
                    return edgeToSecondVerticalX;
                }

                // 各階層を通過する衝突回避エッジの本数をカウント
                const collisionEdgesPassingThroughDepth = {};
                collisionEdges.forEach(edge => {
                    for (let d = edge.fromDepth; d < edge.toDepth; d++) {
                        if (!collisionEdgesPassingThroughDepth[d]) {
                            collisionEdgesPassingThroughDepth[d] = 0;
                        }
                        collisionEdgesPassingThroughDepth[d]++;
                    }
                });

                if (window.DEBUG_CONNECTIONS) {
                    console.log('[CollisionUtils] Collision edges passing through each depth:', collisionEdgesPassingThroughDepth);
                }

                // 各衝突回避エッジについて、2本目の垂直セグメントX座標を計算
                collisionEdges.forEach(edge => {
                    // p4xからendXまでの距離を基準にオフセットを計算
                    const baseDistance = edge.endX - edge.p4x;

                    // この階層を通過する衝突回避エッジの本数に基づいて、スペースを確保
                    const depthCollisionCount = collisionEdgesPassingThroughDepth[edge.fromDepth] || 1;

                    // 2本目の垂直セグメントは、p4xとendXの中間付近に配置
                    // ただし、衝突回避エッジが複数ある場合は、スペースを確保する
                    const minSpacing = CONNECTION_CONSTANTS.EDGE_SPACING;
                    const requiredSpace = minSpacing * depthCollisionCount;

                    // baseDistanceがrequiredSpaceより小さい場合は、baseDistanceを使用
                    const actualSpace = Math.min(baseDistance * 0.6, requiredSpace);

                    // 2本目の垂直セグメントX座標
                    const secondVerticalX = edge.endX - actualSpace;

                    edgeToSecondVerticalX[edge.edgeKey] = secondVerticalX;

                    if (window.DEBUG_CONNECTIONS) {
                        console.log('[CollisionUtils]', edge.edgeKey,
                            'p4x:', edge.p4x.toFixed(1),
                            'endX:', edge.endX.toFixed(1),
                            'baseDistance:', baseDistance.toFixed(1),
                            'requiredSpace:', requiredSpace.toFixed(1),
                            'secondVerticalX:', secondVerticalX.toFixed(1));
                    }
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
