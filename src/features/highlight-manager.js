function getHighlightManager() {
    return `
        const highlightManager = {
            currentHighlightedLabel: null,

            highlightAllByLabel: function(label) {
                // 既存のハイライトを解除
                this.clearHighlight();

                // 新しいラベルをハイライト
                nodes.forEach(node => {
                    if (node.label === label) {
                        const nodeElement = document.getElementById(node.id);
                        if (nodeElement) {
                            nodeElement.classList.add('highlighted');
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
                    this.currentHighlightedLabel = null;
                }
            }
        };
    `;
}

module.exports = {
    getHighlightManager
};