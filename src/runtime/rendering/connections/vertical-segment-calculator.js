function getVerticalSegmentCalculator() {
    return `
        // 親ごとの垂直セグメントX座標を計算する統一モジュール
        const verticalSegmentCalculator = {
            /**
             * 親ごとの垂直セグメントX座標を計算
             * @param {Array} edgeInfos - エッジ情報の配列
             * @param {Object} options - 計算オプション
             * @returns {Object} 親IDをキーとした垂直セグメントX座標のマップ
             */
            calculateVerticalSegmentX: function(edgeInfos, options) {
                if (window.DEBUG_CONNECTIONS) {
                    console.log('[VerticalSegmentCalculator] Starting calculation for', edgeInfos.length, 'edges');
                }
                const {
                    parentYPositions = {},
                    depthMaxParentRight = {},
                    depthMinChildLeft = {},
                    labelBounds = [],
                    getAllNodeBounds = () => [],
                    calculateNodeAvoidanceOffset = () => 0,
                    calculateLabelAvoidanceOffset = () => 0,
                    minOffset = CONNECTION_CONSTANTS.MIN_OFFSET,
                    edgeToYAdjustment = null
                } = options;

                // 親ごとの子のY範囲を計算
                const parentChildrenYRanges = this._calculateParentChildrenYRanges(edgeInfos);

                // 親ごとの基本垂直セグメントX座標を計算
                const parentVerticalSegmentX = this._calculateBaseVerticalSegmentX(
                    edgeInfos,
                    parentChildrenYRanges,
                    parentYPositions,
                    depthMaxParentRight,
                    depthMinChildLeft,
                    minOffset,
                    edgeToYAdjustment
                );

                // 衝突回避オフセットを計算
                const parentMaxOffset = depthOffsetAggregator.aggregateOffsetsByDepth(
                    edgeInfos,
                    parentVerticalSegmentX,
                    labelBounds,
                    getAllNodeBounds,
                    calculateNodeAvoidanceOffset,
                    calculateLabelAvoidanceOffset
                );

                // 最終的な垂直セグメントX座標を計算（baseX + collisionOffset）
                const result = {};
                Object.keys(parentVerticalSegmentX).forEach(parentId => {
                    const baseX = parentVerticalSegmentX[parentId];
                    const offset = parentMaxOffset[parentId] || 0;
                    result[parentId] = baseX + offset;

                    if (window.DEBUG_CONNECTIONS && (parentId === 'A1' || parentId === 'A2')) {
                        console.log('[VerticalSegmentCalculator] Final', parentId, ':', result[parentId].toFixed(1), '= baseX:', baseX.toFixed(1), '+ offset:', offset.toFixed(1));
                    }
                });

                if (window.DEBUG_CONNECTIONS) {
                    console.log('[VerticalSegmentCalculator] Result:', result);
                    Object.keys(result).forEach(parentId => {
                        const edges = edgeInfos.filter(e => e.conn.from === parentId && !e.is1to1Horizontal);
                        const firstEdge = edges[0];
                        const depth = firstEdge ? firstEdge.depth : 'unknown';
                        const yPos = parentYPositions[parentId] || 0;
                        console.log('  Parent', parentId, 'depth:', depth, 'y:', yPos.toFixed(1), 'x:', result[parentId].toFixed(1), '(', edges.length, 'edges )');
                    });
                }

                return result;
            },

            /**
             * 親ノードをX座標でクラスタリング
             * X座標が大きく離れているノードを別クラスタに分離
             * @param {Array} parents - 親ノード情報配列
             * @returns {Array<Array>} クラスタの配列
             */
            _clusterParentsByXPosition: function(parents) {
                if (parents.length === 0) return [];
                if (parents.length === 1) return [parents];

                // X座標でソート
                const sorted = [...parents].sort((a, b) => a.x1 - b.x1);

                const clusters = [];
                let currentCluster = [sorted[0]];

                // X座標の差が大きい箇所で分割（閾値: 200px）
                const clusterThreshold = 200;

                for (let i = 1; i < sorted.length; i++) {
                    const gap = sorted[i].x1 - sorted[i - 1].x1;

                    if (gap > clusterThreshold) {
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
            },

            /**
             * 親ごとの子のY範囲を計算
             */
            _calculateParentChildrenYRanges: function(edgeInfos) {
                const parentChildrenYRanges = {};
                edgeInfos.forEach(info => {
                    if (info.is1to1Horizontal) return;

                    if (!parentChildrenYRanges[info.conn.from]) {
                        parentChildrenYRanges[info.conn.from] = { yMin: Infinity, yMax: -Infinity };
                    }
                    const range = parentChildrenYRanges[info.conn.from];
                    range.yMin = Math.min(range.yMin, info.y2);
                    range.yMax = Math.max(range.yMax, info.y2);
                });
                return parentChildrenYRanges;
            },

            /**
             * 基本垂直セグメントX座標を計算
             */
            _calculateBaseVerticalSegmentX: function(
                edgeInfos,
                parentChildrenYRanges,
                parentYPositions,
                depthMaxParentRight,
                depthMinChildLeft,
                minOffset,
                edgeToYAdjustment
            ) {
                const parentVerticalSegmentX = {};

                // 階層ごとに親をグループ化
                const parentIdsByDepth = connectionUtils.groupParentsByDepth(edgeInfos, parentChildrenYRanges);

                // 親情報を付加
                const parentsByDepth = {};
                Object.keys(parentIdsByDepth).forEach(depth => {
                    parentsByDepth[depth] = parentIdsByDepth[depth].map(parentId => {
                        const firstEdge = edgeInfos.find(e => e.conn.from === parentId && !e.is1to1Horizontal);
                        return {
                            parentId: parentId,
                            yPosition: parentYPositions[parentId] || 0,
                            x1: firstEdge.x1,
                            x2: firstEdge.x2
                        };
                    });
                });

                // 各ノードのdepthをマッピング
                const nodeDepthMap = {};
                edgeInfos.forEach(info => {
                    nodeDepthMap[info.conn.from] = info.depth;
                });

                // 各depthを通過する全エッジ数をカウント（長距離エッジと衝突回避エッジを含む）
                const edgesPassingThroughDepth = edgeSpacingCalculator.countEdgesPassingThroughDepth(edgeInfos, nodeDepthMap, edgeToYAdjustment);

                // 階層ごとに等間隔配置を計算
                Object.keys(parentsByDepth).forEach(depth => {
                    const parents = parentsByDepth[depth];

                    // 親ノードをX座標でクラスタリング（X座標が大きく離れているノードを分離）
                    const clusters = this._clusterParentsByXPosition(parents);

                    if (window.DEBUG_CONNECTIONS) {
                        console.log('[VerticalSegmentCalculator] Depth', depth, 'has', clusters.length, 'cluster(s)');
                    }

                    // このdepthを通過する全エッジ数（長距離エッジ含む）
                    const totalEdgesPassingThrough = edgesPassingThroughDepth[depth] || parents.length;

                    // 各クラスタごとに配置を計算
                    clusters.forEach((cluster, clusterIndex) => {
                        // クラスタ内の親ノードの最大右端を計算
                        const clusterMaxParentRight = Math.max(...cluster.map(p => p.x1));

                        // クラスタ内の親から出ている全エッジの子ノードの最小左端を計算
                        const clusterChildXs = [];
                        cluster.forEach(p => {
                            const parentEdges = edgeInfos.filter(e => e.conn.from === p.parentId && !e.is1to1Horizontal);
                            parentEdges.forEach(e => clusterChildXs.push(e.x2));
                        });
                        const clusterMinChildLeft = Math.min(...clusterChildXs);

                        if (window.DEBUG_CONNECTIONS) {
                            console.log('[VerticalSegmentCalculator] Depth', depth, 'cluster', clusterIndex, ':', cluster.length, 'parents, using', totalEdgesPassingThrough, 'total edges for spacing');
                        }

                        const spacing = edgeSpacingCalculator.calculateEvenSpacing(
                            cluster,
                            depth,
                            totalEdgesPassingThrough,
                            clusterMaxParentRight,
                            clusterMinChildLeft,
                            minOffset
                        );

                        Object.assign(parentVerticalSegmentX, spacing);
                    });
                });

                return parentVerticalSegmentX;
            }
        };
    `;
}

module.exports = {
    getVerticalSegmentCalculator
};
