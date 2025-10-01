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

            // ノードの階層を計算（ルートからの深さ）
            const nodeDepths = {};
            function calculateDepth(nodeId, depth = 0) {
                if (nodeDepths[nodeId] !== undefined) {
                    return;
                }
                nodeDepths[nodeId] = depth;
                const children = connections.filter(c => c.from === nodeId);
                children.forEach(c => calculateDepth(c.to, depth + 1));
            }

            // ルートノードを見つけて深さ計算を開始
            const allNodeIds = new Set([...connections.map(c => c.from), ...connections.map(c => c.to)]);
            const childNodeIds = new Set(connections.map(c => c.to));
            const rootNodeIds = [...allNodeIds].filter(id => !childNodeIds.has(id));
            rootNodeIds.forEach(rootId => calculateDepth(rootId, 0));

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

                // 子が持つ親の数をカウント
                const parentCount = connections.filter(c => c.to === conn.to).length;

                // すべてのエッジは親の中央から出発
                const y1 = fromPos.top + fromDim.height / 2;
                const x1 = fromPos.left + fromDim.width;
                const x2 = toPos.left;
                const y2 = toPos.top + toDim.height / 2;

                // 1:1の親子関係を判定（親が1つの子のみ、子が1つの親のみ）
                const is1to1 = (siblingCount === 1 && parentCount === 1);

                // 真横にある1:1（Y座標差が小さい）を判定
                const yDiff = Math.abs(y2 - y1);
                const is1to1Horizontal = is1to1 && (yDiff < 5);

                // エッジの階層（親の深さ）
                const edgeDepth = nodeDepths[conn.from] || 0;

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
                    parentX: fromPos.left,
                    parentY: fromPos.top,
                    depth: edgeDepth,
                    is1to1: is1to1,
                    is1to1Horizontal: is1to1Horizontal
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

            // 階層ごとに親の右端の最大位置を計算（真横の1:1のみ除外）
            const depthMaxParentRight = {}; // depth -> max(parentRight)
            const depthMinChildLeft = {}; // depth -> min(childLeft)

            edgeInfos.forEach(info => {
                // 真横の1:1のみレーン計算から除外
                if (info.is1to1Horizontal) return;

                const depth = info.depth;

                // 親の右端
                if (!depthMaxParentRight[depth] || info.x1 > depthMaxParentRight[depth]) {
                    depthMaxParentRight[depth] = info.x1;
                }

                // 子の左端
                if (!depthMinChildLeft[depth] || info.x2 < depthMinChildLeft[depth]) {
                    depthMinChildLeft[depth] = info.x2;
                }
            });

            // 階層ごとのレーン管理
            const lanesByDepth = {}; // depth -> [{ laneIndex, segments: [{yMin, yMax}] }]
            const parentAssignedLanes = {}; // parentId -> laneIndex

            function findBestLaneForParent(parentId, depth, childrenYMin, childrenYMax, preferredLane) {
                // すでに割り当て済みの場合はそれを返す
                if (parentAssignedLanes[parentId] !== undefined) {
                    return parentAssignedLanes[parentId];
                }

                // この階層のレーン配列を取得または作成
                if (!lanesByDepth[depth]) {
                    lanesByDepth[depth] = [];
                }
                const occupiedLanes = lanesByDepth[depth];

                let laneIndex = preferredLane;

                while (true) {
                    // このレーンで衝突があるか確認
                    let hasConflict = false;
                    for (const lane of occupiedLanes) {
                        if (lane.laneIndex === laneIndex) {
                            for (const seg of lane.segments) {
                                // Y範囲をチェック
                                const yOverlap = !(childrenYMax < seg.yMin || childrenYMin > seg.yMax);
                                if (yOverlap) {
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
                            yMin: childrenYMin,
                            yMax: childrenYMax
                        });

                        // 親にレーンを割り当て
                        parentAssignedLanes[parentId] = laneIndex;
                        return laneIndex;
                    }

                    laneIndex++;
                }
            }

            // 親ごとに子のY範囲を計算（真横の1:1のみ除外）
            const parentChildrenYRanges = {};
            edgeInfos.forEach(info => {
                // 真横の1:1のみレーン計算から除外
                if (info.is1to1Horizontal) return;

                if (!parentChildrenYRanges[info.conn.from]) {
                    parentChildrenYRanges[info.conn.from] = { yMin: Infinity, yMax: -Infinity };
                }
                const range = parentChildrenYRanges[info.conn.from];
                range.yMin = Math.min(range.yMin, info.y2);
                range.yMax = Math.max(range.yMax, info.y2);
            });

            let connectionCount = 0;

            edgeInfos.forEach(edgeInfo => {
                const { conn, x1, y1, x2, y2, yMin, yMax, siblingIndex, siblingCount, depth, is1to1, is1to1Horizontal } = edgeInfo;

                // 真横の1:1親子関係は直線で描画
                if (is1to1Horizontal) {
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

                    // 矢印を作成（水平方向）
                    const angle = 0;
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

                    // ラベルがあれば追加
                    if (conn.label) {
                        const toElement = svgHelpers.getNodeElement(conn.to);
                        const toPos = getNodePosition(toElement);
                        const toLeft = toPos.left;
                        const toTop = toPos.top;

                        const labelPadding = 4;
                        const labelWidth = conn.label.length * 6 + labelPadding * 2;
                        const labelHeight = 16;

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
                            'stroke-width': 1,
                            rx: 2,
                            ry: 2
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

                    connectionCount++;
                    return;
                }
                const fromElement = svgHelpers.getNodeElement(conn.from);
                const toElement = svgHelpers.getNodeElement(conn.to);

                // この階層内での親のランクを計算（真横の1:1のみ除外）
                const parentsAtThisDepth = edgeInfos
                    .filter(e => e.depth === depth && !e.is1to1Horizontal)
                    .map(e => e.conn.from)
                    .filter((v, i, a) => a.indexOf(v) === i) // ユニーク
                    .sort((a, b) => (parentYPositions[a] || 0) - (parentYPositions[b] || 0));

                const parentRankInDepth = parentsAtThisDepth.indexOf(conn.from);
                const totalParentsInDepth = parentsAtThisDepth.length;
                const basePreference = totalParentsInDepth - 1 - parentRankInDepth;
                const preferredLane = basePreference * 3;

                // 親のレーンを取得または割り当て
                const childrenRange = parentChildrenYRanges[conn.from];
                const assignedLane = findBestLaneForParent(
                    conn.from,
                    depth,
                    childrenRange.yMin,
                    childrenRange.yMax,
                    preferredLane
                );

                // この階層での垂直セグメントの配置範囲を計算
                const maxParentRight = depthMaxParentRight[depth] || x1;
                const minChildLeft = depthMinChildLeft[depth] || x2;
                const availableWidth = Math.max(minChildLeft - maxParentRight - minOffset * 2, 50);

                // レーンをこの範囲内に配置
                const maxLanes = Math.max(totalParentsInDepth * 3, 10);
                const laneSpacing = Math.max(5, Math.min(laneWidth, availableWidth / maxLanes));

                // 垂直セグメントのX座標
                const verticalSegmentX = maxParentRight + minOffset + (assignedLane * laneSpacing);
                const horizontalOffset = verticalSegmentX - x1;

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

                    // 子ノードの位置情報を取得（直線描画と同じ基準）
                    const toElement = svgHelpers.getNodeElement(conn.to);
                    const toPos = getNodePosition(toElement);
                    const toLeft = toPos.left;
                    const toTop = toPos.top;

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
            });
        }
    `;
}

module.exports = {
    getConnectionRenderer
};