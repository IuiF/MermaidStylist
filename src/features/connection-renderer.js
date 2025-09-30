function getConnectionRenderer() {
    return `
        function createCSSLines(connections, nodePositions) {
            const svgLayer = svgHelpers.getSVGLayer();
            if (!svgLayer) {
                console.error('SVG layer element not found');
                return;
            }

            // 既存の接続線とラベルを削除
            const existingLines = svgLayer.querySelectorAll('.connection-line, .connection-arrow, .connection-label');
            existingLines.forEach(line => line.remove());

            let connectionCount = 0;
            connections.forEach(conn => {
                const fromElement = svgHelpers.getNodeElement(conn.from);
                const toElement = svgHelpers.getNodeElement(conn.to);

                // 両端のノードが存在し、かつ表示されている場合のみ接続線を描画
                if (fromElement && toElement &&
                    !fromElement.classList.contains('hidden') &&
                    !toElement.classList.contains('hidden')) {

                    // ノードの位置と寸法を取得
                    const fromPos = getNodePosition(fromElement);
                    const fromDim = getNodeDimensions(fromElement);
                    const fromLeft = fromPos.left;
                    const fromTop = fromPos.top;
                    const fromWidth = fromDim.width;
                    const fromHeight = fromDim.height;

                    const toPos = getNodePosition(toElement);
                    const toDim = getNodeDimensions(toElement);
                    const toLeft = toPos.left;
                    const toTop = toPos.top;
                    const toWidth = toDim.width;
                    const toHeight = toDim.height;

                    const x1 = fromLeft + fromWidth;
                    const y1 = fromTop + fromHeight / 2;
                    const x2 = toLeft;
                    const y2 = toTop + toHeight / 2;

                    // SVG line要素を作成
                    const line = svgHelpers.createLine({
                        class: 'connection-line',
                        x1: x1,
                        y1: y1,
                        x2: x2,
                        y2: y2,
                        'data-from': conn.from,
                        'data-to': conn.to
                    });

                    svgLayer.appendChild(line);

                    // 矢印を作成
                    const angle = Math.atan2(y2 - y1, x2 - x1);
                    const arrowSize = 8;
                    const arrowX = x2;
                    const arrowY = y2;

                    const p1x = arrowX;
                    const p1y = arrowY;
                    const p2x = arrowX - arrowSize * Math.cos(angle - Math.PI / 6);
                    const p2y = arrowY - arrowSize * Math.sin(angle - Math.PI / 6);
                    const p3x = arrowX - arrowSize * Math.cos(angle + Math.PI / 6);
                    const p3y = arrowY - arrowSize * Math.sin(angle + Math.PI / 6);

                    const arrow = svgHelpers.createPolygon(\`\${p1x},\${p1y} \${p2x},\${p2y} \${p3x},\${p3y}\`, {
                        class: 'connection-arrow',
                        'data-from': conn.from,
                        'data-to': conn.to
                    });

                    svgLayer.appendChild(arrow);
                    connectionCount++;

                    // ラベルがある場合は表示（SVG rect + text要素として）
                    if (conn.label) {
                        // テキストサイズを測定
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

                        // グループを作成
                        const labelGroup = svgHelpers.createGroup({
                            class: 'connection-label'
                        });

                        // 背景矩形
                        const labelRect = svgHelpers.createRect({
                            x: toLeft,
                            y: toTop - labelHeight - 5,
                            width: labelWidth,
                            height: labelHeight,
                            fill: '#fff',
                            stroke: '#999',
                            'stroke-width': '1',
                            rx: '3',
                            ry: '3'
                        });

                        // テキスト
                        const labelText = svgHelpers.createText(conn.label, {
                            x: toLeft + labelPadding,
                            y: toTop - labelHeight / 2 - 5,
                            'dominant-baseline': 'central',
                            fill: '#333',
                            'font-size': '11',
                            'font-family': 'Arial, sans-serif'
                        });

                        labelGroup.appendChild(labelRect);
                        labelGroup.appendChild(labelText);
                        svgLayer.appendChild(labelGroup);
                    }
                }
            });

            console.log("Created " + connectionCount + " SVG lines");
        }
    `;
}

module.exports = {
    getConnectionRenderer
};