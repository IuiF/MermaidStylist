function getSegmentRenderer() {
    return `
        // セグメントリストからSVGパスを生成
        function renderSegments(segments, cornerRadius) {
            if (!segments || segments.length === 0) {
                return '';
            }

            // 開始点（M: MoveTo）
            let path = \`M \${segments[0].from.x} \${segments[0].from.y}\`;

            // セグメントループ処理
            for (let i = 0; i < segments.length; i++) {
                const current = segments[i];
                const next = segments[i + 1];

                if (next && canApplyCurve(current, next, cornerRadius)) {
                    // カーブ付きで次のセグメントへ遷移
                    path += renderCurvedTransition(current, next, cornerRadius);
                } else if (next) {
                    // 直線で次のセグメントへ遷移
                    path += renderStraightTransition(current, next);
                } else {
                    // 最終セグメント
                    path += renderFinalSegment(current);
                }
            }

            return path;
        }

        // カーブ適用可否を判定
        function canApplyCurve(seg1, seg2, r) {
            // 同じタイプのセグメント間ではカーブ不要
            if (seg1.type === seg2.type) {
                return false;
            }

            // 十分な距離があるかチェック
            const seg1Length = getSegmentLength(seg1);
            const seg2Length = getSegmentLength(seg2);

            // 両方のセグメントがカーブ半径の2倍以上の長さが必要
            return seg1Length > r * 2 && seg2Length > r * 2;
        }

        // カーブ付き遷移を描画
        function renderCurvedTransition(seg1, seg2, r) {
            const corner = seg1.to; // 折り返し点
            let path = '';

            const dir1 = getSegmentDirection(seg1);
            const dir2 = getSegmentDirection(seg2);

            // seg1の終点手前までを直線で描画
            if (seg1.type === SegmentType.HORIZONTAL) {
                const beforeCornerX = dir1 === 'right' ? corner.x - r : corner.x + r;
                path += \` L \${beforeCornerX} \${corner.y}\`;
            } else {
                const beforeCornerY = dir1 === 'down' ? corner.y - r : corner.y + r;
                path += \` L \${corner.x} \${beforeCornerY}\`;
            }

            // コーナーでカーブを描画（Q: 2次ベジェ曲線）
            path += \` Q \${corner.x} \${corner.y}\`;

            // seg2の開始点からr分進んだ位置へ
            if (seg2.type === SegmentType.HORIZONTAL) {
                const afterCornerX = dir2 === 'right' ? corner.x + r : corner.x - r;
                path += \` \${afterCornerX} \${corner.y}\`;
            } else {
                const afterCornerY = dir2 === 'down' ? corner.y + r : corner.y - r;
                path += \` \${corner.x} \${afterCornerY}\`;
            }

            return path;
        }

        // 直線遷移を描画
        function renderStraightTransition(seg1, seg2) {
            // seg1の終点（= seg2の開始点）まで直線
            return \` L \${seg1.to.x} \${seg1.to.y}\`;
        }

        // 最終セグメントを描画
        function renderFinalSegment(seg) {
            // セグメントの終点まで直線
            return \` L \${seg.to.x} \${seg.to.y}\`;
        }
    `;
}

module.exports = {
    getSegmentRenderer
};
