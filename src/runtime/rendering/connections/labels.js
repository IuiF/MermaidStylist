function getConnectionLabels() {
    return `
        // ラベル描画の共通処理
        let labelOffsets = {};

        function createConnectionLabel(conn, toElement) {
            if (!conn.label) return null;

            const svgLayer = svgHelpers.getEdgeLayer();
            const tempText = svgHelpers.createText(conn.label, {
                'font-size': '11',
                'font-family': 'Arial, sans-serif'
            });
            svgLayer.appendChild(tempText);
            const textBBox = tempText.getBBox();
            svgLayer.removeChild(tempText);

            const labelPadding = 4;
            const labelWidth = textBBox.width + labelPadding * 2;
            const labelHeight = textBBox.height + labelPadding * 2;

            const toPos = getNodePosition(toElement);
            const toLeft = toPos.left;
            const toTop = toPos.top;

            // 同じターゲットノードへのラベル数を計算してオフセットを決定
            const toNodeId = conn.to;
            if (!labelOffsets[toNodeId]) {
                labelOffsets[toNodeId] = 0;
            }
            const offset = labelOffsets[toNodeId];
            labelOffsets[toNodeId]++;

            const labelGroup = svgHelpers.createGroup({
                class: 'connection-label'
            });

            const labelRect = svgHelpers.createRect({
                x: toLeft,
                y: toTop - labelHeight - 5 - (offset * (labelHeight + 2)),
                width: labelWidth,
                height: labelHeight,
                fill: '#fff',
                stroke: '#999',
                'stroke-width': '1',
                rx: '3',
                ry: '3'
            });

            const labelText = svgHelpers.createText(conn.label, {
                x: toLeft + labelPadding,
                y: toTop - labelHeight / 2 - 5 - (offset * (labelHeight + 2)),
                'dominant-baseline': 'central',
                fill: '#333',
                'font-size': '11',
                'font-family': 'Arial, sans-serif'
            });

            labelGroup.appendChild(labelRect);
            labelGroup.appendChild(labelText);
            return labelGroup;
        }
    `;
}

module.exports = {
    getConnectionLabels
};
