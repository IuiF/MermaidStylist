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

            // 2パスアルゴリズムによる動的レーン割り当て
            const laneWidth = 25;
            const minOffset = 30;

            // パス1: すべての接続情報を収集
            const edgeInfos = [];

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

            // パス1: すべての接続の情報を収集
            connections.forEach(conn => {
                const fromElement = svgHelpers.getNodeElement(conn.from);
                const toElement = svgHelpers.getNodeElement(conn.to);

                if (!fromElement || !toElement ||
                    fromElement.classList.contains('hidden') ||
                    toElement.classList.contains('hidden')) {
                    return;
                }

                const fromPos = getNodePosition(fromElement);
                const fromDim = getNodeDimensions(fromElement);
                const toPos = getNodePosition(toElement);
                const toDim = getNodeDimensions(toElement);

                const siblings = connectionsByParent[conn.from];
                const siblingIndex = siblings.findIndex(c => c.to === conn.to);
                const siblingCount = siblings.length;

                // ポート位置の計算
                let y1;
                const portMargin = 4;
                if (siblingCount === 1) {
                    y1 = fromPos.top + fromDim.height / 2;
                } else {
                    const availableHeight = fromDim.height - (portMargin * 2);
                    const portSpacing = availableHeight / (siblingCount - 1);
                    y1 = fromPos.top + portMargin + (siblingIndex * portSpacing);
                }

                const x1 = fromPos.left + fromDim.width;
                const x2 = toPos.left;
                const y2 = toPos.top + toDim.height / 2;

                edgeInfos.push({
                    conn: conn,
                    x1: x1,
                    y1: y1,
                    x2: x2,
                    y2: y2,
                    yMin: Math.min(y1, y2),
                    yMax: Math.max(y1, y2),
                    siblingIndex: siblingIndex,
                    siblingCount: siblingCount,
                    parentX: fromPos.left
                });
            });

            // パス2: レーン割り当てと描画
            // 親ノードのX座標でソート（左から右へ処理）
            edgeInfos.sort((a, b) => a.parentX - b.parentX);

            // 親ノードのY座標の範囲を計算（レーン優先順位のため）
            const parentYPositions = {};
            edgeInfos.forEach(info => {
                if (!parentYPositions[info.conn.from]) {
                    const fromElement = svgHelpers.getNodeElement(info.conn.from);
                    if (fromElement) {
                        const pos = getNodePosition(fromElement);
                        parentYPositions[info.conn.from] = pos.top;
                    }
                }
            });

            // 親をY座標でソートして、順位を割り当て
            const parentIds = Object.keys(parentYPositions);
            parentIds.sort((a, b) => parentYPositions[a] - parentYPositions[b]);
            const parentRanks = {};
            parentIds.forEach((id, index) => {
                parentRanks[id] = index;
            });

            // グローバルレーン管理
            const occupiedLanes = []; // { laneIndex, segments: [{yMin, yMax, xRange}] }

            function findBestLane(x1, x2, yMin, yMax, preferredLane) {
                let laneIndex = preferredLane;
                const xMin = Math.min(x1, x2);
                const xMax = Math.max(x1, x2);

                while (true) {
                    const laneX = x1 + minOffset + (laneIndex * laneWidth);

                    // このレーンで衝突があるか確認
                    let hasConflict = false;
                    for (const lane of occupiedLanes) {
                        if (lane.laneIndex === laneIndex) {
                            for (const seg of lane.segments) {
                                // Y範囲とX範囲の両方をチェック
                                const yOverlap = !(yMax < seg.yMin || yMin > seg.yMax);
                                const xOverlap = !(xMax < seg.xMin || xMin > seg.xMax);
                                if (yOverlap && xOverlap) {
                                    hasConflict = true;
                                    break;
                                }
                            }
                            if (hasConflict) break;
                        }
                    }

                    if (!hasConflict) {
                        // レーンを占有
                        let lane = occupiedLanes.find(l => l.laneIndex === laneIndex);
                        if (!lane) {
                            lane = { laneIndex: laneIndex, segments: [] };
                            occupiedLanes.push(lane);
                        }
                        lane.segments.push({
                            yMin: yMin,
                            yMax: yMax,
                            xMin: laneX,
                            xMax: laneX
                        });
                        return laneIndex;
                    }

                    laneIndex++;
                }
            }

            let connectionCount = 0;
            const totalParents = parentIds.length;

            edgeInfos.forEach(edgeInfo => {
                const { conn, x1, y1, x2, y2, yMin, yMax, siblingIndex, siblingCount } = edgeInfo;
                const fromElement = svgHelpers.getNodeElement(conn.from);
                const toElement = svgHelpers.getNodeElement(conn.to);

                // 優先レーンを計算
                // 戦略: 上にある親ほど外側のレーン（大きいインデックス）を使う
                const parentRank = parentRanks[conn.from]; // 0 = 最上位の親
                const basePreference = totalParents - 1 - parentRank; // 上の親ほど大きい値

                // 同じ親内での優先順位（上の子ほど外側）
                const reversedIndex = (siblingCount - 1) - siblingIndex;

                // 総合的な優先レーン
                const preferredLane = basePreference * 3 + reversedIndex;

                // 最適なレーンを見つける
                const assignedLane = findBestLane(x1, x2, yMin, yMax, preferredLane);
                const horizontalOffset = minOffset + (assignedLane * laneWidth);

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
                        x: x2,
                        y: y2 - labelHeight - 5,
                        width: labelWidth,
                        height: labelHeight,
                        fill: '#fff',
                        stroke: '#999',
                        'stroke-width': '1',
                        rx: '3',
                        ry: '3'
                    });

                    const labelText = svgHelpers.createText(conn.label, {
                        x: x2 + labelPadding,
                        y: y2 - labelHeight / 2 - 5,
                        'dominant-baseline': 'central',
                        fill: '#333',
                        'font-size': '11',
                        'font-family': 'Arial, sans-serif'
                    });

                    labelGroup.appendChild(labelRect);
                    labelGroup.appendChild(labelText);
                    svgLayer.appendChild(labelGroup);
                }
            });

            console.log("Created " + connectionCount + " elk-style orthogonal SVG lines");
        }
    `;
}

module.exports = {
    getConnectionRenderer
};