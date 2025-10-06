function getCollisionDetector() {
    return `
        // 衝突検出と回避計算を行う純粋関数モジュール

        // 2つの矩形範囲が重なるかチェック（汎用関数）
        function checkRectOverlap(rect1, rect2) {
            const xOverlap = !(rect1.right < rect2.left || rect1.left > rect2.right);
            const yOverlap = !(rect1.bottom < rect2.top || rect1.top > rect2.bottom);
            return xOverlap && yOverlap;
        }

        // 垂直線と交差するオブジェクトを検出（汎用関数）
        function findVerticalLineIntersections(x, y1, y2, objects, padding) {
            const yMin = Math.min(y1, y2);
            const yMax = Math.max(y1, y2);
            const lineRect = {
                left: x - padding,
                right: x + padding,
                top: yMin - padding,
                bottom: yMax + padding
            };

            return objects.filter(obj => checkRectOverlap(lineRect, obj));
        }

        // 水平線と交差するオブジェクトを検出（汎用関数）
        function findHorizontalLineIntersections(x1, x2, y, objects, padding) {
            const xMin = Math.min(x1, x2);
            const xMax = Math.max(x1, x2);
            const lineRect = {
                left: xMin - padding,
                right: xMax + padding,
                top: y - padding,
                bottom: y + padding
            };

            return objects.filter(obj => checkRectOverlap(lineRect, obj));
        }

        // エッジの経路全体でノードとの衝突をチェック
        function checkEdgePathIntersectsNodes(x1, y1, x2, y2, nodeBounds) {
            const padding = CONNECTION_CONSTANTS.COLLISION_PADDING_NODE;
            const pathRect = {
                left: Math.min(x1, x2) - padding,
                right: Math.max(x1, x2) + padding,
                top: Math.min(y1, y2) - padding,
                bottom: Math.max(y1, y2) + padding
            };

            return nodeBounds.filter(node => checkRectOverlap(pathRect, node));
        }

        // 垂直線の衝突回避オフセットを計算（汎用関数）
        function calculateVerticalAvoidanceOffset(x, y1, y2, objects, padding, edgeFrom, edgeTo, objectType) {
            const intersections = findVerticalLineIntersections(x, y1, y2, objects, padding);

            if (intersections.length === 0) return 0;

            const maxRight = Math.max(...intersections.map(obj => obj.right));
            const offset = maxRight + padding - x;

            if (window.DEBUG_CONNECTIONS) {
                const ids = intersections.map(obj => obj.id || 'label').join(',');
                console.log(objectType + ' collision: edge=' + edgeFrom + '->' + edgeTo +
                    ', intersecting=' + ids + ', offset=' + offset);
            }

            return offset;
        }

        // ノードを避けるためのX座標オフセットを計算
        function calculateNodeAvoidanceOffset(x, y1, y2, nodeBounds, edgeFrom, edgeTo) {
            return calculateVerticalAvoidanceOffset(
                x, y1, y2, nodeBounds,
                CONNECTION_CONSTANTS.COLLISION_PADDING_NODE,
                edgeFrom, edgeTo, 'Node'
            );
        }

        // ラベルを避けるためのX座標オフセットを計算
        function calculateLabelAvoidanceOffset(x, y1, y2, labelBounds, edgeFrom, edgeTo) {
            return calculateVerticalAvoidanceOffset(
                x, y1, y2, labelBounds,
                CONNECTION_CONSTANTS.COLLISION_PADDING_LABEL,
                edgeFrom, edgeTo, 'Label'
            );
        }
    `;
}

module.exports = {
    getCollisionDetector
};
