function getEdgeCrossingDetector() {
    return `
        // エッジ交差検出モジュール
        // 水平セグメントが垂直セグメントと交差する点を検出する

        const EDGE_CROSSING_CONSTANTS = {
            ENDPOINT_EPSILON: 1.0,           // 端点判定の閾値
            MIN_SEGMENT_LENGTH: 16,          // 最小セグメント長
            COORDINATE_EPSILON: 0.1,         // 座標判定の閾値
            DUPLICATE_EPSILON: 0.1           // 重複チェックの閾値
        };

        const edgeCrossingDetector = {
            /**
             * 水平線分と垂直線分の交差判定
             * @param {Object} hSeg - 水平セグメント {x1, x2, y}
             * @param {Object} vSeg - 垂直セグメント {x, y1, y2}
             * @returns {Object|null} 交差点 {x, y} または null
             */
            checkLineSegmentIntersection: function(hSeg, vSeg) {
                const hMinX = Math.min(hSeg.x1, hSeg.x2);
                const hMaxX = Math.max(hSeg.x1, hSeg.x2);
                const vMinY = Math.min(vSeg.y1, vSeg.y2);
                const vMaxY = Math.max(vSeg.y1, vSeg.y2);

                const epsilon = EDGE_CROSSING_CONSTANTS.ENDPOINT_EPSILON;

                // 水平線のY座標が垂直線のY範囲内かチェック
                if (hSeg.y < vMinY || hSeg.y > vMaxY) {
                    return null;
                }

                // 垂直線のX座標が水平線のX範囲内かチェック
                if (vSeg.x < hMinX || vSeg.x > hMaxX) {
                    return null;
                }

                // 交差点がセグメントの端点に近い場合は除外（折れ曲がり点を避ける）
                const isNearHorizontalEndpoint =
                    Math.abs(vSeg.x - hSeg.x1) < epsilon ||
                    Math.abs(vSeg.x - hSeg.x2) < epsilon;

                const isNearVerticalEndpoint =
                    Math.abs(hSeg.y - vSeg.y1) < epsilon ||
                    Math.abs(hSeg.y - vSeg.y2) < epsilon;

                if (isNearHorizontalEndpoint || isNearVerticalEndpoint) {
                    return null;
                }

                return { x: vSeg.x, y: hSeg.y };
            },

            /**
             * エッジのセグメント情報を抽出
             * @param {Array} edgeInfos - エッジ情報配列
             * @param {Object} parentFinalVerticalSegmentX - 親の垂直セグメントX座標マップ
             * @param {Object} edgeToYAdjustment - Y調整情報マップ
             * @param {Object} edgeToFinalVerticalX - 最終垂直X座標マップ
             * @param {Object} edgeToSecondVerticalX - 2本目垂直X座標マップ
             * @returns {Array} セグメント情報配列
             */
            extractEdgeSegments: function(edgeInfos, parentFinalVerticalSegmentX, edgeToYAdjustment, edgeToFinalVerticalX, edgeToSecondVerticalX) {
                const allSegments = [];

                edgeInfos.forEach(edgeInfo => {
                    if (edgeInfo.is1to1Horizontal) {
                        // 1:1水平エッジ
                        allSegments.push({
                            edgeKey: edgeInfo.conn.from + '->' + edgeInfo.conn.to,
                            type: 'H',
                            x1: edgeInfo.x1,
                            x2: edgeInfo.x2,
                            y: edgeInfo.y1
                        });
                        return;
                    }

                    const edgeKey = edgeInfo.conn.from + '->' + edgeInfo.conn.to;
                    const verticalSegmentX = parentFinalVerticalSegmentX[edgeInfo.conn.from] || edgeInfo.x1 + CONNECTION_CONSTANTS.DEFAULT_VERTICAL_OFFSET;
                    const finalVerticalX = edgeToFinalVerticalX[edgeKey];
                    const p4x = finalVerticalX !== undefined ? finalVerticalX : verticalSegmentX;
                    const yAdjustment = edgeToYAdjustment[edgeKey];
                    const secondVerticalX = edgeToSecondVerticalX[edgeKey];

                    // 制御点を計算（renderer.jsのcreateCurvedPathと同じロジック）
                    const p1x = edgeInfo.x1;
                    const p1y = edgeInfo.y1;
                    let p2x = verticalSegmentX;
                    const p2y = edgeInfo.y1;
                    let p3x = verticalSegmentX;
                    let p3y = edgeInfo.y2;
                    let p4y = edgeInfo.y2;

                    if (yAdjustment && yAdjustment.needsAdjustment) {
                        p3y = yAdjustment.adjustedY;
                        p4y = yAdjustment.adjustedY;
                    }

                    // セグメントを追加
                    // 水平セグメント1: p1 -> (p2x, p1y)
                    allSegments.push({
                        edgeKey: edgeKey,
                        type: 'H',
                        x1: p1x,
                        x2: p2x,
                        y: p1y
                    });

                    // 垂直セグメント: (p2x, p2y) -> (p3x, p3y)
                    allSegments.push({
                        edgeKey: edgeKey,
                        type: 'V',
                        x: p3x,
                        y1: p2y,
                        y2: p3y
                    });

                    // セグメント3: p3からp4への移動
                    const minSegmentLength = EDGE_CROSSING_CONSTANTS.MIN_SEGMENT_LENGTH;
                    const needsFinalVertical = Math.abs(p3y - p4y) > minSegmentLength;
                    if (needsFinalVertical) {
                        if (Math.abs(p3x - p4x) > minSegmentLength) {
                            allSegments.push({
                                edgeKey: edgeKey,
                                type: 'H',
                                x1: p3x,
                                x2: p4x,
                                y: p3y
                            });
                            allSegments.push({
                                edgeKey: edgeKey,
                                type: 'V',
                                x: p4x,
                                y1: p3y,
                                y2: p4y
                            });
                        } else {
                            allSegments.push({
                                edgeKey: edgeKey,
                                type: 'V',
                                x: p3x,
                                y1: p3y,
                                y2: p4y
                            });
                        }
                    } else if (Math.abs(p3x - p4x) > minSegmentLength) {
                        allSegments.push({
                            edgeKey: edgeKey,
                            type: 'H',
                            x1: p3x,
                            x2: p4x,
                            y: p4y
                        });
                    }

                    // セグメント4: p4からendへ（buildSegmentsと同じ閾値を使用）
                    const epsilon = EDGE_CROSSING_CONSTANTS.COORDINATE_EPSILON;
                    const needsFinalYAdjustment = Math.abs(p4y - edgeInfo.y2) > epsilon;
                    if (needsFinalYAdjustment) {
                        if (secondVerticalX !== undefined) {
                            // 2本目の垂直セグメントがある場合
                            if (Math.abs(p4x - secondVerticalX) > epsilon) {
                                allSegments.push({
                                    edgeKey: edgeKey,
                                    type: 'H',
                                    x1: p4x,
                                    x2: secondVerticalX,
                                    y: p4y
                                });
                            }
                            if (Math.abs(p4y - edgeInfo.y2) > epsilon) {
                                allSegments.push({
                                    edgeKey: edgeKey,
                                    type: 'V',
                                    x: secondVerticalX,
                                    y1: p4y,
                                    y2: edgeInfo.y2
                                });
                            }
                            if (Math.abs(secondVerticalX - edgeInfo.x2) > epsilon) {
                                allSegments.push({
                                    edgeKey: edgeKey,
                                    type: 'H',
                                    x1: secondVerticalX,
                                    x2: edgeInfo.x2,
                                    y: edgeInfo.y2
                                });
                            }
                        } else {
                            const intermediateX = (p4x + edgeInfo.x2) / 2;
                            if (Math.abs(p4x - intermediateX) > epsilon) {
                                allSegments.push({
                                    edgeKey: edgeKey,
                                    type: 'H',
                                    x1: p4x,
                                    x2: intermediateX,
                                    y: p4y
                                });
                            }
                            if (Math.abs(p4y - edgeInfo.y2) > epsilon) {
                                allSegments.push({
                                    edgeKey: edgeKey,
                                    type: 'V',
                                    x: intermediateX,
                                    y1: p4y,
                                    y2: edgeInfo.y2
                                });
                            }
                            if (Math.abs(intermediateX - edgeInfo.x2) > epsilon) {
                                allSegments.push({
                                    edgeKey: edgeKey,
                                    type: 'H',
                                    x1: intermediateX,
                                    x2: edgeInfo.x2,
                                    y: edgeInfo.y2
                                });
                            }
                        }
                    } else {
                        if (Math.abs(p4x - edgeInfo.x2) > epsilon) {
                            allSegments.push({
                                edgeKey: edgeKey,
                                type: 'H',
                                x1: p4x,
                                x2: edgeInfo.x2,
                                y: p4y
                            });
                        }
                    }
                });

                return allSegments;
            },

            /**
             * 全エッジ間の交差を検出
             * @param {Array} segments - セグメント情報配列
             * @returns {Object} エッジキー -> 交差点配列のマップ
             */
            detectCrossings: function(segments) {
                const crossings = {};

                // 水平セグメントと垂直セグメントのペアをチェック
                segments.forEach((hSeg, hIdx) => {
                    if (hSeg.type !== 'H') return;

                    segments.forEach((vSeg, vIdx) => {
                        if (vSeg.type !== 'V') return;
                        if (hSeg.edgeKey === vSeg.edgeKey) return; // 同じエッジのセグメント同士は除外

                        const intersection = this.checkLineSegmentIntersection(hSeg, vSeg);
                        if (intersection) {
                            if (!crossings[hSeg.edgeKey]) {
                                crossings[hSeg.edgeKey] = [];
                            }

                            // 重複チェック: 既に同じ座標の交差点が存在しないか確認
                            const duplicateEpsilon = EDGE_CROSSING_CONSTANTS.DUPLICATE_EPSILON;
                            const isDuplicate = crossings[hSeg.edgeKey].some(existing =>
                                Math.abs(existing.x - intersection.x) < duplicateEpsilon &&
                                Math.abs(existing.y - intersection.y) < duplicateEpsilon
                            );

                            if (!isDuplicate) {
                                if (window.DEBUG_CONNECTIONS) {
                                    console.log('[EdgeCrossing] Found crossing:', hSeg.edgeKey, 'crosses', vSeg.edgeKey,
                                        'at (', intersection.x.toFixed(1), ',', intersection.y.toFixed(1), ')');
                                }

                                crossings[hSeg.edgeKey].push({
                                    x: intersection.x,
                                    y: intersection.y,
                                    crossedEdge: vSeg.edgeKey
                                });
                            }
                        }
                    });
                });

                // 交差点をX座標順にソート
                Object.keys(crossings).forEach(edgeKey => {
                    crossings[edgeKey].sort((a, b) => a.x - b.x);
                });

                if (window.DEBUG_CONNECTIONS) {
                    console.log('[EdgeCrossing] Total edges with crossings:', Object.keys(crossings).length);
                }

                return crossings;
            },

            /**
             * エッジ交差情報を生成
             * @param {Array} edgeInfos - エッジ情報配列
             * @param {Object} layoutData - レイアウトデータ
             * @returns {Object} エッジキー -> 交差点配列のマップ
             */
            generateCrossingInfo: function(edgeInfos, layoutData) {
                const segments = this.extractEdgeSegments(
                    edgeInfos,
                    layoutData.parentFinalVerticalSegmentX,
                    layoutData.edgeToYAdjustment,
                    layoutData.edgeToFinalVerticalX,
                    layoutData.edgeToSecondVerticalX
                );

                if (window.DEBUG_CONNECTIONS) {
                    console.log('[EdgeCrossing] Extracted', segments.length, 'segments from', edgeInfos.length, 'edges');
                }

                const crossings = this.detectCrossings(segments);

                if (window.DEBUG_CONNECTIONS) {
                    console.log('[EdgeCrossing] Total edges with crossings:', Object.keys(crossings).length);
                }

                return crossings;
            }
        };
    `;
}

module.exports = {
    getEdgeCrossingDetector
};
