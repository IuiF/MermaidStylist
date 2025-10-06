function getConnectionRenderer() {
    const connectionArrows = require('./arrows').getConnectionArrows();
    const connectionLabels = require('./labels').getConnectionLabels();
    const collisionDetector = require('./collision-detector').getCollisionDetector();
    const verticalSegmentCalculator = require('./vertical-segment-calculator').getVerticalSegmentCalculator();

    return connectionArrows + connectionLabels + collisionDetector + verticalSegmentCalculator + `
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
            const p1x = x1;
            const p1y = y1;  // エッジの起点は常にノードの中心
            let p2x = verticalSegmentX;
            let p2y = y1;
            let p3x = p2x;
            let p3y = y2;
            const p4x = finalVerticalX !== undefined ? finalVerticalX : x2;
            let p4y = y2;

            // 垂直線のX座標制限は親ごとに事前計算済み（parentFinalVerticalSegmentX）

            // 最初の水平線セグメントのY座標調整
            p2y = pathYAdjuster.adjustInitialSegmentY(p1x, p1y, p2x, fromNodeLeft, nodeBounds, connFrom, connTo);

            // 最後の水平線セグメントのY座標調整
            const finalAdjustedY = pathYAdjuster.adjustFinalSegmentY(p3x, p3y, p4x, nodeBounds, connFrom, connTo);
            if (finalAdjustedY !== null) {
                p3y = finalAdjustedY;
                // p4yは目的ノードのcenterYのまま保持（p3yからp4yへの垂直セグメントが生成される）
            }

            // ラベル回避処理は verticalSegmentCalculator で一括処理済みのため、
            // ここでの個別調整は行わない（親ごとの統一X座標を維持）

            // Y座標の調整が必要な場合は、ノードの右端付近で垂直に移動するパスを生成
            if (p2y !== p1y) {
                // 起点から垂直セグメントX(p2x)まで水平線、垂直移動
                const shortHorizontal = p2x;
                const needsFinalVertical = Math.abs(p3y - p4y) > 1;
                const canCurveFinalVertical = needsFinalVertical && Math.abs(p3y - p4y) > cornerRadius * 2;

                if (Math.abs(p3y - p2y) > cornerRadius * 2) {
                    if (p3y > p2y) {
                        const basePath = \`M \${p1x} \${p1y} L \${shortHorizontal} \${p1y} L \${shortHorizontal} \${p2y} L \${p2x - cornerRadius} \${p2y} Q \${p2x} \${p2y} \${p2x} \${p2y + cornerRadius} L \${p3x} \${p3y - cornerRadius} Q \${p3x} \${p3y} \${p3x + cornerRadius} \${p3y}\`;
                        if (canCurveFinalVertical) {
                            if (p3y > p4y) {
                                return \`\${basePath} L \${p4x - cornerRadius} \${p3y} Q \${p4x} \${p3y} \${p4x} \${p3y - cornerRadius} L \${p4x} \${p4y + cornerRadius} Q \${p4x} \${p4y} \${p4x + cornerRadius} \${p4y} L \${x2} \${p4y}\`;
                            } else {
                                return \`\${basePath} L \${p4x - cornerRadius} \${p3y} Q \${p4x} \${p3y} \${p4x} \${p3y + cornerRadius} L \${p4x} \${p4y - cornerRadius} Q \${p4x} \${p4y} \${p4x + cornerRadius} \${p4y} L \${x2} \${p4y}\`;
                            }
                        } else if (needsFinalVertical) {
                            return \`\${basePath} L \${p4x} \${p3y} L \${p4x} \${p4y} L \${x2} \${p4y}\`;
                        } else {
                            return \`\${basePath} L \${x2} \${p4y}\`;
                        }
                    } else {
                        const basePath = \`M \${p1x} \${p1y} L \${shortHorizontal} \${p1y} L \${shortHorizontal} \${p2y} L \${p2x - cornerRadius} \${p2y} Q \${p2x} \${p2y} \${p2x} \${p2y - cornerRadius} L \${p3x} \${p3y + cornerRadius} Q \${p3x} \${p3y} \${p3x + cornerRadius} \${p3y}\`;
                        if (canCurveFinalVertical) {
                            if (p3y > p4y) {
                                return \`\${basePath} L \${p4x - cornerRadius} \${p3y} Q \${p4x} \${p3y} \${p4x} \${p3y - cornerRadius} L \${p4x} \${p4y + cornerRadius} Q \${p4x} \${p4y} \${p4x + cornerRadius} \${p4y} L \${x2} \${p4y}\`;
                            } else {
                                return \`\${basePath} L \${p4x - cornerRadius} \${p3y} Q \${p4x} \${p3y} \${p4x} \${p3y + cornerRadius} L \${p4x} \${p4y - cornerRadius} Q \${p4x} \${p4y} \${p4x + cornerRadius} \${p4y} L \${x2} \${p4y}\`;
                            }
                        } else if (needsFinalVertical) {
                            return \`\${basePath} L \${p4x} \${p3y} L \${p4x} \${p4y} L \${x2} \${p4y}\`;
                        } else {
                            return \`\${basePath} L \${x2} \${p4y}\`;
                        }
                    }
                } else {
                    return needsFinalVertical ? \`M \${p1x} \${p1y} L \${shortHorizontal} \${p1y} L \${shortHorizontal} \${p2y} L \${p2x} \${p2y} L \${p3x} \${p3y} L \${p4x} \${p3y} L \${p4x} \${p4y} L \${x2} \${p4y}\` : \`M \${p1x} \${p1y} L \${shortHorizontal} \${p1y} L \${shortHorizontal} \${p2y} L \${p2x} \${p2y} L \${p3x} \${p3y} L \${x2} \${p4y}\`;
                }
            }

            // Y座標の調整が不要な場合は通常のパス
            // p3y と p4y が異なる場合は、水平→垂直のセグメントを追加
            const needsFinalVertical = Math.abs(p3y - p4y) > 1;
            const canCurveFinalVertical = needsFinalVertical && Math.abs(p3y - p4y) > cornerRadius * 2;

            if (Math.abs(p3y - p2y) > cornerRadius * 2) {
                if (p3y > p2y) {
                    const basePath = \`M \${p1x} \${p1y} L \${p2x - cornerRadius} \${p2y} Q \${p2x} \${p2y} \${p2x} \${p2y + cornerRadius} L \${p3x} \${p3y - cornerRadius} Q \${p3x} \${p3y} \${p3x + cornerRadius} \${p3y}\`;
                    if (canCurveFinalVertical) {
                        // p3y と p4y の関係に応じてカーブの向きを決定
                        if (p3y > p4y) {
                            return \`\${basePath} L \${p4x - cornerRadius} \${p3y} Q \${p4x} \${p3y} \${p4x} \${p3y - cornerRadius} L \${p4x} \${p4y + cornerRadius} Q \${p4x} \${p4y} \${p4x + cornerRadius} \${p4y} L \${x2} \${p4y}\`;
                        } else {
                            return \`\${basePath} L \${p4x - cornerRadius} \${p3y} Q \${p4x} \${p3y} \${p4x} \${p3y + cornerRadius} L \${p4x} \${p4y - cornerRadius} Q \${p4x} \${p4y} \${p4x + cornerRadius} \${p4y} L \${x2} \${p4y}\`;
                        }
                    } else if (needsFinalVertical) {
                        return \`\${basePath} L \${p4x} \${p3y} L \${p4x} \${p4y} L \${x2} \${p4y}\`;
                    } else {
                        return \`\${basePath} L \${x2} \${p4y}\`;
                    }
                } else {
                    const basePath = \`M \${p1x} \${p1y} L \${p2x - cornerRadius} \${p2y} Q \${p2x} \${p2y} \${p2x} \${p2y - cornerRadius} L \${p3x} \${p3y + cornerRadius} Q \${p3x} \${p3y} \${p3x + cornerRadius} \${p3y}\`;
                    if (canCurveFinalVertical) {
                        // p3y と p4y の関係に応じてカーブの向きを決定
                        if (p3y > p4y) {
                            return \`\${basePath} L \${p4x - cornerRadius} \${p3y} Q \${p4x} \${p3y} \${p4x} \${p3y - cornerRadius} L \${p4x} \${p4y + cornerRadius} Q \${p4x} \${p4y} \${p4x + cornerRadius} \${p4y} L \${x2} \${p4y}\`;
                        } else {
                            return \`\${basePath} L \${p4x - cornerRadius} \${p3y} Q \${p4x} \${p3y} \${p4x} \${p3y + cornerRadius} L \${p4x} \${p4y - cornerRadius} Q \${p4x} \${p4y} \${p4x + cornerRadius} \${p4y} L \${x2} \${p4y}\`;
                        }
                    } else if (needsFinalVertical) {
                        return \`\${basePath} L \${p4x} \${p3y} L \${p4x} \${p4y} L \${x2} \${p4y}\`;
                    } else {
                        return \`\${basePath} L \${x2} \${p4y}\`;
                    }
                }
            } else {
                return needsFinalVertical ? \`M \${p1x} \${p1y} L \${p2x} \${p2y} L \${p3x} \${p3y} L \${p4x} \${p3y} L \${p4x} \${p4y} L \${x2} \${p4y}\` : \`M \${p1x} \${p1y} L \${p2x} \${p2y} L \${p3x} \${p3y} L \${x2} \${p4y}\`;
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
            const laneWidth = 25;
            const minOffset = 30;

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
            let parentFinalVerticalSegmentX = verticalSegmentCalculator.calculate(edgeInfos, {
                parentYPositions: parentYPositions,
                depthMaxParentRight: depthMaxParentRight,
                depthMinChildLeft: depthMinChildLeft,
                labelBounds: labelBounds,
                getAllNodeBounds: getAllNodeBounds,
                calculateNodeAvoidanceOffset: calculateNodeAvoidanceOffset,
                calculateLabelAvoidanceOffset: calculateLabelAvoidanceOffset,
                minOffset: minOffset,
                laneWidth: laneWidth
            });

            // 同じノードに入るエッジをグループ化
            const edgesByTarget = connectionUtils.groupEdgesByTarget(edgeInfos);

            // 各ターゲットノードに対して、エッジの順序を決定
            const edgeToFinalVerticalX = {};
            Object.keys(edgesByTarget).forEach(target => {
                const edges = edgesByTarget[target];
                if (edges.length > 1) {
                    // 複数のエッジがある場合、X座標で分散（ノードの左側に配置）
                    const toElement = svgHelpers.getNodeElement(target);
                    if (toElement) {
                        const toPos = getNodePosition(toElement);
                        const spacing = CONNECTION_CONSTANTS.EDGE_SPACING;

                        edges.forEach((edge, index) => {
                            const offset = spacing * (edges.length - index);
                            edgeToFinalVerticalX[edge.conn.from + '->' + edge.conn.to] = toPos.left - offset;
                        });
                    }
                }
            });

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
