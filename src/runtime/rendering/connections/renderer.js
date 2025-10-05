function getConnectionRenderer() {
    const connectionArrows = require('./arrows').getConnectionArrows();
    const connectionLabels = require('./labels').getConnectionLabels();
    const collisionDetector = require('./collision-detector').getCollisionDetector();

    return connectionArrows + connectionLabels + collisionDetector + `
        // 依存: svgHelpers (svg-helpers.js), getNodePosition, getNodeDimensions (layout-utils.js)
        let useCurvedLines = true;

        window.toggleLineStyle = function() {
            useCurvedLines = !useCurvedLines;
            return useCurvedLines;
        }

        window.createCSSLines = function(connections, nodePositions) {
            // エッジをレベル差でソート（長いエッジを先に描画して背面に配置）
            const sortedConnections = [...connections].sort((a, b) => {
                const posA = nodePositions[a.from];
                const posB = nodePositions[b.from];
                const posATo = nodePositions[a.to];
                const posBTo = nodePositions[b.to];

                if (!posA || !posB || !posATo || !posBTo) return 0;

                const levelDiffA = Math.abs(posATo.level - posA.level);
                const levelDiffB = Math.abs(posBTo.level - posB.level);

                return levelDiffB - levelDiffA; // 降順（長いエッジが先）
            });

            if (useCurvedLines) {
                return createCurvedLines(sortedConnections, nodePositions);
            }
            return createStraightLines(sortedConnections, nodePositions);
        }

        // ノードの階層（深さ）を計算
        function calculateNodeDepths(connections) {
            const nodeDepths = {};
            const allNodeIds = new Set([...connections.map(c => c.from), ...connections.map(c => c.to)]);
            const childNodeIds = new Set(connections.map(c => c.to));
            const rootNodeIds = [...allNodeIds].filter(id => !childNodeIds.has(id));

            // ルートノードをレベル0として開始
            const queue = [];
            rootNodeIds.forEach(rootId => {
                nodeDepths[rootId] = 0;
                queue.push(rootId);
            });

            // BFSで階層を計算（複数回訪問を許可し、より深い階層を採用）
            let processed = 0;
            const maxIterations = allNodeIds.size * allNodeIds.size;

            while (queue.length > 0 && processed < maxIterations) {
                const currentId = queue.shift();
                processed++;
                const currentDepth = nodeDepths[currentId];
                const children = connections.filter(c => c.from === currentId).map(c => c.to);

                for (const childId of children) {
                    const newDepth = currentDepth + 1;
                    const existingDepth = nodeDepths[childId];

                    // より深い階層が見つかった場合、または未設定の場合は更新
                    if (existingDepth === undefined || newDepth > existingDepth) {
                        nodeDepths[childId] = newDepth;
                        queue.push(childId);
                    }
                }
            }

            return nodeDepths;
        }

        // 親ごとの接続をY座標でソート
        function sortConnectionsByParent(connections) {
            const connectionsByParent = {};
            connections.forEach(conn => {
                if (!connectionsByParent[conn.from]) {
                    connectionsByParent[conn.from] = [];
                }
                connectionsByParent[conn.from].push(conn);
            });

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

            return connectionsByParent;
        }

        // 曲線パスを生成
        function createCurvedPath(x1, y1, x2, y2, verticalSegmentX, labelBounds, nodeBounds, connFrom, connTo, fromNodeLeft) {
            const cornerRadius = 8;
            const p1x = x1;
            const p1y = y1;  // エッジの起点は常にノードの中心
            let p2x = verticalSegmentX;
            let p2y = y1;
            let p3x = p2x;
            let p3y = y2;
            const p4x = x2;
            const p4y = y2;

            // 垂直線のX座標が子ノードより右側になる場合は制限
            const minMargin = 20;
            if (p2x > p4x - minMargin) {
                p2x = p4x - minMargin;
                p3x = p2x;
            }

            // 衝突回避のためのY座標調整値
            let adjustedY = p1y;
            const transitionX = p1x + 30;  // ノードの右端から30px離れた位置で垂直移動

            // 最初の水平線セグメント（親ノードの範囲）でノードとの衝突をチェック
            // 親ノードの左端からverticalSegmentXまでの水平線がノードと重なるかを確認
            if (nodeBounds && nodeBounds.length > 0) {
                const checkFromX = fromNodeLeft !== undefined ? fromNodeLeft : p1x;
                const checkToX = p2x;
                const pathIntersectingNodes = checkEdgePathIntersectsNodes(checkFromX, p1y, checkToX, p1y, nodeBounds);
                if (pathIntersectingNodes.length > 0) {
                    const nodePadding = 40;

                    // すべての衝突ノードの中で最も上と最も下を見つける
                    const topMost = Math.min(...pathIntersectingNodes.map(n => n.top));
                    const bottomMost = Math.max(...pathIntersectingNodes.map(n => n.bottom));

                    // 水平線のY座標を調整（ノードを避ける）
                    if (p1y < topMost) {
                        // 開始Y座標がすべてのノードより上の場合、さらに上に移動
                        adjustedY = topMost - nodePadding;
                    } else if (p1y >= topMost && p1y <= bottomMost) {
                        // 開始Y座標がノードの範囲内の場合、最も下のノードの下を通過
                        adjustedY = bottomMost + nodePadding;
                    }

                    if (window.DEBUG_CONNECTIONS) {
                        console.log('Edge path collision: edge=' + connFrom + '->' + connTo +
                            ', nodes=' + pathIntersectingNodes.map(n => n.id).join(',') + ', adjusted Y=' + adjustedY);
                    }
                }
            }

            // 調整が必要な場合、p2yを更新
            if (adjustedY !== p1y) {
                p2y = adjustedY;
            }

            // 最初の水平線セグメント(p1x,adjustedY)→(p2x,p2y)がラベルと衝突するかチェック
            if (labelBounds && labelBounds.length > 0) {
                const avoidanceX = calculateHorizontalLineAvoidance(p1x, p2x, adjustedY, labelBounds);
                // ラベルの左側で垂直線を立ち上げる（子ノードより右側にならない範囲で）
                if (avoidanceX !== null && avoidanceX > p1x && avoidanceX < p2x) {
                    // 通常のケース: ラベル回避のX座標が子ノードより左側なら適用
                    if (p1x < p2x && avoidanceX < p4x - minMargin) {
                        p2x = avoidanceX;
                        p3x = avoidanceX;
                    }
                    // 逆向きのケース: すでに制限されている範囲内なら適用
                    else if (p1x > p2x && avoidanceX < p4x - minMargin) {
                        p2x = avoidanceX;
                        p3x = avoidanceX;
                    }
                }
            }

            // Y座標の調整が必要な場合は、ノードの右端付近で垂直に移動するパスを生成
            if (adjustedY !== p1y) {
                // 起点から短い水平線、垂直移動、調整されたYで水平移動、垂直移動、終点へ
                const shortHorizontal = transitionX;
                if (Math.abs(p3y - p2y) > cornerRadius * 2) {
                    if (p3y > p2y) {
                        return \`M \${p1x} \${p1y} L \${shortHorizontal} \${p1y} L \${shortHorizontal} \${p2y} L \${p2x - cornerRadius} \${p2y} Q \${p2x} \${p2y} \${p2x} \${p2y + cornerRadius} L \${p3x} \${p3y - cornerRadius} Q \${p3x} \${p3y} \${p3x + cornerRadius} \${p3y} L \${p4x} \${p4y}\`;
                    } else {
                        return \`M \${p1x} \${p1y} L \${shortHorizontal} \${p1y} L \${shortHorizontal} \${p2y} L \${p2x - cornerRadius} \${p2y} Q \${p2x} \${p2y} \${p2x} \${p2y - cornerRadius} L \${p3x} \${p3y + cornerRadius} Q \${p3x} \${p3y} \${p3x + cornerRadius} \${p3y} L \${p4x} \${p4y}\`;
                    }
                } else {
                    return \`M \${p1x} \${p1y} L \${shortHorizontal} \${p1y} L \${shortHorizontal} \${p2y} L \${p2x} \${p2y} L \${p3x} \${p3y} L \${p4x} \${p4y}\`;
                }
            }

            // Y座標の調整が不要な場合は通常のパス
            if (Math.abs(p3y - p2y) > cornerRadius * 2) {
                if (p3y > p2y) {
                    return \`M \${p1x} \${p1y} L \${p2x - cornerRadius} \${p2y} Q \${p2x} \${p2y} \${p2x} \${p2y + cornerRadius} L \${p3x} \${p3y - cornerRadius} Q \${p3x} \${p3y} \${p3x + cornerRadius} \${p3y} L \${p4x} \${p4y}\`;
                } else {
                    return \`M \${p1x} \${p1y} L \${p2x - cornerRadius} \${p2y} Q \${p2x} \${p2y} \${p2x} \${p2y - cornerRadius} L \${p3x} \${p3y + cornerRadius} Q \${p3x} \${p3y} \${p3x + cornerRadius} \${p3y} L \${p4x} \${p4y}\`;
                }
            } else {
                return \`M \${p1x} \${p1y} L \${p2x} \${p2y} L \${p3x} \${p3y} L \${p4x} \${p4y}\`;
            }
        }

        function createStraightLines(connections, nodePositions) {
            const svgLayer = svgHelpers.getEdgeLayer();
            if (!svgLayer) {
                console.error('SVG layer element not found');
                return;
            }

            // デバッグ
            if (window.DEBUG_CONNECTIONS) {
                console.log('createStraightLines called with ' + connections.length + ' connections');
                const dashedCount = connections.filter(c => c.isDashed).length;
                console.log('  - Dashed connections: ' + dashedCount);
            }

            // 既存の接続線とラベルを削除
            const existingLines = svgLayer.querySelectorAll('.connection-line, .connection-arrow, .connection-label');
            existingLines.forEach(line => line.remove());

            // ラベルオフセットをリセット
            labelOffsets = {};

            let connectionCount = 0;
            connections.forEach(conn => {
                const fromElement = svgHelpers.getNodeElement(conn.from);
                const toElement = svgHelpers.getNodeElement(conn.to);

                if (window.DEBUG_CONNECTIONS && conn.isDashed) {
                    console.log('  Straight edge ' + conn.from + ' --> ' + conn.to + ':',
                        'from:', !!fromElement, fromElement ? !fromElement.classList.contains('hidden') : 'N/A',
                        'to:', !!toElement, toElement ? !toElement.classList.contains('hidden') : 'N/A');
                }

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
                        class: conn.isDashed ? 'connection-line dashed-edge' : 'connection-line',
                        x1: x1,
                        y1: y1,
                        x2: x2,
                        y2: y2,
                        'data-from': conn.from,
                        'data-to': conn.to
                    });

                    // 点線エッジの場合はスタイルを追加
                    if (conn.isDashed) {
                        line.style.strokeDasharray = '5,5';
                        line.style.opacity = '0.6';
                    }

                    svgLayer.appendChild(line);

                    // 矢印を作成
                    const arrow = createArrow(x1, y1, x2, y2, conn);
                    svgLayer.appendChild(arrow);
                    connectionCount++;

                    // ラベルがある場合は表示
                    const labelGroup = createConnectionLabel(conn, toElement);
                    if (labelGroup) {
                        svgLayer.appendChild(labelGroup);
                    }
                }
            });

            // すべてのラベルを最前面に移動
            const labels = svgLayer.querySelectorAll('.connection-label');
            labels.forEach(label => {
                svgLayer.appendChild(label);
            });
        }

        function createCurvedLines(connections, nodePositions) {
            const svgLayer = svgHelpers.getEdgeLayer();
            if (!svgLayer) {
                console.error('SVG layer element not found');
                return;
            }

            // デバッグ
            if (window.DEBUG_CONNECTIONS) {
                console.log('createCurvedLines called with ' + connections.length + ' connections');
                const dashedCount = connections.filter(c => c.isDashed).length;
                console.log('  - Dashed connections: ' + dashedCount);
            }

            // 既存の接続線とラベルを削除
            const existingLines = svgLayer.querySelectorAll('.connection-line, .connection-arrow, .connection-label');
            existingLines.forEach(line => line.remove());

            // ラベルオフセットをリセット
            labelOffsets = {};

            // パス0: 最初にすべてのラベルを描画
            connections.forEach(conn => {
                const toElement = svgHelpers.getNodeElement(conn.to);
                if (toElement && !toElement.classList.contains('hidden')) {
                    const labelGroup = createConnectionLabel(conn, toElement);
                    if (labelGroup) {
                        svgLayer.appendChild(labelGroup);
                    }
                }
            });

            // パス0.5: ラベルとノードの座標を取得
            const labelBounds = getAllLabelBounds();

            // 2パスアルゴリズムによる動的レーン割り当て
            const laneWidth = 25;
            const minOffset = 30;

            // パス1: すべての接続情報を収集
            const edgeInfos = [];

            // ノードの階層を計算
            const nodeDepths = calculateNodeDepths(connections);

            // 親ごとの接続をソート
            const connectionsByParent = sortConnectionsByParent(connections);

            // パス1: すべての接続の情報を収集
            connections.forEach(conn => {
                const fromElement = svgHelpers.getNodeElement(conn.from);
                const toElement = svgHelpers.getNodeElement(conn.to);

                if (!fromElement || !toElement ||
                    fromElement.classList.contains('hidden') ||
                    toElement.classList.contains('hidden')) {
                    if (window.DEBUG_CONNECTIONS && conn.isDashed) {
                        console.log('  - Skipping dashed edge: ' + conn.from + ' --> ' + conn.to +
                            ' fromElement: ' + !!fromElement + ' toElement: ' + !!toElement);
                    }
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

            // 階層情報を取得（横方向レイアウトから提供される）
            const levelInfo = window.layoutLevelInfo || {};
            const levelXPositions = levelInfo.levelXPositions || [];
            const levelMaxWidths = levelInfo.levelMaxWidths || [];

            // 階層ごとに親の右端の最大位置を計算（真横の1:1のみ除外）
            const depthMaxParentRight = {}; // depth -> max(parentRight)
            const depthMinChildLeft = {}; // depth -> min(childLeft)

            edgeInfos.forEach(info => {
                // 真横の1:1のみレーン計算から除外
                if (info.is1to1Horizontal) return;

                const depth = info.depth;

                // 階層情報がある場合は、その階層の最大ノード幅を使用
                if (levelXPositions[depth] !== undefined && levelMaxWidths[depth] !== undefined) {
                    const levelMaxRight = levelXPositions[depth] + levelMaxWidths[depth];
                    depthMaxParentRight[depth] = levelMaxRight;
                } else {
                    // フォールバック: 実際のエッジの開始位置から計算
                    if (!depthMaxParentRight[depth] || info.x1 > depthMaxParentRight[depth]) {
                        depthMaxParentRight[depth] = info.x1;
                    }
                }

                // 次の階層の左端
                const nextDepth = depth + 1;
                if (levelXPositions[nextDepth] !== undefined) {
                    if (!depthMinChildLeft[depth] || levelXPositions[nextDepth] < depthMinChildLeft[depth]) {
                        depthMinChildLeft[depth] = levelXPositions[nextDepth];
                    }
                } else {
                    // フォールバック: 実際のエッジの終了位置から計算
                    if (!depthMinChildLeft[depth] || info.x2 < depthMinChildLeft[depth]) {
                        depthMinChildLeft[depth] = info.x2;
                    }
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
                        class: conn.isDashed ? 'connection-line dashed-edge' : 'connection-line',
                        x1: x1,
                        y1: y1,
                        x2: x2,
                        y2: y2,
                        'data-from': conn.from,
                        'data-to': conn.to
                    });

                    // 点線エッジの場合はスタイルを追加
                    if (conn.isDashed) {
                        line.style.strokeDasharray = '5,5';
                        line.style.opacity = '0.6';
                    }

                    svgLayer.appendChild(line);

                    const arrow = createHorizontalArrow(x2, y2, conn);
                    svgLayer.appendChild(arrow);

                    // ラベルは既にパス0で描画済み

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
                let verticalSegmentX = maxParentRight + minOffset + (assignedLane * laneSpacing);

                // ノードとの衝突を考慮してオフセットを追加
                const nodeBounds = getAllNodeBounds(conn.from, conn.to);
                const nodeOffset = calculateNodeAvoidanceOffset(verticalSegmentX, y1, y2, nodeBounds, conn.from, conn.to);
                if (nodeOffset > 0) {
                    verticalSegmentX += nodeOffset;
                }

                // ラベルとの衝突を考慮してオフセットを追加
                const labelOffset = calculateLabelAvoidanceOffset(verticalSegmentX, y1, y2, labelBounds, conn.from, conn.to);
                if (labelOffset > 0) {
                    verticalSegmentX += labelOffset;
                }

                // パスデータを生成
                const fromPos = getNodePosition(fromElement);
                const pathData = createCurvedPath(x1, y1, x2, y2, verticalSegmentX, labelBounds, nodeBounds, conn.from, conn.to, fromPos.left);

                const path = svgHelpers.createPath(pathData, {
                    class: conn.isDashed ? 'connection-line dashed-edge' : 'connection-line',
                    'data-from': conn.from,
                    'data-to': conn.to,
                    fill: 'none'
                });

                // 点線エッジの場合はスタイルを追加
                if (conn.isDashed) {
                    path.style.strokeDasharray = '5,5';
                    path.style.opacity = '0.6';
                }

                svgLayer.appendChild(path);

                // 矢印を作成
                const arrow = createHorizontalArrow(x2, y2, conn);
                svgLayer.appendChild(arrow);
                connectionCount++;

                // ラベルは既にパス0で描画済み
            });

            // すべてのラベルを最前面に移動（パス0で描画済み）
            const labels = svgLayer.querySelectorAll('.connection-label');
            labels.forEach(label => {
                svgLayer.appendChild(label);
            });
        }
    `;
}

module.exports = {
    getConnectionRenderer
};
