function getEdgeSpacingCalculator() {
    return `
        // エッジ間隔調整モジュール（ノード層間のエッジX座標配置）

        const EDGE_SPACING_CONSTANTS = {
            COLLISION_OFFSET_RATIO: 0.3,    // 衝突回避オフセット推定の係数
            LANE_CENTER_OFFSET: 0.5         // レーン内での中央配置オフセット
        };

        const edgeSpacingCalculator = {
            /**
             * 各depthを通過する全エッジ数をカウント（長距離エッジと衝突回避エッジを含む）
             * @param {Array} edgeInfos - エッジ情報配列
             * @param {Object} nodeDepthMap - ノードID -> depth のマップ
             * @param {Object} edgeToYAdjustment - エッジキー -> Y調整情報のマップ（オプション）
             * @returns {Object} depth -> 通過エッジ数のマップ
             */
            countEdgesPassingThroughDepth: function(edgeInfos, nodeDepthMap, edgeToYAdjustment) {
                const edgesPassingThroughDepth = {};
                edgeInfos.forEach(info => {
                    if (info.is1to1Horizontal) return;

                    const fromDepth = info.depth;
                    // 子ノードのdepthを推定：子ノードが親として他のエッジを持っていればそのdepth、なければfromDepth+1
                    const childDepth = nodeDepthMap[info.conn.to];
                    const toDepth = childDepth !== undefined ? childDepth : fromDepth + 1;

                    // エッジが通過する各depthをカウント
                    // 例: depth=1の親からdepth=3の子へのエッジは、depth=1とdepth=2を通過する
                    for (let d = fromDepth; d < toDepth; d++) {
                        if (!edgesPassingThroughDepth[d]) {
                            edgesPassingThroughDepth[d] = 0;
                        }
                        edgesPassingThroughDepth[d]++;
                    }

                    // 衝突回避エッジの場合、2本目の垂直セグメントも追加カウント
                    if (edgeToYAdjustment) {
                        const edgeKey = info.conn.from + '->' + info.conn.to;
                        if (edgeToYAdjustment[edgeKey] && edgeToYAdjustment[edgeKey].needsAdjustment) {
                            for (let d = fromDepth; d < toDepth; d++) {
                                edgesPassingThroughDepth[d]++;
                            }
                        }
                    }
                });

                if (window.DEBUG_CONNECTIONS) {
                    console.log('[EdgeSpacingCalculator] Edges passing through each depth:', edgesPassingThroughDepth);
                    if (edgeToYAdjustment) {
                        const collisionCount = Object.keys(edgeToYAdjustment).length;
                        console.log('[EdgeSpacingCalculator] Including', collisionCount, 'collision avoidance edges (doubled)');
                    }
                }

                return edgesPassingThroughDepth;
            },

            /**
             * 等間隔配置のX座標を計算
             * @param {Array} parents - 親ノード情報配列（parentId, yPosition, x1, x2を含む）
             * @param {number} depth - 階層番号
             * @param {number} totalEdgesPassingThrough - この階層を通過する全エッジ数
             * @param {number} maxParentRight - 親ノード群の最大右端X座標
             * @param {number} minChildLeft - 子ノード群の最小左端X座標
             * @param {number} minOffset - ノード右端からの最小オフセット
             * @returns {Object} parentId -> X座標のマップ
             */
            calculateEvenSpacing: function(parents, depth, totalEdgesPassingThrough, maxParentRight, minChildLeft, minOffset) {
                const parentVerticalSegmentX = {};

                // Y座標でソート（上から下）
                parents.sort((a, b) => a.yPosition - b.yPosition);

                const totalParentsInDepth = parents.length;

                const rawAvailableWidth = minChildLeft - maxParentRight - minOffset * 2;

                // Y範囲を計算
                const yMin = parents[0].yPosition;
                const yMax = parents[parents.length - 1].yPosition;
                const yRange = yMax - yMin;

                // Y範囲に関わらず一定のminSpacingを使用（レイアウト計算との整合性を保つ）
                const minSpacing = CONNECTION_CONSTANTS.EDGE_SPACING;

                // layout-utils.jsと同じロジック: max(親ノード数, エッジ数)を使用
                const effectiveLaneCount = Math.max(totalParentsInDepth, totalEdgesPassingThrough);

                // 必要な幅は、通過する全エッジ数に基づいて計算
                const requiredWidth = minSpacing * (effectiveLaneCount + 1);

                // 衝突回避オフセットの平均的な値を見込む
                const offsetRatio = EDGE_SPACING_CONSTANTS.COLLISION_OFFSET_RATIO;
                const estimatedCollisionOffset = requiredWidth * offsetRatio;

                // effectiveLaneCountで等分してレーン間隔を計算
                const laneSpacing = Math.max(minSpacing, rawAvailableWidth / (effectiveLaneCount + 1));

                // 中央X座標を計算し、衝突回避オフセットを考慮して配置開始位置を決定
                const centerX = (maxParentRight + minChildLeft) / 2;
                // 実際に親ノードが配置される幅（親ノード数ベース）
                const totalWidth = laneSpacing * totalParentsInDepth;
                const startX = centerX - totalWidth / 2 - estimatedCollisionOffset / 2;

                if (window.DEBUG_CONNECTIONS) {
                    console.log('[EdgeSpacingCalculator] Depth', depth, ':', parents.length, 'parents,', totalEdgesPassingThrough, 'edges passing, effectiveLaneCount:', effectiveLaneCount, 'yRange:', yRange.toFixed(1), 'rawAvailableWidth:', rawAvailableWidth.toFixed(1), 'estimatedOffset:', estimatedCollisionOffset.toFixed(1), 'laneSpacing:', laneSpacing.toFixed(1), 'centerX:', centerX.toFixed(1), 'startX:', startX.toFixed(1));
                    parents.forEach(p => console.log('  -', p.parentId, 'y:', p.yPosition.toFixed(1)));
                }

                // 各親に等間隔でX座標を割り当て（中央基準で左から右へ配置）
                const centerOffset = EDGE_SPACING_CONSTANTS.LANE_CENTER_OFFSET;
                parents.forEach((parent, index) => {
                    let x = startX + (index + centerOffset) * laneSpacing;

                    // 垂直セグメントX座標は親ノードの右端(x1) + minOffsetより右側にある必要がある
                    const minX = parent.x1 + minOffset;
                    if (x < minX) {
                        x = minX;
                    }

                    parentVerticalSegmentX[parent.parentId] = x;
                    if (window.DEBUG_CONNECTIONS && (parent.parentId === 'A1' || parent.parentId === 'A2' || parent.parentId === 'E6')) {
                        console.log('[EdgeSpacingCalculator] Assigning', parent.parentId, 'index:', index, 'calculated:', (startX + (index + centerOffset) * laneSpacing).toFixed(1), 'minX:', minX.toFixed(1), 'final x:', x.toFixed(1));
                    }
                });

                return parentVerticalSegmentX;
            }
        };
    `;
}

module.exports = {
    getEdgeSpacingCalculator
};
