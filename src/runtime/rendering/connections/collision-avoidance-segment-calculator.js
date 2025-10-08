function getCollisionAvoidanceSegmentCalculator() {
    return `
        // 衝突回避エッジの2本目の垂直セグメントX座標を計算するモジュール

        const collisionAvoidanceSegmentCalculator = {
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
                    console.log('[CollisionAvoidanceSegmentCalculator] Collision edges passing through each depth:', collisionEdgesPassingThroughDepth);
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
                        console.log('[CollisionAvoidanceSegmentCalculator]', edge.edgeKey,
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
    `;
}

module.exports = {
    getCollisionAvoidanceSegmentCalculator
};
