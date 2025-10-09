function getBoundsCollector() {
    return `
        // ノードとラベルの座標を収集するモジュール（DOM依存）

        // すべてのノードの座標を取得
        function getAllNodeBounds(excludeFrom, excludeTo) {
            const nodes = [];
            allNodes.forEach(node => {
                if (node.id === excludeFrom || node.id === excludeTo) return;

                const element = svgHelpers.getNodeElement(node.id);
                if (element && !element.classList.contains('hidden')) {
                    const pos = svgHelpers.getNodePosition(element);
                    const dim = svgHelpers.getNodeDimensions(element);
                    nodes.push({
                        id: node.id,
                        left: pos.left,
                        top: pos.top,
                        right: pos.left + dim.width,
                        bottom: pos.top + dim.height,
                        width: dim.width,
                        height: dim.height
                    });
                }
            });
            return nodes;
        }

        // すべてのラベルの座標を取得
        function getAllLabelBounds() {
            const svgLayer = svgHelpers.getEdgeLayer();
            const labels = svgLayer.querySelectorAll('.connection-label');
            const labelBounds = [];

            labels.forEach(label => {
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
    `;
}

module.exports = {
    getBoundsCollector
};
