function getEdgeRouter() {
    return `
        const EDGE_CONSTANTS = {
            DEFAULT_VERTICAL_OFFSET: 50,
            CORNER_RADIUS: 10,
            MIN_OFFSET: 20,
            EDGE_SPACING: 30,
            CLUSTER_X_THRESHOLD: 200,
            COLLISION_PADDING_NODE: 5,
            COLLISION_PADDING_LABEL: 3,
            ENDPOINT_EPSILON: 1.0,
            JUMP_ARC_RADIUS: 8,
            SECOND_VERTICAL_DISTANCE_RATIO: 0.6
        };

        function createEdgeKey(from, to) {
            return from + '->' + to;
        }

        /**
         * 水平線分と垂直線分の交差判定
         * @param {Object} hSeg - 水平セグメント
         * @param {Object} vSeg - 垂直セグメント
         * @returns {Object|null} 交差点 {x, y} または null
         */
        function checkSegmentIntersection(hSeg, vSeg) {
            const hMinX = Math.min(hSeg.start.x, hSeg.end.x);
            const hMaxX = Math.max(hSeg.start.x, hSeg.end.x);
            const hY = hSeg.start.y;

            const vX = vSeg.start.x;
            const vMinY = Math.min(vSeg.start.y, vSeg.end.y);
            const vMaxY = Math.max(vSeg.start.y, vSeg.end.y);

            const epsilon = EDGE_CONSTANTS.ENDPOINT_EPSILON;

            // 水平線のY座標が垂直線のY範囲内かチェック
            if (hY < vMinY || hY > vMaxY) {
                return null;
            }

            // 垂直線のX座標が水平線のX範囲内かチェック
            if (vX < hMinX || vX > hMaxX) {
                return null;
            }

            // 交差点がセグメントの端点に近い場合は除外
            const isNearHorizontalEndpoint =
                Math.abs(vX - hSeg.start.x) < epsilon ||
                Math.abs(vX - hSeg.end.x) < epsilon;

            const isNearVerticalEndpoint =
                Math.abs(hY - vSeg.start.y) < epsilon ||
                Math.abs(hY - vSeg.end.y) < epsilon;

            if (isNearHorizontalEndpoint || isNearVerticalEndpoint) {
                return null;
            }

            return new Point(vX, hY);
        }

        /**
         * エッジルート間の交差を検出
         * @param {Map} edgeRoutes - エッジルートマップ
         * @param {Map} nodePositions - ノード位置マップ
         * @param {Array} connections - 接続配列
         * @returns {Map} エッジキー -> 交差点配列のマップ
         */
        function detectEdgeCrossings(edgeRoutes, nodePositions, connections) {
            const crossings = new Map();

            // エッジごとの開始/終了Y座標を記録
            const edgeYCoords = new Map();
            connections.forEach(conn => {
                const fromPos = nodePositions.get(conn.from);
                const toPos = nodePositions.get(conn.to);
                if (fromPos && toPos) {
                    const key = createEdgeKey(conn.from, conn.to);
                    edgeYCoords.set(key, {
                        startY: fromPos.y + fromPos.height / 2,
                        endY: toPos.y + toPos.height / 2
                    });
                }
            });

            // 全エッジの組み合わせをチェック
            const edgeKeys = Array.from(edgeRoutes.keys());

            for (let i = 0; i < edgeKeys.length; i++) {
                const key1 = edgeKeys[i];
                const route1 = edgeRoutes.get(key1);
                const yCoords1 = edgeYCoords.get(key1);

                for (let j = 0; j < route1.segments.length; j++) {
                    const seg1 = route1.segments[j];
                    if (seg1.type !== 'horizontal') continue;

                    // 中間水平セグメント（Y調整済み）は交差検出から除外
                    // エッジの開始Y/終了Yと異なるY座標の水平セグメントは除外
                    if (yCoords1) {
                        const segY = seg1.start.y;
                        const epsilon = 0.5;
                        const isStartY = Math.abs(segY - yCoords1.startY) < epsilon;
                        const isEndY = Math.abs(segY - yCoords1.endY) < epsilon;
                        if (!isStartY && !isEndY) {
                            // 中間セグメント（Y調整済み）なので交差検出から除外
                            continue;
                        }
                    }

                    for (let k = 0; k < edgeKeys.length; k++) {
                        if (i === k) continue; // 同じエッジは除外

                        const key2 = edgeKeys[k];
                        const route2 = edgeRoutes.get(key2);

                        for (let l = 0; l < route2.segments.length; l++) {
                            const seg2 = route2.segments[l];
                            if (seg2.type !== 'vertical') continue;

                            const intersection = checkSegmentIntersection(seg1, seg2);
                            if (intersection) {
                                if (!crossings.has(key1)) {
                                    crossings.set(key1, []);
                                }

                                // 重複チェック
                                const existing = crossings.get(key1);
                                const isDuplicate = existing.some(p =>
                                    Math.abs(p.x - intersection.x) < 0.1 &&
                                    Math.abs(p.y - intersection.y) < 0.1
                                );

                                if (!isDuplicate) {
                                    existing.push(intersection);
                                }
                            }
                        }
                    }
                }
            }

            // 交差点をX座標順にソート
            crossings.forEach((points, key) => {
                points.sort((a, b) => a.x - b.x);
            });

            return crossings;
        }

        /**
         * 水平セグメントを交差点で分割してジャンプアークを挿入
         * @param {Segment} segment - 水平セグメント
         * @param {Array} crossings - 交差点配列
         * @returns {Array} 分割されたセグメント配列
         */
        function splitSegmentWithJumpArcs(segment, crossings) {
            if (crossings.length === 0) {
                return [segment];
            }

            const result = [];
            const radius = EDGE_CONSTANTS.JUMP_ARC_RADIUS;
            let currentX = segment.start.x;
            const y = segment.start.y;
            const endX = segment.end.x;

            crossings.forEach(crossing => {
                // 交差点までの水平線
                if (currentX < crossing.x - radius) {
                    result.push(new Segment('horizontal',
                        new Point(currentX, y),
                        new Point(crossing.x - radius, y)
                    ));
                }

                // ジャンプアーク
                const arcParams = new ArcParams(
                    crossing.x,
                    y,
                    radius,
                    Math.PI,
                    0
                );
                result.push(new Segment('arc',
                    new Point(crossing.x - radius, y),
                    new Point(crossing.x + radius, y),
                    null,
                    arcParams
                ));

                currentX = crossing.x + radius;
            });

            // 最後のセグメント
            if (currentX < endX) {
                result.push(new Segment('horizontal',
                    new Point(currentX, y),
                    new Point(endX, y)
                ));
            }

            return result;
        }

        /**
         * 2つの矩形範囲が重なるかチェック（ローカル）
         * @param {Object} rect1 - 矩形1
         * @param {Object} rect2 - 矩形2
         * @returns {boolean} 重なっているかどうか
         */
        function _checkRectOverlap(rect1, rect2) {
            const xOverlap = !(rect1.right < rect2.left || rect1.left > rect2.right);
            const yOverlap = !(rect1.bottom < rect2.top || rect1.top > rect2.bottom);
            return xOverlap && yOverlap;
        }

        /**
         * エッジの経路全体でノードとの衝突をチェック（ローカル）
         * @param {number} x1 - 開始X座標
         * @param {number} y1 - 開始Y座標
         * @param {number} x2 - 終了X座標
         * @param {number} y2 - 終了Y座標
         * @param {Array} nodeBounds - ノードのバウンディングボックス配列
         * @returns {Array} 衝突するノードの配列
         */
        function _checkEdgePathIntersectsNodes(x1, y1, x2, y2, nodeBounds) {
            const padding = EDGE_CONSTANTS.COLLISION_PADDING_NODE;
            const pathRect = {
                left: Math.min(x1, x2) - padding,
                right: Math.max(x1, x2) + padding,
                top: Math.min(y1, y2) - padding,
                bottom: Math.max(y1, y2) + padding
            };

            return nodeBounds.filter(node => _checkRectOverlap(pathRect, node));
        }

        /**
         * 水平セグメントがノードと衝突する場合にY座標を調整（ローカル）
         * @param {number} x1 - 水平線開始X座標
         * @param {number} y - 水平線Y座標
         * @param {number} x2 - 水平線終了X座標
         * @param {Array} nodeBounds - ノードのバウンディングボックス配列
         * @returns {number|null} 調整後のY座標（調整不要の場合はnull）
         */
        function _adjustHorizontalSegmentY(x1, y, x2, nodeBounds) {
            if (!nodeBounds || nodeBounds.length === 0) {
                return null;
            }

            const pathIntersectingNodes = _checkEdgePathIntersectsNodes(x1, y, x2, y, nodeBounds);

            if (pathIntersectingNodes.length === 0) {
                return null;
            }

            const nodePadding = EDGE_CONSTANTS.COLLISION_PADDING_NODE;

            // すべての衝突ノードの中で最も上と最も下を見つける
            const topMost = Math.min(...pathIntersectingNodes.map(n => n.top));
            const bottomMost = Math.max(...pathIntersectingNodes.map(n => n.bottom));

            // 水平線のY座標を調整（ノードを避ける）
            let adjustedY;
            if (y < topMost) {
                adjustedY = topMost - nodePadding;
            } else if (y >= topMost && y <= bottomMost) {
                adjustedY = bottomMost + nodePadding;
            } else {
                return null;
            }

            return adjustedY;
        }

        /**
         * 垂直線と交差するオブジェクトを検出
         * @param {number} x - 垂直線のX座標
         * @param {number} y1 - 開始Y座標
         * @param {number} y2 - 終了Y座標
         * @param {Array} objects - オブジェクトの配列
         * @param {number} padding - パディング
         * @returns {Array} 交差するオブジェクトの配列
         */
        function _findVerticalLineIntersections(x, y1, y2, objects, padding) {
            const yMin = Math.min(y1, y2);
            const yMax = Math.max(y1, y2);
            const lineRect = {
                left: x - padding,
                right: x + padding,
                top: yMin - padding,
                bottom: yMax + padding
            };

            return objects.filter(obj => _checkRectOverlap(lineRect, obj));
        }

        /**
         * ノードを避けるためのX座標オフセットを計算
         * @param {number} x - X座標
         * @param {number} y1 - 開始Y座標
         * @param {number} y2 - 終了Y座標
         * @param {Array} nodeBounds - ノードのバウンディングボックス配列
         * @returns {number} オフセット値
         */
        function _calculateNodeAvoidanceOffset(x, y1, y2, nodeBounds) {
            const padding = EDGE_CONSTANTS.COLLISION_PADDING_NODE;
            const intersections = _findVerticalLineIntersections(x, y1, y2, nodeBounds, padding);

            if (intersections.length === 0) return 0;

            const maxRight = Math.max(...intersections.map(obj => obj.right));
            const offset = maxRight + padding - x;

            return offset;
        }

        /**
         * ラベルを避けるためのX座標オフセットを計算
         * @param {number} x - X座標
         * @param {number} y1 - 開始Y座標
         * @param {number} y2 - 終了Y座標
         * @param {Array} labelBounds - ラベルのバウンディングボックス配列
         * @returns {number} オフセット値
         */
        function _calculateLabelAvoidanceOffset(x, y1, y2, labelBounds) {
            const padding = EDGE_CONSTANTS.COLLISION_PADDING_LABEL;
            const intersections = _findVerticalLineIntersections(x, y1, y2, labelBounds, padding);

            if (intersections.length === 0) return 0;

            const maxRight = Math.max(...intersections.map(obj => obj.right));
            const offset = maxRight + padding - x;

            return offset;
        }

        /**
         * ノードの階層（depth）を計算
         * @param {Array} connections - 接続情報の配列
         * @returns {Map} ノードIDをキーとした階層マップ
         */
        function calculateNodeDepths(connections) {
            const nodeDepths = new Map();
            const allNodeIds = new Set([...connections.map(c => c.from), ...connections.map(c => c.to)]);
            const childNodeIds = new Set(connections.map(c => c.to));
            const rootNodeIds = [...allNodeIds].filter(id => !childNodeIds.has(id));

            const childrenMap = new Map();
            connections.forEach(conn => {
                if (!childrenMap.has(conn.from)) {
                    childrenMap.set(conn.from, []);
                }
                childrenMap.get(conn.from).push(conn.to);
            });

            const queue = [];
            rootNodeIds.forEach(rootId => {
                nodeDepths.set(rootId, 0);
                queue.push(rootId);
            });

            const maxIterations = allNodeIds.size * allNodeIds.size;
            let processed = 0;

            while (queue.length > 0 && processed < maxIterations) {
                const currentId = queue.shift();
                processed++;
                const currentDepth = nodeDepths.get(currentId);
                const children = childrenMap.get(currentId) || [];

                for (const childId of children) {
                    const newDepth = currentDepth + 1;
                    const existingDepth = nodeDepths.get(childId);

                    if (existingDepth === undefined || newDepth > existingDepth) {
                        nodeDepths.set(childId, newDepth);
                        queue.push(childId);
                    }
                }
            }

            return nodeDepths;
        }

        /**
         * 接続の深さを計算（from→toのレベル差）
         * @param {Object} conn - 接続情報
         * @param {Map} nodeDepths - ノードの深さマップ
         * @returns {number} 深さ（レベル差）
         */
        function calculateConnectionDepth(conn, nodeDepths) {
            const fromDepth = nodeDepths.get(conn.from) || 0;
            const toDepth = nodeDepths.get(conn.to) || 0;
            return toDepth - fromDepth;
        }

        /**
         * 階層ごとの親の右端と子の左端を計算
         * @param {Map} nodePositions - ノード位置マップ
         * @param {Array} connections - 接続配列
         * @param {Map} nodeDepths - ノードの深さマップ
         * @param {Array} levelXPositions - 階層のX座標配列
         * @param {Array} levelMaxWidths - 階層の最大幅配列
         * @returns {Object} depthMaxParentRightとdepthMinChildLeftのオブジェクト
         */
        function calculateDepthBounds(nodePositions, connections, nodeDepths, levelXPositions, levelMaxWidths) {
            const depthMaxParentRight = new Map();
            const depthMinChildLeft = new Map();

            connections.forEach(conn => {
                const fromPos = nodePositions.get(conn.from);
                const toPos = nodePositions.get(conn.to);
                if (!fromPos || !toPos) return;

                const fromDepth = nodeDepths.get(conn.from) || 0;
                const x1 = fromPos.x + fromPos.width;
                const x2 = toPos.x;

                // 階層情報がある場合は使用
                if (levelXPositions && levelXPositions[fromDepth] !== undefined &&
                    levelMaxWidths && levelMaxWidths[fromDepth] !== undefined) {
                    const levelMaxRight = levelXPositions[fromDepth] + levelMaxWidths[fromDepth];
                    if (!depthMaxParentRight.has(fromDepth) || levelMaxRight > depthMaxParentRight.get(fromDepth)) {
                        depthMaxParentRight.set(fromDepth, levelMaxRight);
                    }
                } else {
                    if (!depthMaxParentRight.has(fromDepth) || x1 > depthMaxParentRight.get(fromDepth)) {
                        depthMaxParentRight.set(fromDepth, x1);
                    }
                }

                // 次の階層の左端
                const nextDepth = fromDepth + 1;
                if (levelXPositions && levelXPositions[nextDepth] !== undefined) {
                    if (!depthMinChildLeft.has(fromDepth) || levelXPositions[nextDepth] < depthMinChildLeft.get(fromDepth)) {
                        depthMinChildLeft.set(fromDepth, levelXPositions[nextDepth]);
                    }
                } else {
                    if (!depthMinChildLeft.has(fromDepth) || x2 < depthMinChildLeft.get(fromDepth)) {
                        depthMinChildLeft.set(fromDepth, x2);
                    }
                }
            });

            return { depthMaxParentRight, depthMinChildLeft };
        }

        /**
         * 親ノードをdepthごとにグループ化
         * @param {Array} connections - 接続配列
         * @param {Map} nodeDepths - ノードの深さマップ
         * @returns {Map} depth -> [parentId...]のマップ
         */
        function groupParentsByDepth(connections, nodeDepths) {
            const parentsByDepth = new Map();
            const seenParents = new Set();

            connections.forEach(conn => {
                if (seenParents.has(conn.from)) return;
                seenParents.add(conn.from);

                const depth = nodeDepths.get(conn.from) || 0;
                if (!parentsByDepth.has(depth)) {
                    parentsByDepth.set(depth, []);
                }
                parentsByDepth.get(depth).push(conn.from);
            });

            return parentsByDepth;
        }

        /**
         * 各depthを通過する全エッジ数をカウント
         * @param {Array} connections - 接続配列
         * @param {Map} nodeDepths - ノードの深さマップ
         * @returns {Map} depth -> 通過エッジ数のマップ
         */
        function countEdgesPassingThroughDepth(connections, nodeDepths) {
            const edgesPassingThrough = new Map();

            connections.forEach(conn => {
                const fromDepth = nodeDepths.get(conn.from) || 0;
                const toDepth = nodeDepths.get(conn.to) || 0;

                // エッジが通過する各depthをカウント
                for (let d = fromDepth; d < toDepth; d++) {
                    edgesPassingThrough.set(d, (edgesPassingThrough.get(d) || 0) + 1);
                }
            });

            return edgesPassingThrough;
        }

        /**
         * 等間隔配置のX座標を計算
         * @param {Array} parentInfos - 親ノード情報配列 [{parentId, yPosition, x1, x2}]
         * @param {number} totalEdges - この階層を通過する全エッジ数
         * @param {number} maxParentRight - 親ノード群の最大右端X座標
         * @param {number} minChildLeft - 子ノード群の最小左端X座標
         * @returns {Map} parentId -> X座標のマップ
         */
        function calculateEvenSpacing(parentInfos, totalEdges, maxParentRight, minChildLeft) {
            const result = new Map();

            // Y座標でソート
            parentInfos.sort((a, b) => a.yPosition - b.yPosition);

            const totalParents = parentInfos.length;
            const rawAvailableWidth = minChildLeft - maxParentRight - EDGE_CONSTANTS.MIN_OFFSET * 2;

            // 有効なレーン数は親ノード数とエッジ数の大きい方
            const effectiveLaneCount = Math.max(totalParents, totalEdges);
            const laneSpacing = Math.max(EDGE_CONSTANTS.EDGE_SPACING, rawAvailableWidth / (effectiveLaneCount + 1));

            // 中央配置計算
            const centerX = (maxParentRight + minChildLeft) / 2;
            const totalWidth = laneSpacing * totalParents;
            const startX = centerX - totalWidth / 2;

            // 各親に等間隔でX座標を割り当て
            parentInfos.forEach((parent, index) => {
                let x = startX + (index + 0.5) * laneSpacing;

                // 垂直セグメントX座標は親ノードの右端より右側にある必要がある
                const minX = parent.x1 + EDGE_CONSTANTS.MIN_OFFSET;
                if (x < minX) {
                    x = minX;
                }

                result.set(parent.parentId, x);
            });

            return result;
        }

        /**
         * 親ノードをX座標でクラスタリング
         * X座標が大きく離れているノードを別クラスタに分離
         * @param {Array} parentInfos - 親ノード情報配列
         * @returns {Array<Array>} クラスタの配列
         */
        function clusterParentsByXPosition(parentInfos) {
            if (parentInfos.length === 0) return [];
            if (parentInfos.length === 1) return [parentInfos];

            // X座標でソート
            const sorted = [...parentInfos].sort((a, b) => a.x1 - b.x1);

            const clusters = [];
            let currentCluster = [sorted[0]];

            // X座標の差が大きい箇所で分割
            for (let i = 1; i < sorted.length; i++) {
                const gap = sorted[i].x1 - sorted[i - 1].x1;

                if (gap > EDGE_CONSTANTS.CLUSTER_X_THRESHOLD) {
                    // 大きなギャップ → 新しいクラスタを開始
                    clusters.push(currentCluster);
                    currentCluster = [sorted[i]];
                } else {
                    // 同じクラスタに追加
                    currentCluster.push(sorted[i]);
                }
            }

            // 最後のクラスタを追加
            clusters.push(currentCluster);

            return clusters;
        }

        /**
         * 親ごとの垂直セグメントX座標を計算（親別版）
         * 異なる親には異なるX座標を割り当てて識別しやすくする
         * @param {Map} nodePositions - ノード位置マップ
         * @param {Array} connections - 接続配列
         * @param {Map} nodeDepths - ノードの深さマップ
         * @param {Array} levelXPositions - 階層のX座標配列
         * @param {Array} levelMaxWidths - 階層の最大幅配列
         * @returns {Map} parentId -> 垂直セグメントX座標のマップ
         */
        function calculateVerticalSegmentX(nodePositions, connections, nodeDepths, levelXPositions, levelMaxWidths) {
            const result = new Map();

            // 深さ境界を計算
            const { depthMaxParentRight, depthMinChildLeft } = calculateDepthBounds(
                nodePositions, connections, nodeDepths, levelXPositions, levelMaxWidths
            );

            // 親をdepthごとにグループ化
            const parentsByDepth = groupParentsByDepth(connections, nodeDepths);

            // 各depthを通過する全エッジ数をカウント
            const edgesPassingThroughDepth = countEdgesPassingThroughDepth(connections, nodeDepths);

            // 各depthの親情報を構築
            parentsByDepth.forEach((parentIds, depth) => {
                const parentInfos = parentIds.map(parentId => {
                    const pos = nodePositions.get(parentId);
                    return {
                        parentId: parentId,
                        yPosition: pos.y + pos.height / 2,
                        x1: pos.x + pos.width,
                        x2: pos.x
                    };
                });

                // X座標でクラスタリング
                const clusters = clusterParentsByXPosition(parentInfos);

                // 各クラスタごとに配置を計算
                clusters.forEach(cluster => {
                    // クラスタ内の最大右端
                    const clusterMaxRight = Math.max(...cluster.map(p => p.x1));

                    // クラスタ内の親から出ている全エッジの子ノードの最小左端
                    const clusterChildXs = [];
                    cluster.forEach(p => {
                        connections.forEach(conn => {
                            if (conn.from === p.parentId) {
                                const childPos = nodePositions.get(conn.to);
                                if (childPos) {
                                    clusterChildXs.push(childPos.x);
                                }
                            }
                        });
                    });
                    const clusterMinLeft = clusterChildXs.length > 0 ? Math.min(...clusterChildXs) : depthMinChildLeft.get(depth);

                    // 等間隔配置を計算
                    const totalEdges = edgesPassingThroughDepth.get(depth) || cluster.length;
                    const spacing = calculateEvenSpacing(cluster, totalEdges, clusterMaxRight, clusterMinLeft);

                    // 各親に割り当て
                    spacing.forEach((x, parentId) => {
                        result.set(parentId, x);
                    });
                });
            });

            return result;
        }

        /**
         * 親ごとに衝突回避オフセットを計算
         * 各親に個別のオフセットを適用
         * @param {Map} nodePositions - ノード位置マップ
         * @param {Array} connections - 接続配列
         * @param {Map} nodeDepths - ノードの深さマップ
         * @param {Map} baseVerticalSegmentX - 親ID -> 基本X座標のマップ
         * @param {Array} nodeBounds - ノードバウンディングボックス配列
         * @param {Array} labelBounds - ラベルバウンディングボックス配列
         * @returns {Map} parentId -> オフセット値のマップ
         */
        function _aggregateOffsetsByDepth(nodePositions, connections, nodeDepths, baseVerticalSegmentX, nodeBounds, labelBounds) {
            const parentMaxOffset = new Map();

            // 親をdepthごとにグループ化
            const parentsByDepth = groupParentsByDepth(connections, nodeDepths);

            // 親ごとにオフセットを計算
            parentsByDepth.forEach((parentIds, depth) => {
                parentIds.forEach(parentId => {
                    const baseVerticalX = baseVerticalSegmentX.get(parentId);
                    if (baseVerticalX === undefined) return;

                    let parentOffset = 0;

                    // この親から出る全エッジについてオフセットを計算
                    connections.forEach(conn => {
                        if (conn.from !== parentId) return;

                        const fromPos = nodePositions.get(conn.from);
                        const toPos = nodePositions.get(conn.to);
                        if (!fromPos || !toPos) return;

                        const y1 = fromPos.y + fromPos.height / 2;
                        const y2 = toPos.y + toPos.height / 2;

                        // ノード回避オフセットを計算
                        const nodeOffset = _calculateNodeAvoidanceOffset(baseVerticalX, y1, y2, nodeBounds);

                        // ラベル回避オフセットを計算
                        const labelOffset = _calculateLabelAvoidanceOffset(baseVerticalX + nodeOffset, y1, y2, labelBounds);

                        const totalOffset = nodeOffset + labelOffset;
                        parentOffset = Math.max(parentOffset, totalOffset);
                    });

                    // 各親に個別のオフセットを適用
                    parentMaxOffset.set(parentId, parentOffset);
                });
            });

            return parentMaxOffset;
        }

        /**
         * 衝突回避が必要なエッジの2本目の垂直セグメントX座標を計算
         * 異なる親から出ているエッジは異なるX座標で折れる（親階層右端と子階層左端の間で等分）
         * @param {Array} collisionEdges - 衝突回避エッジ情報配列
         * @param {Map} nodeDepths - ノードID -> depth のマップ
         * @param {Map} nodePositions - ノード位置マップ
         * @param {Map} depthMaxParentRight - 階層 -> 親ノードの最大右端X座標
         * @param {Map} depthMinChildLeft - 階層 -> 子ノードの最小左端X座標
         * @returns {Map} エッジキー -> 2本目の垂直セグメントX座標のマップ
         */
        function _calculateSecondVerticalSegmentX(collisionEdges, nodeDepths, nodePositions, depthMaxParentRight, depthMinChildLeft) {
            const edgeToSecondVerticalX = new Map();

            if (collisionEdges.length === 0) {
                return edgeToSecondVerticalX;
            }

            // depthごとにエッジをグループ化（終点ノードの親階層を使用）
            const edgesByDepth = new Map();
            collisionEdges.forEach(edge => {
                // 2本目の垂直セグメントは終点ノードの直前階層に配置される
                const targetDepth = edge.toDepth - 1;
                if (targetDepth < 0) return; // ルートノードへのエッジは除外

                if (!edgesByDepth.has(targetDepth)) {
                    edgesByDepth.set(targetDepth, []);
                }
                edgesByDepth.get(targetDepth).push(edge);
            });

            // 各depthグループについて処理
            edgesByDepth.forEach((depthEdges, depth) => {
                // この階層の範囲を取得
                const startX = depthMaxParentRight.get(depth);
                const endX = depthMinChildLeft.get(depth);

                if (startX === undefined || endX === undefined) {
                    return;
                }

                const availableWidth = endX - startX;

                // 親ごとにエッジをグループ化
                const edgesByParent = new Map();
                depthEdges.forEach(edge => {
                    const parts = edge.edgeKey.split('->');
                    const parentId = parts[0];

                    if (!edgesByParent.has(parentId)) {
                        edgesByParent.set(parentId, []);
                    }
                    edgesByParent.get(parentId).push(edge);
                });

                // 親をY座標でソートしてインデックスを割り当て
                const parentInfos = [];
                edgesByParent.forEach((edges, parentId) => {
                    const pos = nodePositions.get(parentId);
                    if (pos) {
                        parentInfos.push({
                            parentId: parentId,
                            yPosition: pos.y + pos.height / 2,
                            edges: edges
                        });
                    }
                });
                parentInfos.sort((a, b) => a.yPosition - b.yPosition);

                const parentCount = parentInfos.length;

                // 親の数で等分（両端のマージンを含めてparentCount+1で割る）
                const spacing = availableWidth / (parentCount + 1);

                // 各親グループに対して位置を計算
                parentInfos.forEach((parentInfo, parentIndex) => {
                    const edges = parentInfo.edges;

                    // この親の2本目垂直セグメントX座標
                    const secondVerticalX = startX + spacing * (parentIndex + 1);

                    edges.forEach(edge => {
                        edgeToSecondVerticalX.set(edge.edgeKey, secondVerticalX);
                    });
                });
            });

            return edgeToSecondVerticalX;
        }

        function routeEdges(input) {
            const { nodePositions, connections, levelXPositions, levelMaxWidths, labelBounds } = input;

            const edgeRoutes = new Map();

            // ノード深さを計算
            const nodeDepths = calculateNodeDepths(connections);

            // 階層ごとの親の右端と子の左端を計算
            const { depthMaxParentRight, depthMinChildLeft } = calculateDepthBounds(
                nodePositions, connections, nodeDepths, levelXPositions, levelMaxWidths
            );

            // ノード境界情報を構築
            const nodeBounds = [];
            nodePositions.forEach((pos, nodeId) => {
                nodeBounds.push({
                    id: nodeId,
                    left: pos.x,
                    right: pos.x + pos.width,
                    top: pos.y,
                    bottom: pos.y + pos.height
                });
            });

            // ラベル境界情報（inputから取得、なければ空配列）
            const labelBoundsArray = labelBounds || [];

            // 第1段階：基本垂直セグメント計算
            const baseVerticalSegmentX = calculateVerticalSegmentX(
                nodePositions, connections, nodeDepths, levelXPositions, levelMaxWidths
            );

            // 第2段階：衝突回避オフセット集約（depth単位で統一）
            const offsetsByParent = _aggregateOffsetsByDepth(
                nodePositions, connections, nodeDepths, baseVerticalSegmentX, nodeBounds, labelBoundsArray
            );

            // 最終的な垂直セグメントX座標（基本 + オフセット）
            const verticalSegmentXByParent = new Map();
            baseVerticalSegmentX.forEach((baseX, parentId) => {
                const offset = offsetsByParent.get(parentId) || 0;
                verticalSegmentXByParent.set(parentId, baseX + offset);
            });

            // 最終セグメントY調整が必要なエッジを検出
            const edgeToYAdjustment = new Map();
            connections.forEach(conn => {
                const fromPos = nodePositions.get(conn.from);
                const toPos = nodePositions.get(conn.to);
                if (!fromPos || !toPos) return;

                const y1 = fromPos.y + fromPos.height / 2;
                const y2 = toPos.y + toPos.height / 2;
                if (y1 === y2) return; // 水平エッジはスキップ

                const x2 = toPos.x;
                let verticalSegmentX = verticalSegmentXByParent.get(conn.from);
                if (verticalSegmentX === undefined) {
                    verticalSegmentX = fromPos.x + fromPos.width + EDGE_CONSTANTS.DEFAULT_VERTICAL_OFFSET;
                }

                // 最終セグメントY座標調整チェック（ターゲットノードは除外）
                const filteredBoundsFinal = nodeBounds.filter(n => n.id !== conn.to);
                const adjustedY2 = _adjustHorizontalSegmentY(verticalSegmentX, y2, x2, filteredBoundsFinal);
                if (adjustedY2 !== null) {
                    const edgeKey = createEdgeKey(conn.from, conn.to);
                    edgeToYAdjustment.set(edgeKey, {
                        originalY: y2,
                        adjustedY: adjustedY2,
                        needsAdjustment: true
                    });
                }
            });

            // 衝突回避が必要なエッジを抽出
            const collisionEdges = [];
            edgeToYAdjustment.forEach((yAdjustment, edgeKey) => {
                if (!yAdjustment.needsAdjustment) return;

                const parts = edgeKey.split('->');
                const fromId = parts[0];
                const toId = parts[1];

                const fromPos = nodePositions.get(fromId);
                const toPos = nodePositions.get(toId);
                if (!fromPos || !toPos) return;

                let verticalSegmentX = verticalSegmentXByParent.get(fromId);
                if (verticalSegmentX === undefined) {
                    verticalSegmentX = fromPos.x + fromPos.width + EDGE_CONSTANTS.DEFAULT_VERTICAL_OFFSET;
                }

                const fromDepth = nodeDepths.get(fromId) || 0;
                const toDepth = nodeDepths.get(toId) || 0;

                collisionEdges.push({
                    edgeKey: edgeKey,
                    p4x: verticalSegmentX,
                    endX: toPos.x,
                    fromDepth: fromDepth,
                    toDepth: toDepth
                });
            });

            // 第2段階：2本目の垂直セグメントX座標を計算
            const edgeToSecondVerticalX = _calculateSecondVerticalSegmentX(
                collisionEdges, nodeDepths, nodePositions, depthMaxParentRight, depthMinChildLeft
            );

            // セグメント生成
            connections.forEach(conn => {
                const fromPos = nodePositions.get(conn.from);
                const toPos = nodePositions.get(conn.to);

                if (!fromPos || !toPos) {
                    return;
                }

                const x1 = fromPos.x + fromPos.width;
                let y1 = fromPos.y + fromPos.height / 2;
                const x2 = toPos.x;
                let y2 = toPos.y + toPos.height / 2;

                const edgeKey = createEdgeKey(conn.from, conn.to);

                if (y1 === y2) {
                    // 水平エッジ（1セグメント）
                    const segments = [
                        new Segment('horizontal', new Point(x1, y1), new Point(x2, y2))
                    ];
                    const arrowPoint = new Point(x2, y2);
                    edgeRoutes.set(edgeKey, new EdgeRoute(segments, arrowPoint));
                } else {
                    // 垂直セグメントを含むエッジ
                    let verticalSegmentX = verticalSegmentXByParent.get(conn.from);
                    if (verticalSegmentX === undefined) {
                        verticalSegmentX = x1 + EDGE_CONSTANTS.DEFAULT_VERTICAL_OFFSET;
                    }

                    // 初期セグメントY座標調整（ソースノードを除外）
                    const filteredBoundsInitial = nodeBounds.filter(n => n.id !== conn.from);
                    const adjustedY1 = _adjustHorizontalSegmentY(fromPos.x, y1, verticalSegmentX, filteredBoundsInitial);
                    if (adjustedY1 !== null) {
                        y1 = adjustedY1;
                    }

                    // Y調整情報を取得
                    const yAdjustment = edgeToYAdjustment.get(edgeKey);
                    const needsSecondVertical = yAdjustment && yAdjustment.needsAdjustment;
                    const secondVerticalX = edgeToSecondVerticalX.get(edgeKey);

                    const segments = [];

                    if (needsSecondVertical && secondVerticalX !== undefined) {
                        // 5-7セグメントルーティング（H-V-H-V-H）
                        const adjustedY2 = yAdjustment.adjustedY;

                        // セグメント1: 初期水平線
                        segments.push(new Segment('horizontal', new Point(x1, y1), new Point(verticalSegmentX, y1)));

                        // セグメント2: 第1垂直線
                        segments.push(new Segment('vertical', new Point(verticalSegmentX, y1), new Point(verticalSegmentX, adjustedY2)));

                        // セグメント3: 中間水平線
                        segments.push(new Segment('horizontal', new Point(verticalSegmentX, adjustedY2), new Point(secondVerticalX, adjustedY2)));

                        // セグメント4: 第2垂直線
                        segments.push(new Segment('vertical', new Point(secondVerticalX, adjustedY2), new Point(secondVerticalX, y2)));

                        // セグメント5: 最終水平線
                        segments.push(new Segment('horizontal', new Point(secondVerticalX, y2), new Point(x2, y2)));
                    } else {
                        // 3セグメントルーティング（H-V-H）
                        // 最終セグメントY座標調整（ターゲットノードは除外）
                        const filteredBoundsFinal = nodeBounds.filter(n => n.id !== conn.to);
                        const adjustedY2 = _adjustHorizontalSegmentY(verticalSegmentX, y2, x2, filteredBoundsFinal);
                        if (adjustedY2 !== null) {
                            y2 = adjustedY2;
                        }

                        segments.push(new Segment('horizontal', new Point(x1, y1), new Point(verticalSegmentX, y1)));
                        segments.push(new Segment('vertical', new Point(verticalSegmentX, y1), new Point(verticalSegmentX, y2)));
                        segments.push(new Segment('horizontal', new Point(verticalSegmentX, y2), new Point(x2, y2)));
                    }

                    const arrowPoint = new Point(x2, y2);
                    edgeRoutes.set(edgeKey, new EdgeRoute(segments, arrowPoint));
                }
            });

            // エッジ交差を検出
            const crossings = detectEdgeCrossings(edgeRoutes, nodePositions, connections);

            // 交差があるエッジのセグメントを分割してジャンプアークを挿入
            if (crossings.size > 0) {
                crossings.forEach((crossingPoints, edgeKey) => {
                    const route = edgeRoutes.get(edgeKey);
                    if (!route) return;

                    const newSegments = [];

                    route.segments.forEach(segment => {
                        if (segment.type === 'horizontal') {
                            // この水平セグメントにかかる交差点をフィルタ
                            const segmentCrossings = crossingPoints.filter(p => {
                                const minX = Math.min(segment.start.x, segment.end.x);
                                const maxX = Math.max(segment.start.x, segment.end.x);
                                return p.x >= minX && p.x <= maxX && Math.abs(p.y - segment.start.y) < 0.1;
                            });

                            // セグメントを分割
                            const splitSegments = splitSegmentWithJumpArcs(segment, segmentCrossings);
                            newSegments.push(...splitSegments);
                        } else {
                            // 垂直セグメントはそのまま
                            newSegments.push(segment);
                        }
                    });

                    // ルートを更新
                    edgeRoutes.set(edgeKey, new EdgeRoute(newSegments, route.arrowPoint));
                });
            }

            return edgeRoutes;
        }

        /**
         * セグメントの長さを計算
         * @param {Segment} segment - セグメント
         * @returns {number} セグメントの長さ
         */
        function getSegmentLength(segment) {
            if (segment.type === 'horizontal' || segment.type === 'arc') {
                return Math.abs(segment.end.x - segment.start.x);
            } else if (segment.type === 'vertical') {
                return Math.abs(segment.end.y - segment.start.y);
            }
            return 0;
        }

        /**
         * セグメントの方向を判定
         * @param {Segment} segment - セグメント
         * @returns {string} 方向（'right', 'left', 'up', 'down'）
         */
        function getSegmentDirection(segment) {
            if (segment.type === 'horizontal' || segment.type === 'arc') {
                return segment.end.x > segment.start.x ? 'right' : 'left';
            } else if (segment.type === 'vertical') {
                return segment.end.y > segment.start.y ? 'down' : 'up';
            }
            return 'right';
        }

        /**
         * 2つのセグメント間でカーブを適用可能か判定
         * @param {Segment} seg1 - 最初のセグメント
         * @param {Segment} seg2 - 次のセグメント
         * @param {number} r - コーナー半径
         * @returns {boolean} カーブ適用可能かどうか
         */
        function canApplyCurve(seg1, seg2, r) {
            // 同じタイプのセグメント間ではカーブ不可
            if (seg1.type === seg2.type) {
                return false;
            }

            // arcまたはcurveセグメントがある場合は不可
            if (seg1.type === 'arc' || seg1.type === 'curve' || seg2.type === 'arc' || seg2.type === 'curve') {
                return false;
            }

            // 両方のセグメントが十分な長さを持つ場合のみカーブ適用
            const seg1Length = getSegmentLength(seg1);
            const seg2Length = getSegmentLength(seg2);

            return seg1Length > r * 2 && seg2Length > r * 2;
        }

        /**
         * カーブ付き遷移のSVGパスコマンドを生成
         * @param {Segment} seg1 - 最初のセグメント
         * @param {Segment} seg2 - 次のセグメント
         * @param {number} r - コーナー半径
         * @returns {string} SVGパスコマンド
         */
        function renderCurvedTransition(seg1, seg2, r) {
            const corner = seg1.end;
            let path = '';

            const dir1 = getSegmentDirection(seg1);
            const dir2 = getSegmentDirection(seg2);

            // seg1の終点手前までの直線
            if (seg1.type === 'horizontal') {
                const beforeCornerX = dir1 === 'right' ? corner.x - r : corner.x + r;
                path += ' L ' + beforeCornerX + ' ' + corner.y;
            } else {
                const beforeCornerY = dir1 === 'down' ? corner.y - r : corner.y + r;
                path += ' L ' + corner.x + ' ' + beforeCornerY;
            }

            // Qコマンドでカーブを描画
            path += ' Q ' + corner.x + ' ' + corner.y;

            // seg2の開始点（コーナーの先）
            if (seg2.type === 'horizontal') {
                const afterCornerX = dir2 === 'right' ? corner.x + r : corner.x - r;
                path += ' ' + afterCornerX + ' ' + corner.y;
            } else {
                const afterCornerY = dir2 === 'down' ? corner.y + r : corner.y - r;
                path += ' ' + corner.x + ' ' + afterCornerY;
            }

            return path;
        }

        /**
         * ジャンプアーク（半円）のSVGパスコマンドを生成
         * @param {ArcParams} arcParams - アークパラメータ
         * @param {Point} endPoint - 終点
         * @returns {string} SVGパスコマンド
         */
        function renderJumpArcV2(arcParams, endPoint) {
            // A rx ry x-axis-rotation large-arc-flag sweep-flag x y
            // ジャンプアークは上向きの半円（sweep-flag=1）
            return ' A ' + arcParams.radius + ' ' + arcParams.radius + ' 0 0 1 ' + endPoint.x + ' ' + endPoint.y;
        }

        /**
         * EdgeRouteからSVGパス文字列を生成
         * @param {EdgeRoute} edgeRoute - エッジルート
         * @param {number} cornerRadius - コーナー半径（カーブ用）
         * @returns {string} SVGパス文字列
         */
        function generateSVGPath(edgeRoute, cornerRadius) {
            if (!edgeRoute || !edgeRoute.segments || edgeRoute.segments.length === 0) {
                return '';
            }

            const r = cornerRadius !== undefined ? cornerRadius : EDGE_CONSTANTS.CORNER_RADIUS;
            const segments = edgeRoute.segments;

            // Mコマンドで開始
            let path = 'M ' + segments[0].start.x + ' ' + segments[0].start.y;

            for (let i = 0; i < segments.length; i++) {
                const current = segments[i];
                const next = segments[i + 1];

                // arcセグメントの場合はAコマンドを生成
                if (current.type === 'arc' && current.arcParams) {
                    path += renderJumpArcV2(current.arcParams, current.end);
                    continue;
                }

                // curveセグメントの場合はQコマンドを生成（将来用）
                if (current.type === 'curve' && current.curveParams) {
                    const cp1 = current.curveParams.controlPoint1;
                    path += ' Q ' + cp1.x + ' ' + cp1.y + ' ' + current.end.x + ' ' + current.end.y;
                    continue;
                }

                // 次のセグメントとカーブ適用可能かチェック
                if (next && canApplyCurve(current, next, r)) {
                    path += renderCurvedTransition(current, next, r);
                } else {
                    // 通常の直線
                    path += ' L ' + current.end.x + ' ' + current.end.y;
                }
            }

            return path;
        }
    `;
}

module.exports = {
    getEdgeRouter
};
