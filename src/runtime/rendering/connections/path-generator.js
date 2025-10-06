function getPathGenerator() {
    return `
        // SVGパス生成モジュール

        /**
         * カーブパスを生成（1to1水平エッジ用）
         */
        function createSimplePath(x1, y1, x2, y2) {
            const controlOffsetX = (x2 - x1) * CONNECTION_CONSTANTS.CURVE_CONTROL_RATIO;
            return 'M ' + x1 + ' ' + y1 +
                   ' C ' + (x1 + controlOffsetX) + ' ' + y1 +
                   ', ' + (x2 - controlOffsetX) + ' ' + y2 +
                   ', ' + x2 + ' ' + y2;
        }

        /**
         * 複雑なカーブパスを生成（垂直セグメント、衝突回避を考慮）
         */
        function createCurvedPath(x1, y1, x2, y2, verticalX, labelBounds, nodeBounds, fromNodeId, toNodeId, fromNodeRight, finalVerticalX) {
            const useFinalVerticalX = finalVerticalX !== undefined && finalVerticalX !== null;
            const actualVerticalX = useFinalVerticalX ? finalVerticalX : verticalX;

            // 水平線の折り返しチェック
            const avoidanceX = calculateHorizontalLineAvoidance(x1, actualVerticalX, y1, labelBounds);
            const foldX = avoidanceX !== null ? avoidanceX : actualVerticalX;

            // パス生成
            const midY1 = y1;
            const midY2 = y2;
            const controlOffset = 20;

            let path = 'M ' + x1 + ' ' + y1;
            path += ' L ' + foldX + ' ' + midY1;
            path += ' Q ' + foldX + ' ' + ((midY1 + midY2) / 2) + ', ' + foldX + ' ' + midY2;
            path += ' L ' + x2 + ' ' + y2;

            return path;
        }

        /**
         * エッジタイプに応じたパスを生成
         */
        function generateEdgePath(edgeType, params) {
            switch (edgeType) {
                case 'simple':
                    return createSimplePath(params.x1, params.y1, params.x2, params.y2);
                case 'curved':
                    return createCurvedPath(
                        params.x1, params.y1, params.x2, params.y2,
                        params.verticalX, params.labelBounds, params.nodeBounds,
                        params.fromNodeId, params.toNodeId,
                        params.fromNodeRight, params.finalVerticalX
                    );
                default:
                    throw new Error('Unknown edge type: ' + edgeType);
            }
        }
    `;
}

module.exports = {
    getPathGenerator
};
