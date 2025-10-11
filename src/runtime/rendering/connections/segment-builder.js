function getSegmentBuilder() {
    return `
        // 制御点からセグメントリストを構築
        // points: {
        //   p1: Point,              // 開始ノード右端中央
        //   p2: Point,              // 垂直セグメント開始（Y調整後）
        //   p3: Point,              // 垂直セグメント終点（Y調整後）
        //   p4: Point,              // 最終垂直セグメント位置
        //   end: Point,             // 終了ノード左端中央
        //   secondVerticalX?: number // 2本目の垂直セグメントX座標（任意）
        // }
        // 戻り値: Segment[]
        function buildSegments(points) {
            // 入力検証
            if (!points || !points.p1 || !points.p2 || !points.p3 || !points.p4 || !points.end) {
                console.error('Invalid points object');
                return [];
            }

            const { p1, p2, p3, p4, end } = points;
            const segments = [];

            // 初期Y調整の有無を判定
            const hasInitialYAdjustment = Math.abs(p2.y - p1.y) > 1;

            // 最終Y調整の有無を判定
            const needsFinalYAdjustment = Math.abs(p4.y - end.y) > 0.1;

            // セグメント1: p1から垂直セグメントX位置への水平線
            if (hasInitialYAdjustment) {
                // タスク2.1b: 初期Y調整あり
                // 短い水平セグメント: p1からp2.xまで
                segments.push(createSegment(SegmentType.HORIZONTAL, p1, { x: p2.x, y: p1.y }));
                // Y調整用垂直セグメント: p1.yからp2.yまで
                segments.push(createSegment(SegmentType.VERTICAL, { x: p2.x, y: p1.y }, p2));
            } else {
                // 初期Y調整なし
                segments.push(createSegment(SegmentType.HORIZONTAL, p1, { x: p2.x, y: p1.y }));
            }

            // セグメント2: 垂直セグメント（垂直線の開始からp3へ）
            const verticalStart = hasInitialYAdjustment ? p2 : { x: p2.x, y: p1.y };
            segments.push(createSegment(SegmentType.VERTICAL, verticalStart, p3));

            // セグメント3: p3からp4への移動（必要な場合のみ）
            const needsFinalVertical = Math.abs(p3.y - p4.y) > 1;
            if (needsFinalVertical) {
                // 垂直方向に大きく移動する必要がある
                if (Math.abs(p3.x - p4.x) > 0.1) {
                    // X座標も異なる場合は水平→垂直
                    segments.push(createSegment(SegmentType.HORIZONTAL, p3, { x: p4.x, y: p3.y }));
                    segments.push(createSegment(SegmentType.VERTICAL, { x: p4.x, y: p3.y }, p4));
                } else {
                    // X座標が同じ場合は垂直のみ
                    segments.push(createSegment(SegmentType.VERTICAL, p3, p4));
                }
            } else if (Math.abs(p3.x - p4.x) > 0.1) {
                // Y座標が同じでX座標が異なる場合は水平のみ
                segments.push(createSegment(SegmentType.HORIZONTAL, p3, { x: p4.x, y: p4.y }));
            }
            // p3とp4が完全に同じ座標の場合は何も追加しない

            // セグメント4: p4からendへ（最終Y調整の有無で分岐）
            if (needsFinalYAdjustment) {
                // タスク2.1c: 最終Y調整あり
                const { secondVerticalX } = points;

                if (secondVerticalX !== undefined) {
                    // 2本目の垂直セグメントが必要
                    // p4からsecondVerticalXへの水平セグメント
                    if (Math.abs(p4.x - secondVerticalX) > 0.1) {
                        segments.push(createSegment(SegmentType.HORIZONTAL, { x: p4.x, y: p4.y }, { x: secondVerticalX, y: p4.y }));
                    }
                    // secondVerticalXでp4.yからend.yへの垂直セグメント
                    if (Math.abs(p4.y - end.y) > 0.1) {
                        segments.push(createSegment(SegmentType.VERTICAL, { x: secondVerticalX, y: p4.y }, { x: secondVerticalX, y: end.y }));
                    }
                    // secondVerticalXからendへの水平セグメント
                    if (Math.abs(secondVerticalX - end.x) > 0.1) {
                        segments.push(createSegment(SegmentType.HORIZONTAL, { x: secondVerticalX, y: end.y }, end));
                    }
                } else {
                    // secondVerticalXが未定義の場合は中間点を計算
                    const intermediateX = (p4.x + end.x) / 2;
                    // p4からintermediateXへの水平セグメント
                    if (Math.abs(p4.x - intermediateX) > 0.1) {
                        segments.push(createSegment(SegmentType.HORIZONTAL, { x: p4.x, y: p4.y }, { x: intermediateX, y: p4.y }));
                    }
                    // intermediateXでp4.yからend.yへの垂直セグメント
                    if (Math.abs(p4.y - end.y) > 0.1) {
                        segments.push(createSegment(SegmentType.VERTICAL, { x: intermediateX, y: p4.y }, { x: intermediateX, y: end.y }));
                    }
                    // intermediateXからendへの水平セグメント
                    if (Math.abs(intermediateX - end.x) > 0.1) {
                        segments.push(createSegment(SegmentType.HORIZONTAL, { x: intermediateX, y: end.y }, end));
                    }
                }
            } else {
                // 最終Y調整なし: p4からendへの最終水平線
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

                // 連続性チェック
                if (Math.abs(current.to.x - next.from.x) > 0.1 ||
                    Math.abs(current.to.y - next.from.y) > 0.1) {
                    console.error('Segment discontinuity detected at index', i);
                    console.error('  Current end:', current.to);
                    console.error('  Next start:', next.from);
                    return false;
                }

                // 空セグメント検出
                if (getSegmentLength(current) < 0.1) {
                    console.warn('Empty segment detected at index', i);
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
    `;
}

module.exports = {
    getSegmentBuilder
};
