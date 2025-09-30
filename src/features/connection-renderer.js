function getConnectionRenderer() {
    return `
        // 依存: svgHelpers (svg-helpers.js), getNodePosition, getNodeDimensions (layout-utils.js)
        let useCurvedLines = false;

        window.toggleLineStyle = function() {
            useCurvedLines = !useCurvedLines;
            return useCurvedLines;
        }

        window.createCSSLines = function(connections, nodePositions) {
            if (useCurvedLines) {
                return createCurvedLines(connections, nodePositions);
            }
            return createStraightLines(connections, nodePositions);
        }

        function createStraightLines(connections, nodePositions) {
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

        function createCurvedLines(connections, nodePositions) {
            const svgLayer = svgHelpers.getSVGLayer();
            if (!svgLayer) {
                console.error('SVG layer element not found');
                return;
            }

            // 既存の接続線とラベルを削除
            const existingLines = svgLayer.querySelectorAll('.connection-line, .connection-arrow, .connection-label');
            existingLines.forEach(line => line.remove());

            // 同じ親から出る接続をグループ化し、子のY座標でソート
            const connectionsByParent = {};
            connections.forEach(conn => {
                if (!connectionsByParent[conn.from]) {
                    connectionsByParent[conn.from] = [];
                }
                connectionsByParent[conn.from].push(conn);
            });

            // 各親の接続を子ノードのY座標でソート
            Object.keys(connectionsByParent).forEach(parentId => {
                connectionsByParent[parentId].sort((a, b) => {
                    const aElement = svgHelpers.getNodeElement(a.to);
                    const bElement = svgHelpers.getNodeElement(b.to);
                    if (!aElement || !bElement) return 0;
                    const aPos = getNodePosition(aElement);
                    const bPos = getNodePosition(bElement);
                    return aPos.top - bPos.top;
                });
            });

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

                    // 同じ親から出る接続の数とソート済みインデックスを取得
                    const siblings = connectionsByParent[conn.from];
                    const siblingIndex = siblings.findIndex(c => c.to === conn.to);
                    const siblingCount = siblings.length;

                    // ポート割り当て: 親ノードの出発点を子の位置に応じて最適化
                    let y1, x1;
                    const portMargin = 4; // ノード端からのマージン
                    if (siblingCount === 1) {
                        // 単一の接続: 中央から出発
                        y1 = fromTop + fromHeight / 2;
                        x1 = fromLeft + fromWidth;
                    } else {
                        // 複数の接続: ノードの高さに沿って均等に配置
                        const availableHeight = fromHeight - (portMargin * 2);
                        const portSpacing = availableHeight / (siblingCount - 1);
                        y1 = fromTop + portMargin + (siblingIndex * portSpacing);
                        x1 = fromLeft + fromWidth;
                    }

                    // 子ノードの到達点も同様に最適化
                    const x2 = toLeft;
                    const y2 = toTop + toHeight / 2; // 子ノードは中央で固定（簡易実装）

                    // ELKスタイル: 直交エッジ（orthogonal edges）
                    // 1. 親から水平に出る
                    // 2. 垂直に移動
                    // 3. 水平に子に到達
                    // 垂直セグメントの位置を接続ごとにずらして重複を回避
                    const baseHorizontalOffset = 40;
                    const offsetPerConnection = 15;
                    const horizontalOffset = baseHorizontalOffset + (siblingIndex * offsetPerConnection);
                    const cornerRadius = 8;

                    const p1x = x1;
                    const p1y = y1;
                    const p2x = x1 + horizontalOffset;
                    const p2y = y1;
                    const p3x = p2x;
                    const p3y = y2;
                    const p4x = x2;
                    const p4y = y2;

                    // 角を丸める場合のパス
                    let pathData;
                    if (Math.abs(p3y - p2y) > cornerRadius * 2) {
                        // 角を丸める
                        if (p3y > p2y) {
                            // 下向き
                            pathData = \`M \${p1x} \${p1y} L \${p2x - cornerRadius} \${p2y} Q \${p2x} \${p2y} \${p2x} \${p2y + cornerRadius} L \${p3x} \${p3y - cornerRadius} Q \${p3x} \${p3y} \${p3x + cornerRadius} \${p3y} L \${p4x} \${p4y}\`;
                        } else {
                            // 上向き
                            pathData = \`M \${p1x} \${p1y} L \${p2x - cornerRadius} \${p2y} Q \${p2x} \${p2y} \${p2x} \${p2y - cornerRadius} L \${p3x} \${p3y + cornerRadius} Q \${p3x} \${p3y} \${p3x + cornerRadius} \${p3y} L \${p4x} \${p4y}\`;
                        }
                    } else {
                        // 直線
                        pathData = \`M \${p1x} \${p1y} L \${p2x} \${p2y} L \${p3x} \${p3y} L \${p4x} \${p4y}\`;
                    }

                    const path = svgHelpers.createPath(pathData, {
                        class: 'connection-line',
                        'data-from': conn.from,
                        'data-to': conn.to,
                        fill: 'none'
                    });

                    svgLayer.appendChild(path);

                    // 矢印を作成（水平方向に進入）
                    const angle = 0; // 水平方向
                    const arrowSize = 8;
                    const arrowX = x2;
                    const arrowY = y2;

                    const ap1x = arrowX;
                    const ap1y = arrowY;
                    const ap2x = arrowX - arrowSize * Math.cos(angle - Math.PI / 6);
                    const ap2y = arrowY - arrowSize * Math.sin(angle - Math.PI / 6);
                    const ap3x = arrowX - arrowSize * Math.cos(angle + Math.PI / 6);
                    const ap3y = arrowY - arrowSize * Math.sin(angle + Math.PI / 6);

                    const arrow = svgHelpers.createPolygon(\`\${ap1x},\${ap1y} \${ap2x},\${ap2y} \${ap3x},\${ap3y}\`, {
                        class: 'connection-arrow',
                        'data-from': conn.from,
                        'data-to': conn.to
                    });

                    svgLayer.appendChild(arrow);
                    connectionCount++;

                    // ラベルがある場合は表示
                    if (conn.label) {
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

                        const labelGroup = svgHelpers.createGroup({
                            class: 'connection-label'
                        });

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

            console.log("Created " + connectionCount + " elk-style orthogonal SVG lines");
        }
    `;
}

module.exports = {
    getConnectionRenderer
};