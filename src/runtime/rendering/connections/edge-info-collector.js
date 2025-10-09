function getEdgeInfoCollector() {
    return `
        // エッジ情報の収集と分類モジュール

        const edgeInfoCollector = {
            /**
             * 全接続からエッジ情報を収集
             * @param {Array} connections - 接続情報の配列
             * @param {Object} nodeDepths - ノードの階層マップ
             * @param {Object} connectionsByParent - 親ごとの接続マップ
             * @returns {Array} エッジ情報の配列
             */
            collectEdgeInfos: function(connections, nodeDepths, connectionsByParent) {
                const edgeInfos = [];

                connections.forEach(conn => {
                    const fromElement = svgHelpers.getNodeElement(conn.from);
                    const toElement = svgHelpers.getNodeElement(conn.to);

                    if (!fromElement || !toElement) {
                        if (window.DEBUG_CONNECTIONS && conn.isDashed) {
                            console.log('  - Skipping dashed edge: ' + conn.from + ' --> ' + conn.to +
                                ' fromElement: ' + !!fromElement + ' toElement: ' + !!toElement);
                        }
                        return;
                    }

                    const fromPos = svgHelpers.getNodePosition(fromElement);
                    const fromDim = svgHelpers.getNodeDimensions(fromElement);
                    const toPos = svgHelpers.getNodePosition(toElement);
                    const toDim = svgHelpers.getNodeDimensions(toElement);

                    const siblings = connectionsByParent[conn.from];
                    const siblingIndex = siblings.findIndex(c => c.to === conn.to);
                    const siblingCount = siblings.length;

                    // 子が持つ親の数をカウント
                    const parentCount = connections.filter(c => c.to === conn.to).length;

                    // すべてのエッジは親の中央から出発
                    const y1 = fromPos.top + fromDim.height / 2;
                    const x1 = fromPos.left + fromDim.width;
                    const x2 = toPos.left;
                    const y2 = toPos.top + toDim.height / 2;

                    // 1:1の親子関係を判定（親が1つの子のみ、子が1つの親のみ）
                    const is1to1 = (siblingCount === 1 && parentCount === 1);

                    // 真横にある1:1（Y座標差が小さい）を判定
                    const yDiff = Math.abs(y2 - y1);
                    const is1to1Horizontal = is1to1 && (yDiff < 5);

                    // エッジの階層（親の深さ）
                    const edgeDepth = nodeDepths[conn.from] || 0;

                    edgeInfos.push({
                        conn: conn,
                        x1: x1,
                        y1: y1,
                        x2: x2,
                        y2: y2,
                        yMin: Math.min(y1, y2),
                        yMax: Math.max(y1, y2),
                        siblingIndex: siblingIndex,
                        siblingCount: siblingCount,
                        parentX: fromPos.left,
                        parentY: fromPos.top,
                        depth: edgeDepth,
                        is1to1: is1to1,
                        is1to1Horizontal: is1to1Horizontal
                    });
                });

                return edgeInfos;
            }
        };
    `;
}

module.exports = {
    getEdgeInfoCollector
};
