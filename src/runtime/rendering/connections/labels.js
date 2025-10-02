function getConnectionLabels() {
    return `
        // ラベル描画の共通処理
        let labelPositions = [];

        function createConnectionLabel(conn, toElement) {
            if (!conn.label) return null;

            const fromElement = document.getElementById(conn.from);
            if (!fromElement) return null;

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

            const fromPos = getNodePosition(fromElement);
            const toPos = getNodePosition(toElement);

            // エッジの中間点を計算
            const fromDim = getNodeDimensions(fromElement);
            const toDim = getNodeDimensions(toElement);

            const fromCenterX = fromPos.left + fromDim.width / 2;
            const fromCenterY = fromPos.top + fromDim.height / 2;
            const toCenterX = toPos.left + toDim.width / 2;
            const toCenterY = toPos.top + toDim.height / 2;

            // 中間点
            let labelX = (fromCenterX + toCenterX) / 2 - labelWidth / 2;
            let labelY = (fromCenterY + toCenterY) / 2 - labelHeight / 2;

            // 衝突回避: 既存のラベルとの重なりをチェック
            let maxAttempts = 10;
            let attempt = 0;
            while (attempt < maxAttempts) {
                let hasCollision = false;
                for (const existing of labelPositions) {
                    if (Math.abs(labelX - existing.x) < labelWidth + 5 &&
                        Math.abs(labelY - existing.y) < labelHeight + 5) {
                        hasCollision = true;
                        break;
                    }
                }

                if (!hasCollision) {
                    break;
                }

                // 衝突があった場合、少し横にずらす
                labelY -= (labelHeight + 5);
                attempt++;
            }

            // 位置を記録
            labelPositions.push({ x: labelX, y: labelY, width: labelWidth, height: labelHeight });

            const labelGroup = svgHelpers.createGroup({
                class: 'connection-label'
            });

            const labelRect = svgHelpers.createRect({
                x: labelX,
                y: labelY,
                width: labelWidth,
                height: labelHeight,
                fill: '#fff',
                stroke: '#999',
                'stroke-width': '1',
                rx: '3',
                ry: '3'
            });

            const labelText = svgHelpers.createText(conn.label, {
                x: labelX + labelPadding,
                y: labelY + labelHeight / 2,
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
