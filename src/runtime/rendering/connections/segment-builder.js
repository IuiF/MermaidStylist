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

            const segments = [];

            // TODO: フェーズ2で実装
            // - 初期Y調整の判定
            // - セグメント生成ロジック
            // - 最終Y調整の処理

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
