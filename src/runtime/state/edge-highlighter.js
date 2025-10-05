function getEdgeHighlighter() {
    return `
        const edgeHighlighter = {
            /**
             * エッジをハイライト表示する
             * @param {string} fromId - 開始ノードID
             * @param {string} toId - 終了ノードID
             */
            highlightEdge: function(fromId, toId) {
                // 既存のハイライトを解除
                this.clearHighlight();

                // エッジパスを探す
                const edgePath = document.querySelector('path[data-from="' + fromId + '"][data-to="' + toId + '"]');
                if (edgePath) {
                    // ハイライトを適用
                    edgePath.classList.add('edge-highlighted');
                    edgePath.style.stroke = '#ff6b6b';
                    edgePath.style.strokeWidth = '3';

                    // エッジを最上レイヤーに移動
                    this.bringToFront(fromId, toId);
                }
            },

            /**
             * エッジを最上レイヤーに移動（色変更なし）
             * @param {string} fromId - 開始ノードID
             * @param {string} toId - 終了ノードID
             */
            bringToFront: function(fromId, toId) {
                // ラインと矢印の両方を取得して最前面に移動
                const edgeElements = document.querySelectorAll('.connection-line[data-from="' + fromId + '"][data-to="' + toId + '"], .connection-arrow[data-from="' + fromId + '"][data-to="' + toId + '"]');
                edgeElements.forEach(edgeElement => {
                    if (edgeElement && edgeElement.parentNode) {
                        edgeElement.parentNode.appendChild(edgeElement);
                    }
                });
            },

            /**
             * 複数のエッジを最上レイヤーに移動
             * @param {Array} connections - 接続情報の配列 [{from, to}, ...]
             */
            bringMultipleToFront: function(connections) {
                connections.forEach(conn => {
                    this.bringToFront(conn.from, conn.to);
                });
            },

            /**
             * すべてのハイライトを解除
             */
            clearHighlight: function() {
                document.querySelectorAll('.edge-highlighted').forEach(el => {
                    el.classList.remove('edge-highlighted');
                    el.style.stroke = '';
                    el.style.strokeWidth = '';
                });
            }
        };

        window.edgeHighlighter = edgeHighlighter;
    `;
}

module.exports = {
    getEdgeHighlighter
};
