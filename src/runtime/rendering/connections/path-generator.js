function getPathGenerator() {
    return `
        // SVGパス生成モジュール (セグメントベース実装)
        //
        // 制御点からセグメントリストを構築し、SVGパスを生成します。
        // Y調整が必要なエッジでも滑らかなカーブを適用します。

        // セグメントタイプの定義
        const SegmentType = {
            HORIZONTAL: 'H',
            VERTICAL: 'V'
        };

        // カーブ適用可能な最小セグメント長
        const MIN_SEGMENT_LENGTH = 16; // cornerRadius(8) * 2

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

            const hasInitialYAdjustment = Math.abs(p2.y - p1.y) > MIN_SEGMENT_LENGTH;
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

        const pathGenerator = {
            /**
             * カーブ付きパスを生成
             * @param {Object} points - 制御点オブジェクト { p1, p2, p3, p4, end }
             * @param {number} cornerRadius - コーナー半径
             * @returns {string} SVGパス文字列
             */
            generateCurvedPath: function(points, cornerRadius) {
                const segments = buildSegments(points);

                if (window.DEBUG_CONNECTIONS) {
                    console.log('[Path Generator] Building segments');
                    console.log(debugSegments(segments));
                }

                if (!validateSegments(segments)) {
                    console.error('[Path Generator] Segment validation failed');
                    return '';
                }

                const path = renderSegments(segments, cornerRadius);

                if (window.DEBUG_CONNECTIONS) {
                    console.log('[Path Generator] Generated path:', path);
                }

                return path;
            }
        };
    `;
}

module.exports = {
    getPathGenerator
};
