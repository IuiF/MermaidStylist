function getEdgeOverlapDetector() {
    return `
        // エッジ同士の重なり検知モジュール

        const edgeOverlapDetector = {
            /**
             * エッジセグメントのバウンディングボックスを計算
             * @param {number} x1 - 開始X座標
             * @param {number} y1 - 開始Y座標
             * @param {number} x2 - 終了X座標
             * @param {number} y2 - 終了Y座標
             * @param {number} padding - パディング
             * @returns {Object} バウンディングボックス
             */
            calculateSegmentBounds: function(x1, y1, x2, y2, padding) {
                return {
                    left: Math.min(x1, x2) - padding,
                    right: Math.max(x1, x2) + padding,
                    top: Math.min(y1, y2) - padding,
                    bottom: Math.max(y1, y2) + padding
                };
            },

            /**
             * エッジ全体のルートをセグメント配列に分解
             * @param {Object} edgeInfo - エッジ情報
             * @param {number} verticalSegmentX - 垂直セグメントX座標
             * @param {number} finalVerticalX - 最終垂直X座標（オプション）
             * @returns {Array} セグメント配列
             */
            decomposeEdgeRoute: function(edgeInfo, verticalSegmentX, finalVerticalX) {
                const { x1, y1, x2, y2 } = edgeInfo;
                const p2x = verticalSegmentX;
                const p4x = finalVerticalX !== undefined ? finalVerticalX : x2;

                // エッジを水平・垂直セグメントに分解
                return [
                    // H1: 親ノード → 垂直セグメント開始
                    { type: 'horizontal', x1: x1, y1: y1, x2: p2x, y2: y1, edgeId: edgeInfo.conn.from + '->' + edgeInfo.conn.to },
                    // V1: 垂直セグメント
                    { type: 'vertical', x1: p2x, y1: y1, x2: p2x, y2: y2, edgeId: edgeInfo.conn.from + '->' + edgeInfo.conn.to },
                    // H2: 垂直セグメント終了 → 最終垂直X
                    { type: 'horizontal', x1: p2x, y1: y2, x2: p4x, y2: y2, edgeId: edgeInfo.conn.from + '->' + edgeInfo.conn.to },
                    // H3: 最終垂直X → 子ノード
                    { type: 'horizontal', x1: p4x, y1: y2, x2: x2, y2: y2, edgeId: edgeInfo.conn.from + '->' + edgeInfo.conn.to }
                ];
            },

            /**
             * 2つのセグメントが重なっているか判定
             * @param {Object} seg1 - セグメント1
             * @param {Object} seg2 - セグメント2
             * @returns {boolean} 重なっている場合true
             */
            checkSegmentOverlap: function(seg1, seg2) {
                const padding = 5; // 最小距離
                const bounds1 = this.calculateSegmentBounds(seg1.x1, seg1.y1, seg1.x2, seg1.y2, padding);
                const bounds2 = this.calculateSegmentBounds(seg2.x1, seg2.y1, seg2.x2, seg2.y2, padding);

                // バウンディングボックスの重なりチェック
                const xOverlap = !(bounds1.right < bounds2.left || bounds1.left > bounds2.right);
                const yOverlap = !(bounds1.bottom < bounds2.top || bounds1.top > bounds2.bottom);

                return xOverlap && yOverlap;
            },

            /**
             * 全エッジの重なりを検知
             * @param {Array} edgeInfos - エッジ情報配列
             * @param {Object} verticalSegmentXMap - 親ID→垂直X座標のマップ
             * @param {Object} finalVerticalXMap - エッジキー→最終X座標のマップ
             * @returns {Array} 重なり情報の配列
             */
            detectOverlaps: function(edgeInfos, verticalSegmentXMap, finalVerticalXMap) {
                const allSegments = [];
                const overlaps = [];

                // 全エッジをセグメントに分解
                edgeInfos.forEach(edgeInfo => {
                    if (edgeInfo.is1to1Horizontal) return; // 直線エッジは除外

                    const verticalX = verticalSegmentXMap[edgeInfo.conn.from];
                    const edgeKey = edgeInfo.conn.from + '->' + edgeInfo.conn.to;
                    const finalX = finalVerticalXMap[edgeKey];

                    const segments = this.decomposeEdgeRoute(edgeInfo, verticalX, finalX);
                    segments.forEach(seg => {
                        allSegments.push({
                            ...seg,
                            fromNode: edgeInfo.conn.from,
                            toNode: edgeInfo.conn.to
                        });
                    });
                });

                // 全セグメントペアで重なりチェック
                for (let i = 0; i < allSegments.length; i++) {
                    for (let j = i + 1; j < allSegments.length; j++) {
                        const seg1 = allSegments[i];
                        const seg2 = allSegments[j];

                        // 同じエッジのセグメント同士はスキップ
                        if (seg1.edgeId === seg2.edgeId) continue;

                        if (this.checkSegmentOverlap(seg1, seg2)) {
                            overlaps.push({
                                edge1: seg1.edgeId,
                                edge2: seg2.edgeId,
                                segment1: seg1.type,
                                segment2: seg2.type
                            });
                        }
                    }
                }

                if (window.DEBUG_CONNECTIONS && overlaps.length > 0) {
                    console.log('[EdgeOverlapDetector] Found', overlaps.length, 'overlaps');
                    overlaps.forEach(overlap => {
                        console.log('  -', overlap.edge1, '(', overlap.segment1, ') overlaps',
                            overlap.edge2, '(', overlap.segment2, ')');
                    });
                }

                return overlaps;
            },

            /**
             * 重なり統計を計算
             * @param {Array} overlaps - 重なり情報配列
             * @returns {Object} 統計情報
             */
            calculateOverlapStats: function(overlaps) {
                const stats = {
                    total: overlaps.length,
                    byType: {},
                    byEdge: {}
                };

                overlaps.forEach(overlap => {
                    const typeKey = overlap.segment1 + '-' + overlap.segment2;
                    stats.byType[typeKey] = (stats.byType[typeKey] || 0) + 1;

                    stats.byEdge[overlap.edge1] = (stats.byEdge[overlap.edge1] || 0) + 1;
                    stats.byEdge[overlap.edge2] = (stats.byEdge[overlap.edge2] || 0) + 1;
                });

                return stats;
            }
        };
    `;
}

module.exports = {
    getEdgeOverlapDetector
};
