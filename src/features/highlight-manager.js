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

                            // ルート表示と同時の場合、黄色の輪郭を追加
                            if (nodeElement.classList.contains('path-highlighted')) {
                                this.addDoubleStroke(nodeElement);
                            }
                        }
                    }
                });

                this.currentHighlightedLabel = label;
            },

            addDoubleStroke: function(nodeElement) {
                const rect = nodeElement.querySelector('.node-rect');
                if (!rect) return;

                // 既存の追加輪郭を削除
                const existingOverlay = nodeElement.querySelector('.double-stroke-overlay');
                if (existingOverlay) {
                    existingOverlay.remove();
                }

                // 黄色の輪郭用rect要素を作成
                const overlayRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                overlayRect.setAttribute('class', 'double-stroke-overlay');
                overlayRect.setAttribute('x', rect.getAttribute('x'));
                overlayRect.setAttribute('y', rect.getAttribute('y'));
                overlayRect.setAttribute('width', rect.getAttribute('width'));
                overlayRect.setAttribute('height', rect.getAttribute('height'));
                overlayRect.setAttribute('rx', rect.getAttribute('rx'));
                overlayRect.setAttribute('ry', rect.getAttribute('ry'));
                overlayRect.setAttribute('fill', 'none');
                overlayRect.setAttribute('stroke', '#ffc107');
                overlayRect.setAttribute('stroke-width', '2');
                overlayRect.setAttribute('pointer-events', 'none');

                // rectの直後に挿入
                rect.parentNode.insertBefore(overlayRect, rect.nextSibling);
            },

            clearHighlight: function() {
                if (this.currentHighlightedLabel) {
                    nodes.forEach(node => {
                        if (node.label === this.currentHighlightedLabel) {
                            const nodeElement = document.getElementById(node.id);
                            if (nodeElement) {
                                nodeElement.classList.remove('highlighted');
                                // ルート表示との併用時に追加された黄色輪郭を削除
                                const overlay = nodeElement.querySelector('.double-stroke-overlay');
                                if (overlay) {
                                    overlay.remove();
                                }
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