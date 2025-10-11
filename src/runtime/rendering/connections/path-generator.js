function getPathGenerator() {
    return `
        // SVGパス生成モジュール

        // ===== セグメントベース実装（新実装） =====

        // セグメントタイプの定義
        const SegmentType = {
            HORIZONTAL: 'H',
            VERTICAL: 'V'
        };

        // セグメントを作成するヘルパー関数
        function createSegment(type, from, to) {
            return {
                type: type,
                from: { x: from.x, y: from.y },
                to: { x: to.x, y: to.y }
            };
        }

        // セグメントの長さを計算
        function getSegmentLength(segment) {
            if (segment.type === SegmentType.HORIZONTAL) {
                return Math.abs(segment.to.x - segment.from.x);
            } else {
                return Math.abs(segment.to.y - segment.from.y);
            }
        }

        // セグメントの方向を判定
        function getSegmentDirection(segment) {
            if (segment.type === SegmentType.HORIZONTAL) {
                return segment.to.x > segment.from.x ? 'right' : 'left';
            } else {
                return segment.to.y > segment.from.y ? 'down' : 'up';
            }
        }

        // 制御点からセグメントリストを構築
        function buildSegments(points) {
            if (!points || !points.p1 || !points.p2 || !points.p3 || !points.p4 || !points.end) {
                console.error('[buildSegments] Invalid points object');
                return [];
            }

            const { p1, p2, p3, p4, end } = points;
            const segments = [];

            const hasInitialYAdjustment = Math.abs(p2.y - p1.y) > 1;
            const needsFinalYAdjustment = Math.abs(p4.y - end.y) > 0.1;

            // セグメント1: p1から垂直セグメントX位置への水平線
            if (hasInitialYAdjustment) {
                segments.push(createSegment(SegmentType.HORIZONTAL, p1, { x: p2.x, y: p1.y }));
                segments.push(createSegment(SegmentType.VERTICAL, { x: p2.x, y: p1.y }, p2));
            } else {
                segments.push(createSegment(SegmentType.HORIZONTAL, p1, { x: p2.x, y: p1.y }));
            }

            // セグメント2: 垂直セグメント
            const verticalStart = hasInitialYAdjustment ? p2 : { x: p2.x, y: p1.y };
            segments.push(createSegment(SegmentType.VERTICAL, verticalStart, p3));

            // セグメント3: p3からp4への移動
            const needsFinalVertical = Math.abs(p3.y - p4.y) > 1;
            if (needsFinalVertical) {
                if (Math.abs(p3.x - p4.x) > 0.1) {
                    segments.push(createSegment(SegmentType.HORIZONTAL, p3, { x: p4.x, y: p3.y }));
                    segments.push(createSegment(SegmentType.VERTICAL, { x: p4.x, y: p3.y }, p4));
                } else {
                    segments.push(createSegment(SegmentType.VERTICAL, p3, p4));
                }
            } else if (Math.abs(p3.x - p4.x) > 0.1) {
                segments.push(createSegment(SegmentType.HORIZONTAL, p3, { x: p4.x, y: p4.y }));
            }

            // セグメント4: p4からendへ
            if (needsFinalYAdjustment) {
                const { secondVerticalX } = points;
                if (secondVerticalX !== undefined) {
                    if (Math.abs(p4.x - secondVerticalX) > 0.1) {
                        segments.push(createSegment(SegmentType.HORIZONTAL, { x: p4.x, y: p4.y }, { x: secondVerticalX, y: p4.y }));
                    }
                    if (Math.abs(p4.y - end.y) > 0.1) {
                        segments.push(createSegment(SegmentType.VERTICAL, { x: secondVerticalX, y: p4.y }, { x: secondVerticalX, y: end.y }));
                    }
                    if (Math.abs(secondVerticalX - end.x) > 0.1) {
                        segments.push(createSegment(SegmentType.HORIZONTAL, { x: secondVerticalX, y: end.y }, end));
                    }
                } else {
                    const intermediateX = (p4.x + end.x) / 2;
                    if (Math.abs(p4.x - intermediateX) > 0.1) {
                        segments.push(createSegment(SegmentType.HORIZONTAL, { x: p4.x, y: p4.y }, { x: intermediateX, y: p4.y }));
                    }
                    if (Math.abs(p4.y - end.y) > 0.1) {
                        segments.push(createSegment(SegmentType.VERTICAL, { x: intermediateX, y: p4.y }, { x: intermediateX, y: end.y }));
                    }
                    if (Math.abs(intermediateX - end.x) > 0.1) {
                        segments.push(createSegment(SegmentType.HORIZONTAL, { x: intermediateX, y: end.y }, end));
                    }
                }
            } else {
                if (Math.abs(p4.x - end.x) > 0.1) {
                    segments.push(createSegment(SegmentType.HORIZONTAL, { x: p4.x, y: p4.y }, end));
                }
            }

            return segments;
        }

        // セグメントリストの検証
        function validateSegments(segments) {
            if (!segments || segments.length === 0) {
                return false;
            }

            for (let i = 0; i < segments.length - 1; i++) {
                const current = segments[i];
                const next = segments[i + 1];

                if (Math.abs(current.to.x - next.from.x) > 0.1 ||
                    Math.abs(current.to.y - next.from.y) > 0.1) {
                    console.error('[validateSegments] Discontinuity at index', i);
                    return false;
                }
            }
            return true;
        }

        // デバッグ用: セグメントリストを文字列化
        function debugSegments(segments) {
            return segments.map((seg, i) => {
                const dir = getSegmentDirection(seg);
                const len = getSegmentLength(seg).toFixed(1);
                return \`[\${i}] \${seg.type} \${dir} len=\${len} from=(\${seg.from.x.toFixed(1)},\${seg.from.y.toFixed(1)}) to=(\${seg.to.x.toFixed(1)},\${seg.to.y.toFixed(1)})\`;
            }).join('\\n');
        }

        // セグメントリストからSVGパスを生成
        function renderSegments(segments, cornerRadius) {
            if (!segments || segments.length === 0) {
                return '';
            }

            let path = \`M \${segments[0].from.x} \${segments[0].from.y}\`;

            for (let i = 0; i < segments.length; i++) {
                const current = segments[i];
                const next = segments[i + 1];

                if (next && canApplyCurve(current, next, cornerRadius)) {
                    path += renderCurvedTransition(current, next, cornerRadius);
                } else if (next) {
                    path += \` L \${current.to.x} \${current.to.y}\`;
                } else {
                    path += \` L \${current.to.x} \${current.to.y}\`;
                }
            }

            return path;
        }

        // カーブ適用可否を判定
        function canApplyCurve(seg1, seg2, r) {
            if (seg1.type === seg2.type) {
                return false;
            }

            const seg1Length = getSegmentLength(seg1);
            const seg2Length = getSegmentLength(seg2);

            return seg1Length > r * 2 && seg2Length > r * 2;
        }

        // カーブ付き遷移を描画
        function renderCurvedTransition(seg1, seg2, r) {
            const corner = seg1.to;
            let path = '';

            const dir1 = getSegmentDirection(seg1);
            const dir2 = getSegmentDirection(seg2);

            if (seg1.type === SegmentType.HORIZONTAL) {
                const beforeCornerX = dir1 === 'right' ? corner.x - r : corner.x + r;
                path += \` L \${beforeCornerX} \${corner.y}\`;
            } else {
                const beforeCornerY = dir1 === 'down' ? corner.y - r : corner.y + r;
                path += \` L \${corner.x} \${beforeCornerY}\`;
            }

            path += \` Q \${corner.x} \${corner.y}\`;

            if (seg2.type === SegmentType.HORIZONTAL) {
                const afterCornerX = dir2 === 'right' ? corner.x + r : corner.x - r;
                path += \` \${afterCornerX} \${corner.y}\`;
            } else {
                const afterCornerY = dir2 === 'down' ? corner.y + r : corner.y - r;
                path += \` \${corner.x} \${afterCornerY}\`;
            }

            return path;
        }

        // ===== レガシー実装（既存のコード） =====

        const pathGenerator = {
            /**
             * カーブ付き複雑パスを生成
             * @param {Object} points - 制御点オブジェクト { p1, p2, p3, p4, end }
             * @param {number} cornerRadius - コーナー半径
             * @returns {string} SVGパス文字列
             */
            generateCurvedPath: function(points, cornerRadius) {
                // 新実装への切り替えフラグ
                const USE_SEGMENT_BASED = window.USE_SEGMENT_BASED_PATH || false;

                if (USE_SEGMENT_BASED) {
                    // 新実装（セグメントベース）を使用
                    try {
                        const segments = buildSegments(points);

                        if (window.DEBUG_CONNECTIONS) {
                            console.log('[Segment-based] Using new path generation');
                            console.log(debugSegments(segments));
                        }

                        // バリデーション
                        if (validateSegments(segments)) {
                            const path = renderSegments(segments, cornerRadius);
                            if (window.DEBUG_CONNECTIONS) {
                                console.log('[Segment-based] Generated path:', path);
                            }
                            return path;
                        } else {
                            console.error('[Segment-based] Segment validation failed, falling back to legacy');
                        }
                    } catch (error) {
                        console.error('[Segment-based] Error in new implementation:', error);
                        console.error('[Segment-based] Falling back to legacy implementation');
                    }
                }

                // レガシー実装（既存のコード）
                const { p1, p2, p3, p4, end, secondVerticalX } = points;

                // Y座標調整が必要かチェック
                const hasInitialYAdjustment = Math.abs(p2.y - p1.y) > 1;
                const needsFinalVertical = Math.abs(p3.y - p4.y) > 1;
                const canCurveFinalVertical = needsFinalVertical && Math.abs(p3.y - p4.y) > cornerRadius * 2;

                // 初期Y調整がある場合
                if (hasInitialYAdjustment) {
                    return this._generatePathWithInitialAdjustment(
                        p1, p2, p3, p4, end,
                        cornerRadius,
                        needsFinalVertical,
                        canCurveFinalVertical,
                        secondVerticalX
                    );
                }

                // 通常のパス（Y調整なし）
                return this._generateNormalPath(
                    p1, p2, p3, p4, end,
                    cornerRadius,
                    needsFinalVertical,
                    canCurveFinalVertical,
                    secondVerticalX
                );
            },

            /**
             * 初期Y調整ありのパスを生成
             */
            _generatePathWithInitialAdjustment: function(p1, p2, p3, p4, end, cornerRadius, needsFinalVertical, canCurveFinalVertical, secondVerticalX) {
                const shortHorizontal = p2.x;
                const canCurveVertical = Math.abs(p3.y - p2.y) > cornerRadius * 2;

                if (canCurveVertical) {
                    const basePath = this._generateInitialCurvedSegment(p1, p2, p3, cornerRadius);
                    return this._appendFinalSegment(basePath, p3, p4, end, cornerRadius, needsFinalVertical, canCurveFinalVertical, secondVerticalX);
                } else {
                    // 垂直距離が短い場合は直線
                    return this._generateInitialStraightSegment(p1, p2, p3, p4, end, shortHorizontal, needsFinalVertical, secondVerticalX);
                }
            },

            /**
             * 通常パス（Y調整なし）を生成
             */
            _generateNormalPath: function(p1, p2, p3, p4, end, cornerRadius, needsFinalVertical, canCurveFinalVertical, secondVerticalX) {
                const canCurveVertical = Math.abs(p3.y - p2.y) > cornerRadius * 2;

                if (canCurveVertical) {
                    const basePath = this._generateNormalCurvedSegment(p1, p2, p3, cornerRadius);
                    return this._appendFinalSegment(basePath, p3, p4, end, cornerRadius, needsFinalVertical, canCurveFinalVertical, secondVerticalX);
                } else {
                    // 垂直距離が短い場合は直線
                    return this._generateNormalStraightSegment(p1, p2, p3, p4, end, needsFinalVertical, secondVerticalX);
                }
            },

            /**
             * 初期カーブセグメント生成（Y調整あり）
             */
            _generateInitialCurvedSegment: function(p1, p2, p3, r) {
                const shortHorizontal = p2.x;

                if (p3.y > p2.y) {
                    // 下向き
                    return \`M \${p1.x} \${p1.y} L \${shortHorizontal} \${p1.y} L \${shortHorizontal} \${p2.y} L \${p2.x - r} \${p2.y} Q \${p2.x} \${p2.y} \${p2.x} \${p2.y + r} L \${p3.x} \${p3.y - r} Q \${p3.x} \${p3.y} \${p3.x + r} \${p3.y}\`;
                } else {
                    // 上向き
                    return \`M \${p1.x} \${p1.y} L \${shortHorizontal} \${p1.y} L \${shortHorizontal} \${p2.y} L \${p2.x - r} \${p2.y} Q \${p2.x} \${p2.y} \${p2.x} \${p2.y - r} L \${p3.x} \${p3.y + r} Q \${p3.x} \${p3.y} \${p3.x + r} \${p3.y}\`;
                }
            },

            /**
             * 通常カーブセグメント生成（Y調整なし）
             */
            _generateNormalCurvedSegment: function(p1, p2, p3, r) {
                if (p3.y > p2.y) {
                    // 下向き
                    return \`M \${p1.x} \${p1.y} L \${p2.x - r} \${p2.y} Q \${p2.x} \${p2.y} \${p2.x} \${p2.y + r} L \${p3.x} \${p3.y - r} Q \${p3.x} \${p3.y} \${p3.x + r} \${p3.y}\`;
                } else {
                    // 上向き
                    return \`M \${p1.x} \${p1.y} L \${p2.x - r} \${p2.y} Q \${p2.x} \${p2.y} \${p2.x} \${p2.y - r} L \${p3.x} \${p3.y + r} Q \${p3.x} \${p3.y} \${p3.x + r} \${p3.y}\`;
                }
            },

            /**
             * 最終セグメント追加
             */
            _appendFinalSegment: function(basePath, p3, p4, end, r, needsFinalVertical, canCurveFinalVertical, secondVerticalX) {
                // p4yとend.yが異なる場合は最終垂直調整が必要
                const needsFinalYAdjustment = Math.abs(p4.y - end.y) > 0.1;

                let finalHorizontal;
                if (needsFinalYAdjustment) {
                    // Y調整が必要な場合、2本目の垂直セグメントで折り返す
                    // secondVerticalXが指定されていればそれを使用、なければp4xとend.xの中間
                    const intermediateX = secondVerticalX !== undefined ? secondVerticalX : (p4.x + end.x) / 2;
                    finalHorizontal = \`L \${intermediateX} \${p4.y} L \${intermediateX} \${end.y} L \${end.x} \${end.y}\`;

                    // カーブを無効化（Y調整時は直線で処理）
                    return \`\${basePath} L \${p4.x} \${p3.y} L \${p4.x} \${p4.y} \${finalHorizontal}\`;
                } else {
                    finalHorizontal = \`L \${end.x} \${end.y}\`;
                }

                // Y調整不要の場合、従来通りカーブ処理
                if (canCurveFinalVertical) {
                    // 最終垂直セグメントをカーブで描画
                    if (p3.y > p4.y) {
                        return \`\${basePath} L \${p4.x - r} \${p3.y} Q \${p4.x} \${p3.y} \${p4.x} \${p3.y - r} L \${p4.x} \${p4.y + r} Q \${p4.x} \${p4.y} \${p4.x + r} \${p4.y} \${finalHorizontal}\`;
                    } else {
                        return \`\${basePath} L \${p4.x - r} \${p3.y} Q \${p4.x} \${p3.y} \${p4.x} \${p3.y + r} L \${p4.x} \${p4.y - r} Q \${p4.x} \${p4.y} \${p4.x + r} \${p4.y} \${finalHorizontal}\`;
                    }
                } else if (needsFinalVertical) {
                    // 最終垂直セグメントを直線で描画
                    return \`\${basePath} L \${p4.x} \${p3.y} L \${p4.x} \${p4.y} \${finalHorizontal}\`;
                } else {
                    // 最終垂直セグメント不要
                    return \`\${basePath} \${finalHorizontal}\`;
                }
            },

            /**
             * 初期直線セグメント生成（Y調整あり、垂直距離短い）
             */
            _generateInitialStraightSegment: function(p1, p2, p3, p4, end, shortHorizontal, needsFinalVertical, secondVerticalX) {
                const needsFinalYAdjustment = Math.abs(p4.y - end.y) > 0.1;
                let finalSegment;
                if (needsFinalYAdjustment) {
                    const intermediateX = secondVerticalX !== undefined ? secondVerticalX : (p4.x + end.x) / 2;
                    finalSegment = \`L \${intermediateX} \${p4.y} L \${intermediateX} \${end.y} L \${end.x} \${end.y}\`;
                } else {
                    finalSegment = \`L \${end.x} \${end.y}\`;
                }

                if (needsFinalVertical) {
                    return \`M \${p1.x} \${p1.y} L \${shortHorizontal} \${p1.y} L \${shortHorizontal} \${p2.y} L \${p2.x} \${p2.y} L \${p3.x} \${p3.y} L \${p4.x} \${p3.y} L \${p4.x} \${p4.y} \${finalSegment}\`;
                } else {
                    return \`M \${p1.x} \${p1.y} L \${shortHorizontal} \${p1.y} L \${shortHorizontal} \${p2.y} L \${p2.x} \${p2.y} L \${p3.x} \${p3.y} \${finalSegment}\`;
                }
            },

            /**
             * 通常直線セグメント生成（Y調整なし、垂直距離短い）
             */
            _generateNormalStraightSegment: function(p1, p2, p3, p4, end, needsFinalVertical, secondVerticalX) {
                const needsFinalYAdjustment = Math.abs(p4.y - end.y) > 0.1;
                let finalSegment;
                if (needsFinalYAdjustment) {
                    const intermediateX = secondVerticalX !== undefined ? secondVerticalX : (p4.x + end.x) / 2;
                    finalSegment = \`L \${intermediateX} \${p4.y} L \${intermediateX} \${end.y} L \${end.x} \${end.y}\`;
                } else {
                    finalSegment = \`L \${end.x} \${end.y}\`;
                }

                if (needsFinalVertical) {
                    return \`M \${p1.x} \${p1.y} L \${p2.x} \${p2.y} L \${p3.x} \${p3.y} L \${p4.x} \${p3.y} L \${p4.x} \${p4.y} \${finalSegment}\`;
                } else {
                    return \`M \${p1.x} \${p1.y} L \${p2.x} \${p2.y} L \${p3.x} \${p3.y} \${finalSegment}\`;
                }
            }
        };
    `;
}

module.exports = {
    getPathGenerator
};
