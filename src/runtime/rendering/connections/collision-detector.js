function getCollisionDetector() {
    return `
        // エッジとラベルの衝突を検出・回避する関数

        // すべてのラベルの座標を取得
        function getAllLabelBounds() {
            const svgLayer = svgHelpers.getEdgeLayer();
            const labels = svgLayer.querySelectorAll('.connection-label');
            const labelBounds = [];

            labels.forEach(label => {
                // ラベルのrect要素から直接座標を取得（SVG座標系）
                const rectElement = label.querySelector('rect');
                if (rectElement) {
                    const x = parseFloat(rectElement.getAttribute('x'));
                    const y = parseFloat(rectElement.getAttribute('y'));
                    const width = parseFloat(rectElement.getAttribute('width'));
                    const height = parseFloat(rectElement.getAttribute('height'));

                    labelBounds.push({
                        from: label.getAttribute('data-from'),
                        to: label.getAttribute('data-to'),
                        left: x,
                        top: y,
                        right: x + width,
                        bottom: y + height,
                        width: width,
                        height: height
                    });
                }
            });

            return labelBounds;
        }

        // 垂直線がラベルと交差するかチェック
        function checkVerticalLineIntersectsLabel(x, y1, y2, labelBounds) {
            const yMin = Math.min(y1, y2);
            const yMax = Math.max(y1, y2);

            for (const label of labelBounds) {
                // 垂直線のX座標がラベルの範囲内にあるかチェック
                if (x >= label.left && x <= label.right) {
                    // 垂直線のY範囲がラベルと重なるかチェック
                    if (!(yMax < label.top || yMin > label.bottom)) {
                        return label;
                    }
                }
            }
            return null;
        }

        // ラベルを避けるためのX座標オフセットを計算
        function calculateLabelAvoidanceOffset(x, y1, y2, labelBounds, edgeFrom, edgeTo) {
            const yMin = Math.min(y1, y2);
            const yMax = Math.max(y1, y2);
            const collisionPadding = 15; // ラベルとの最小距離

            // この経路と交差するラベルを見つける
            const intersectingLabels = [];
            for (const label of labelBounds) {
                // 垂直線のX座標がラベルの範囲内にあるかチェック
                if (x >= label.left - collisionPadding && x <= label.right + collisionPadding) {
                    // 垂直線のY範囲がラベルと重なるかチェック
                    if (!(yMax < label.top - collisionPadding || yMin > label.bottom + collisionPadding)) {
                        intersectingLabels.push(label);
                    }
                }
            }

            if (intersectingLabels.length === 0) {
                return 0; // 衝突なし
            }

            // ラベルの右側に移動（最も右にあるラベル）
            const maxRight = Math.max(...intersectingLabels.map(l => l.right));
            const offset = maxRight + collisionPadding - x;

            if (window.DEBUG_CONNECTIONS) {
                console.log('Label collision: edge=' + edgeFrom + '->' + edgeTo +
                    ', intersecting=' + intersectingLabels.length +
                    ', offset=' + offset);
            }

            return offset;
        }
    `;
}

module.exports = {
    getCollisionDetector
};
