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
                    const parent = edgePath.parentNode;
                    if (parent) {
                        parent.appendChild(edgePath);
                    }
                }
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
