function getHighlightManager() {
    return `
        const highlightManager = {
            currentHighlightedLabel: null,

            highlightAllByLabel: function(label) {
                // 既存のハイライトを解除
                this.clearHighlight();

                // 該当するノードのIDを収集
                const highlightedNodeIds = new Set();
                nodes.forEach(node => {
                    if (node.label === label) {
                        const nodeElement = document.getElementById(node.id);
                        if (nodeElement) {
                            nodeElement.classList.add('highlighted');
                            highlightedNodeIds.add(node.id);
                        }
                    }
                });

                // 該当するノード間の接続線を強調表示
                const allLines = document.querySelectorAll('.connection-line');
                allLines.forEach(line => {
                    const from = line.dataset.from;
                    const to = line.dataset.to;
                    if (from && to) {
                        if (highlightedNodeIds.has(from) || highlightedNodeIds.has(to)) {
                            line.classList.add('highlighted-line');
                        }
                    }
                });

                this.currentHighlightedLabel = label;
            },

            clearHighlight: function() {
                if (this.currentHighlightedLabel) {
                    nodes.forEach(node => {
                        if (node.label === this.currentHighlightedLabel) {
                            const nodeElement = document.getElementById(node.id);
                            if (nodeElement) {
                                nodeElement.classList.remove('highlighted');
                            }
                        }
                    });

                    // 接続線からhighlighted-lineクラスを削除
                    document.querySelectorAll('.highlighted-line').forEach(line => {
                        line.classList.remove('highlighted-line');
                    });

                    this.currentHighlightedLabel = null;
                }
            }
        };
    `;
}

module.exports = {
    getHighlightManager
};