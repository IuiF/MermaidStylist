function getPathYAdjuster() {
    return `
        // Y座標衝突回避モジュール

        const pathYAdjuster = {
            /**
             * 水平セグメントがノードと衝突する場合にY座標を調整
             * @param {number} x1 - 水平線開始X座標
             * @param {number} y - 水平線Y座標
             * @param {number} x2 - 水平線終了X座標
             * @param {Array} nodeBounds - ノードのバウンディングボックス配列
             * @param {string} edgeFrom - エッジの開始ノードID（デバッグ用）
             * @param {string} edgeTo - エッジの終了ノードID（デバッグ用）
             * @returns {number|null} 調整後のY座標（調整不要の場合はnull）
             */
            adjustHorizontalSegmentY: function(x1, y, x2, nodeBounds, edgeFrom, edgeTo) {
                if (!nodeBounds || nodeBounds.length === 0) {
                    return null;
                }

                // 水平線と交差するノードを検出
                const pathIntersectingNodes = checkEdgePathIntersectsNodes(x1, y, x2, y, nodeBounds);

                if (pathIntersectingNodes.length === 0) {
                    return null;
                }

                const nodePadding = CONNECTION_CONSTANTS.COLLISION_PADDING_NODE;

                // すべての衝突ノードの中で最も上と最も下を見つける
                const topMost = Math.min(...pathIntersectingNodes.map(n => n.top));
                const bottomMost = Math.max(...pathIntersectingNodes.map(n => n.bottom));

                // 水平線のY座標を調整（ノードを避ける）
                let adjustedY;
                if (y < topMost) {
                    // 開始Y座標がすべてのノードより上の場合、さらに上に移動
                    adjustedY = topMost - nodePadding;
                } else if (y >= topMost && y <= bottomMost) {
                    // 開始Y座標がノードの範囲内の場合、最も下のノードの下を通過
                    adjustedY = bottomMost + nodePadding;
                } else {
                    // その他の場合は調整不要
                    return null;
                }

                if (window.DEBUG_CONNECTIONS) {
                    console.log('Horizontal segment collision: edge=' + edgeFrom + '->' + edgeTo +
                        ', nodes=' + pathIntersectingNodes.map(n => n.id).join(',') +
                        ', original Y=' + y.toFixed(1) + ', adjusted Y=' + adjustedY.toFixed(1));
                }

                return adjustedY;
            },

            /**
             * エッジの初期水平セグメントのY座標を調整
             * @param {number} x1 - 親ノード右端X
             * @param {number} y1 - 親ノード中央Y
             * @param {number} verticalX - 垂直セグメントX座標
             * @param {number} fromNodeLeft - 親ノード左端X（オプション）
             * @param {Array} nodeBounds - ノードのバウンディングボックス配列
             * @param {string} edgeFrom - エッジの開始ノードID
             * @param {string} edgeTo - エッジの終了ノードID
             * @returns {number} 調整後のY座標（調整不要の場合は元のy1）
             */
            adjustInitialSegmentY: function(x1, y1, verticalX, fromNodeLeft, nodeBounds, edgeFrom, edgeTo) {
                const checkFromX = fromNodeLeft !== undefined ? fromNodeLeft : x1;
                const checkToX = verticalX;

                // ソースノード自体を衝突チェックから除外
                const filteredBounds = nodeBounds ? nodeBounds.filter(n => n.id !== edgeFrom) : [];

                const adjustedY = this.adjustHorizontalSegmentY(
                    checkFromX, y1, checkToX, filteredBounds, edgeFrom, edgeTo
                );

                return adjustedY !== null ? adjustedY : y1;
            },

            /**
             * エッジの最終水平セグメントのY座標を調整
             * @param {number} verticalX - 垂直セグメントX座標
             * @param {number} y2 - 子ノード中央Y
             * @param {number} finalVerticalX - 最終垂直X座標
             * @param {Array} nodeBounds - ノードのバウンディングボックス配列
             * @param {string} edgeFrom - エッジの開始ノードID
             * @param {string} edgeTo - エッジの終了ノードID
             * @returns {number|null} 調整後のY座標（調整不要の場合はnull）
             */
            adjustFinalSegmentY: function(verticalX, y2, finalVerticalX, nodeBounds, edgeFrom, edgeTo) {
                if (window.DEBUG_CONNECTIONS) {
                    console.log('Checking final horizontal segment: verticalX=' + verticalX +
                        ', y2=' + y2 + ', finalVerticalX=' + finalVerticalX +
                        ', nodeBounds.length=' + (nodeBounds ? nodeBounds.length : 0));
                }

                // ターゲットノードと関連する点線ノードの扱い
                const filteredBounds = nodeBounds ? nodeBounds.filter(function(n) {
                    const isTarget = n.id === edgeTo ||
                                   n.id.startsWith(edgeTo + '_dashed_') ||
                                   n.id.includes('_dashed_' + edgeTo);

                    if (isTarget) {
                        // 水平線がノード左端以下を通過する場合のみチェック対象に含める
                        return finalVerticalX <= n.left;
                    }
                    return true;
                }) : [];

                const adjustedY = this.adjustHorizontalSegmentY(
                    verticalX, y2, finalVerticalX, filteredBounds, edgeFrom, edgeTo
                );

                if (window.DEBUG_CONNECTIONS && adjustedY !== null) {
                    console.log('  Final segment adjusted: original=' + y2.toFixed(1) +
                        ', adjusted=' + adjustedY.toFixed(1));
                }

                return adjustedY;
            }
        };
    `;
}

module.exports = {
    getPathYAdjuster
};
