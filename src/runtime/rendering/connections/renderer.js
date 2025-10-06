function getConnectionRenderer() {
    const connectionArrows = require('./arrows').getConnectionArrows();
    const connectionLabels = require('./labels').getConnectionLabels();
    const collisionUtils = require('./collision-utils').getCollisionUtils();
    const verticalSegmentCalculator = require('./vertical-segment-calculator').getVerticalSegmentCalculator();

    return connectionArrows + connectionLabels + collisionUtils + verticalSegmentCalculator + `
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

        // 曲線パスを生成
        function createCurvedPath(x1, y1, x2, y2, verticalSegmentX, labelBounds, nodeBounds, connFrom, connTo, fromNodeLeft, finalVerticalX) {
            const cornerRadius = CONNECTION_CONSTANTS.CORNER_RADIUS;

            // 制御点を計算
            const p1x = x1;
            const p1y = y1;
            let p2x = verticalSegmentX;
            let p2y = y1;
            let p3x = p2x;
            let p3y = y2;
            const p4x = finalVerticalX !== undefined ? finalVerticalX : x2;
            let p4y = y2;

            // 最初の水平線セグメントのY座標調整
            p2y = pathYAdjuster.adjustInitialSegmentY(p1x, p1y, p2x, fromNodeLeft, nodeBounds, connFrom, connTo);

            // 最後の水平線セグメントのY座標調整
            const finalAdjustedY = pathYAdjuster.adjustFinalSegmentY(p3x, p3y, p4x, nodeBounds, connFrom, connTo);
            if (finalAdjustedY !== null) {
                p3y = finalAdjustedY;
            }

            // pathGeneratorを使用してSVGパスを生成
            const points = {
                p1: { x: p1x, y: p1y },
                p2: { x: p2x, y: p2y },
                p3: { x: p3x, y: p3y },
                p4: { x: p4x, y: p4y },
                end: { x: x2, y: p4y }
            };

            return pathGenerator.generateCurvedPath(points, cornerRadius);
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

            // パス0: 最初にすべてのラベルを描画（可視エッジのみ）
            connections.forEach(conn => {
                const fromElement = svgHelpers.getNodeElement(conn.from);
                const toElement = svgHelpers.getNodeElement(conn.to);
                if (fromElement && toElement &&
                    !fromElement.classList.contains('hidden') &&
                    !toElement.classList.contains('hidden')) {
                    const labelGroup = createConnectionLabel(conn, toElement);
                    if (labelGroup) {
                        svgLayer.appendChild(labelGroup);
                    }
                }
            });

            // パス0.5: ラベルとノードの座標を取得
            const labelBounds = getAllLabelBounds();

            // 2パスアルゴリズムによる動的レーン割り当て
            const minOffset = CONNECTION_CONSTANTS.MIN_OFFSET;

            // パス1: すべての接続情報を収集
            // ノードの階層を計算
            const nodeDepths = connectionUtils.calculateNodeDepths(connections);

            // 親ごとの接続をソート
            const connectionsByParent = connectionUtils.sortConnectionsByParent(connections);

            // すべての接続の情報を収集（可視性に関係なく）
            const edgeInfos = edgeInfoCollector.collectEdgeInfos(connections, nodeDepths, connectionsByParent);

            // パス2: レーン割り当てと描画
            // 親ノードのX座標でソート（左から右へ処理）
            edgeInfos.sort((a, b) => a.parentX - b.parentX);

            // 親ノードのY座標の範囲を計算（レーン優先順位のため）
            const parentYPositions = connectionUtils.calculateParentYPositions(edgeInfos);

            // 親をY座標でソートして、順位を割り当て
            const parentIds = Object.keys(parentYPositions);
            parentIds.sort((a, b) => parentYPositions[a] - parentYPositions[b]);
            const parentRanks = {};
            parentIds.forEach((id, index) => {
                parentRanks[id] = index;
            });

            // 階層情報を取得（横方向レイアウトから提供される）
            const levelInfo = window.layoutLevelInfo || {};

            // 階層ごとに親の右端の最大位置を計算（真横の1:1のみ除外）
            const depthBounds = depthCalculator.calculateDepthBounds(edgeInfos, levelInfo);
            const depthMaxParentRight = depthBounds.depthMaxParentRight;
            const depthMinChildLeft = depthBounds.depthMinChildLeft;

            // 垂直セグメントX座標を計算（統一モジュールを使用）
            let parentFinalVerticalSegmentX = verticalSegmentCalculator.calculateVerticalSegmentX(edgeInfos, {
                parentYPositions: parentYPositions,
                depthMaxParentRight: depthMaxParentRight,
                depthMinChildLeft: depthMinChildLeft,
                labelBounds: labelBounds,
                getAllNodeBounds: getAllNodeBounds,
                calculateNodeAvoidanceOffset: calculateNodeAvoidanceOffset,
                calculateLabelAvoidanceOffset: calculateLabelAvoidanceOffset,
                minOffset: minOffset
            });

            // 最終垂直X座標を計算（複数エッジが同じノードに入る場合の分散配置）
            const edgeToFinalVerticalX = finalVerticalCalculator.calculateFinalVerticalX(edgeInfos);

            // 垂直線のX座標制限は親ごとに事前計算済み（parentFinalVerticalSegmentX）
            // vertical-segment-calculatorで衝突回避を含めて計算済みのため、追加の制限は不要

            let connectionCount = 0;

            edgeInfos.forEach(edgeInfo => {
                const { conn, x1, y1, x2, y2, yMin, yMax, siblingIndex, siblingCount, depth, is1to1, is1to1Horizontal } = edgeInfo;

                // 可視性チェック：非表示エッジはスキップ
                const fromElement = svgHelpers.getNodeElement(conn.from);
                const toElement = svgHelpers.getNodeElement(conn.to);
                if (fromElement.classList.contains('hidden') || toElement.classList.contains('hidden')) {
                    return;
                }

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

                // 事前に計算した親のverticalSegmentX（衝突回避オフセット込み、ノード右端保証済み）を使用
                const verticalSegmentX = parentFinalVerticalSegmentX[conn.from] || x1 + 50;

                // パスデータを生成
                const fromPos = getNodePosition(fromElement);

                const nodeBounds = getAllNodeBounds(conn.from, conn.to);
                const edgeKey = conn.from + '->' + conn.to;
                const finalVerticalX = edgeToFinalVerticalX[edgeKey];
                const pathData = createCurvedPath(x1, y1, x2, y2, verticalSegmentX, labelBounds, nodeBounds, conn.from, conn.to, fromPos.left, finalVerticalX);

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
