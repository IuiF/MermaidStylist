function getHorizontalLayout() {
    return `
        function horizontalLayout(nodes, connections, calculateAllNodeWidths, analyzeTreeStructure) {
            const container = document.getElementById('treeContainer');
            let containerHeight = Math.max(800, container.clientHeight || 800);

            const nodeWidthMap = calculateAllNodeWidths(nodes);
            const treeStructure = analyzeTreeStructure(nodes, connections);
            const nodePositions = new Map();

            const leftMargin = 50;
            const topMargin = 50;
            const baseSpacing = 60; // 基本スペース
            const edgeClearance = 80; // エッジとノード間のクリアランス
            const minLevelSpacing = 200; // 階層間の最小距離

            // ノード間のエッジラベル数を計算
            function calculateNodeSpacing(nodeId, connections) {
                const incomingEdges = connections.filter(conn => conn.to === nodeId);
                const labelsCount = incomingEdges.filter(conn => conn.label).length;
                if (labelsCount === 0) return baseSpacing;

                // 実際のラベル高さとスペース（labels.jsと一致）
                const actualLabelHeight = 20;
                const labelVerticalSpacing = 10;
                const topMargin = 5;

                // 全ラベルの積み重ね高さを考慮
                const totalLabelHeight = actualLabelHeight + topMargin +
                                          (labelsCount - 1) * (actualLabelHeight + labelVerticalSpacing);

                return baseSpacing + totalLabelHeight;
            }

            // 各階層の最大ノード幅を事前に計算
            const levelMaxWidths = [];
            treeStructure.levels.forEach((level, levelIndex) => {
                let maxWidth = 0;
                level.forEach(node => {
                    const element = document.getElementById(node.id);
                    if (element && !element.classList.contains('hidden')) {
                        const dimensions = getNodeDimensions(element);
                        maxWidth = Math.max(maxWidth, dimensions.width);
                    }
                });
                levelMaxWidths[levelIndex] = maxWidth;
            });

            // 各階層間の必要な距離を動的に計算
            const levelSpacings = [];
            for (let i = 0; i < treeStructure.levels.length - 1; i++) {
                const fromLevel = treeStructure.levels[i];
                const toLevel = treeStructure.levels[i + 1];
                levelSpacings[i] = calculateLevelSpacing(fromLevel, toLevel, connections, i, i + 1, treeStructure.levels);
            }

            // 各階層のX座標を計算
            const levelXPositions = [leftMargin];
            for (let i = 1; i < treeStructure.levels.length; i++) {
                const spacing = Math.max(levelSpacings[i - 1] || minLevelSpacing, minLevelSpacing);
                levelXPositions[i] = levelXPositions[i - 1] + levelMaxWidths[i - 1] + spacing + edgeClearance;
            }

            treeStructure.levels.forEach((level, levelIndex) => {
                const levelX = levelXPositions[levelIndex];
                let currentY = topMargin;

                level.forEach(node => {
                    const element = document.getElementById(node.id);
                    if (element && !element.classList.contains('hidden')) {
                        // 全ての親を取得
                        const parents = connections.filter(conn => conn.to === node.id).map(conn => conn.from);

                        if (parents.length > 0) {
                            // 複数の親を持つ場合、配置後のY座標が最小になる親を選択
                            let selectedParent = null;
                            let minResultY = Infinity;

                            for (const parentId of parents) {
                                if (nodePositions.has(parentId)) {
                                    const parentPos = nodePositions.get(parentId);
                                    const siblings = connections.filter(conn => conn.from === parentId).map(conn => conn.to);
                                    const nodeSpacing = calculateNodeSpacing(node.id, connections);

                                    // この親を選択した場合の配置Y座標を計算
                                    let candidateY = parentPos.y;

                                    // 全ての兄弟の下に配置
                                    siblings.forEach(siblingId => {
                                        if (siblingId !== node.id && nodePositions.has(siblingId)) {
                                            const siblingPos = nodePositions.get(siblingId);
                                            const siblingSpacing = calculateNodeSpacing(siblingId, connections);
                                            candidateY = Math.max(candidateY, siblingPos.y + siblingPos.height + siblingSpacing);
                                        }
                                    });

                                    candidateY = Math.max(candidateY, currentY);

                                    // 最もY座標が小さくなる親を選択
                                    if (candidateY < minResultY) {
                                        minResultY = candidateY;
                                        selectedParent = parentId;
                                    }
                                }
                            }

                            if (selectedParent) {
                                // 既に計算済みの最適Y座標を使用
                                const nodeSpacing = calculateNodeSpacing(node.id, connections);

                                setNodePosition(element, levelX, minResultY);
                                const dimensions = getNodeDimensions(element);
                                nodePositions.set(node.id, { x: levelX, y: minResultY, width: dimensions.width, height: dimensions.height });

                                currentY = Math.max(currentY, minResultY + dimensions.height + nodeSpacing);
                            } else {
                                const nodeSpacing = calculateNodeSpacing(node.id, connections);
                                setNodePosition(element, levelX, currentY);
                                const dimensions = getNodeDimensions(element);
                                nodePositions.set(node.id, { x: levelX, y: currentY, width: dimensions.width, height: dimensions.height });
                                currentY += dimensions.height + nodeSpacing;
                            }
                        } else {
                            const nodeSpacing = calculateNodeSpacing(node.id, connections);
                            setNodePosition(element, levelX, currentY);
                            const dimensions = getNodeDimensions(element);
                            nodePositions.set(node.id, { x: levelX, y: currentY, width: dimensions.width, height: dimensions.height });
                            currentY += dimensions.height + nodeSpacing;
                        }
                    }
                });
            });

            // エッジとノードの衝突を検知して回避
            // エッジの垂直線とノードが実際に重なる場合のみシフト
            function resolveEdgeNodeCollisions() {
                const maxIterations = 10;
                const collisionMargin = 20;

                for (let iteration = 0; iteration < maxIterations; iteration++) {
                    let hasCollision = false;

                    connections.forEach(conn => {
                        const fromPos = nodePositions.get(conn.from);
                        const toPos = nodePositions.get(conn.to);

                        if (!fromPos || !toPos) return;

                        // 始点と終点の階層を取得
                        let fromLevel = -1, toLevel = -1;
                        treeStructure.levels.forEach((level, idx) => {
                            if (level.some(n => n.id === conn.from)) fromLevel = idx;
                            if (level.some(n => n.id === conn.to)) toLevel = idx;
                        });

                        if (fromLevel === -1 || toLevel === -1 || toLevel <= fromLevel) return;

                        // エッジの経路のY座標範囲を計算
                        const edgeMinY = Math.min(fromPos.y, toPos.y);
                        const edgeMaxY = Math.max(fromPos.y + fromPos.height, toPos.y + toPos.height);

                        // エッジの垂直線のX座標範囲を概算
                        // 垂直線は親ノードの右端から子ノードの左端の間にある
                        const verticalLineMinX = fromPos.x + fromPos.width;
                        const verticalLineMaxX = toPos.x;

                        // 中間階層のノードをチェック
                        for (let levelIdx = fromLevel + 1; levelIdx < toLevel; levelIdx++) {
                            const level = treeStructure.levels[levelIdx];
                            level.forEach(node => {
                                const nodePos = nodePositions.get(node.id);
                                if (!nodePos) return;

                                const element = document.getElementById(node.id);
                                if (!element || element.classList.contains('hidden')) return;

                                // Y座標の重なりをチェック
                                const nodeTop = nodePos.y - collisionMargin;
                                const nodeBottom = nodePos.y + nodePos.height + collisionMargin;
                                const yOverlap = nodeTop < edgeMaxY && nodeBottom > edgeMinY;

                                // X座標の重なりをチェック（垂直線とノードが実際に重なるか）
                                const nodeLeft = nodePos.x - collisionMargin;
                                const nodeRight = nodePos.x + nodePos.width + collisionMargin;
                                const xOverlap = !(verticalLineMaxX < nodeLeft || verticalLineMinX > nodeRight);

                                if (yOverlap && xOverlap) {
                                    // 衝突検出：ノードを下にシフト
                                    const shiftAmount = edgeMaxY - nodeTop + baseSpacing;
                                    if (window.DEBUG_CONNECTIONS) {
                                        console.log('[EdgeNodeCollision] Shifting ' + node.id + ' by ' + shiftAmount + 'px due to edge ' + conn.from + '->' + conn.to);
                                    }
                                    nodePos.y += shiftAmount;
                                    setNodePosition(element, nodePos.x, nodePos.y);
                                    hasCollision = true;
                                }
                            });
                        }
                    });

                    if (!hasCollision) break;
                }
            }

            // resolveEdgeNodeCollisions(); // 無効化：長距離エッジが中間階層全体を下にシフトしてギャップを作るため

            // 点線ノード専用のエッジ衝突回避
            // 点線ノードは通常エッジ（connections）のみを考慮し、点線エッジは無視
            function resolveDashedNodeEdgeCollisions() {
                const maxIterations = 5;
                const collisionMargin = 20;

                for (let iteration = 0; iteration < maxIterations; iteration++) {
                    let hasCollision = false;

                    // 点線ノードのみを対象
                    treeStructure.levels.forEach((level, levelIndex) => {
                        level.forEach(node => {
                            // 点線ノードかチェック
                            const element = document.getElementById(node.id);
                            if (!element || !element.classList.contains('dashed-node')) return;

                            const nodePos = nodePositions.get(node.id);
                            if (!nodePos) return;

                            // 通常エッジのみを対象（点線エッジは無視）
                            connections.forEach(conn => {
                                // 点線エッジはスキップ
                                if (conn.isDashed) return;
                                const fromPos = nodePositions.get(conn.from);
                                const toPos = nodePositions.get(conn.to);

                                if (!fromPos || !toPos) return;

                                // 始点と終点の階層を取得
                                let fromLevel = -1, toLevel = -1;
                                treeStructure.levels.forEach((lvl, idx) => {
                                    if (lvl.some(n => n.id === conn.from)) fromLevel = idx;
                                    if (lvl.some(n => n.id === conn.to)) toLevel = idx;
                                });

                                // このノードがfromとtoの間の階層にあるかチェック
                                if (fromLevel === -1 || toLevel === -1 || fromLevel >= levelIndex || toLevel <= levelIndex) return;

                                // 長距離エッジ（階層差が3以上）は除外：大きなシフトを防ぐ
                                const levelSpan = toLevel - fromLevel;
                                if (levelSpan >= 3) return;

                                // エッジの経路のY座標範囲を計算
                                const edgeMinY = Math.min(fromPos.y, toPos.y);
                                const edgeMaxY = Math.max(fromPos.y + fromPos.height, toPos.y + toPos.height);

                                // エッジの垂直線のX座標範囲を概算
                                const verticalLineMinX = fromPos.x + fromPos.width;
                                const verticalLineMaxX = toPos.x;

                                // ノードとの重なりをチェック
                                const nodeTop = nodePos.y - collisionMargin;
                                const nodeBottom = nodePos.y + nodePos.height + collisionMargin;
                                const yOverlap = nodeTop < edgeMaxY && nodeBottom > edgeMinY;

                                const nodeLeft = nodePos.x - collisionMargin;
                                const nodeRight = nodePos.x + nodePos.width + collisionMargin;
                                const xOverlap = !(verticalLineMaxX < nodeLeft || verticalLineMinX > nodeRight);

                                if (yOverlap && xOverlap) {
                                    // 衝突検出：点線ノードを下にシフト
                                    const shiftAmount = edgeMaxY - nodeTop + baseSpacing;
                                    if (window.DEBUG_CONNECTIONS) {
                                        console.log('[DashedNodeEdgeCollision] Shifting ' + node.id + ' by ' + shiftAmount + 'px due to edge ' + conn.from + '->' + conn.to);
                                    }
                                    nodePos.y += shiftAmount;
                                    setNodePosition(element, nodePos.x, nodePos.y);
                                    hasCollision = true;
                                }
                            });
                        });
                    });

                    if (!hasCollision) break;
                }
            }

            resolveDashedNodeEdgeCollisions();

            // 同じ階層内のノード同士の重なりを解消
            function resolveSameLevelCollisions() {
                treeStructure.levels.forEach((level, levelIndex) => {
                    // この階層のノードをY座標でソート
                    const levelNodes = level.map(node => ({
                        node: node,
                        pos: nodePositions.get(node.id)
                    })).filter(item => item.pos).sort((a, b) => a.pos.y - b.pos.y);

                    // 重なりをチェックして調整
                    for (let i = 0; i < levelNodes.length - 1; i++) {
                        const current = levelNodes[i];
                        const next = levelNodes[i + 1];

                        const currentBottom = current.pos.y + current.pos.height;
                        const nextTop = next.pos.y;
                        const nodeSpacing = calculateNodeSpacing(next.node.id, connections);

                        // 重なりまたは間隔不足をチェック
                        if (currentBottom + nodeSpacing > nextTop) {
                            const shiftAmount = currentBottom + nodeSpacing - nextTop;
                            next.pos.y += shiftAmount;
                            const element = document.getElementById(next.node.id);
                            if (element) {
                                setNodePosition(element, next.pos.x, next.pos.y);
                            }

                            // 後続のノードも全て同じ量だけシフト
                            for (let j = i + 2; j < levelNodes.length; j++) {
                                levelNodes[j].pos.y += shiftAmount;
                                const elem = document.getElementById(levelNodes[j].node.id);
                                if (elem) {
                                    setNodePosition(elem, levelNodes[j].pos.x, levelNodes[j].pos.y);
                                }
                            }
                        }
                    }
                });
            }

            resolveSameLevelCollisions();

            // ノードとエッジラベルの衝突を検出して回避
            // ラベルの予想位置を計算してノードとの衝突をチェック
            function resolveNodeLabelCollisions() {
                const maxIterations = 5;
                const collisionMargin = 5;
                const estimatedLabelHeight = 20; // labels.jsのlabelHeight相当
                const labelVerticalSpacing = 10; // labels.jsと同じ値
                const labelTopMargin = 5; // labels.jsと同じ値

                for (let iteration = 0; iteration < maxIterations; iteration++) {
                    let hasCollision = false;

                    // 各ターゲットノードへのラベル数をカウント
                    const labelCountByTarget = {};
                    connections.forEach(conn => {
                        if (conn.label && !conn.isDashed) {
                            if (!labelCountByTarget[conn.to]) {
                                labelCountByTarget[conn.to] = 0;
                            }
                            labelCountByTarget[conn.to]++;
                        }
                    });

                    // 各エッジラベルの予想位置を計算
                    const predictedLabelBounds = [];
                    const labelOffsets = {};

                    connections.forEach(conn => {
                        if (!conn.label || conn.isDashed) return;

                        const toPos = nodePositions.get(conn.to);
                        if (!toPos) return;

                        const toElement = document.getElementById(conn.to);
                        if (!toElement || toElement.classList.contains('hidden')) return;

                        // このターゲットノードへのラベルオフセット
                        if (!labelOffsets[conn.to]) {
                            labelOffsets[conn.to] = 0;
                        }
                        const offset = labelOffsets[conn.to];
                        labelOffsets[conn.to]++;

                        // ラベルの予想位置（labels.jsのロジックと同じ）
                        const labelLeft = toPos.x;
                        const labelTop = toPos.y - estimatedLabelHeight - labelTopMargin - (offset * (estimatedLabelHeight + labelVerticalSpacing));
                        const labelWidth = 100; // 概算値（実際の幅は描画時に決まる）
                        const labelHeight = estimatedLabelHeight;

                        predictedLabelBounds.push({
                            from: conn.from,
                            to: conn.to,
                            left: labelLeft,
                            top: labelTop,
                            right: labelLeft + labelWidth,
                            bottom: labelTop + labelHeight
                        });
                    });

                    // 各ノードと予想ラベル位置の衝突をチェック
                    treeStructure.levels.forEach((level, levelIndex) => {
                        level.forEach(node => {
                            const nodePos = nodePositions.get(node.id);
                            if (!nodePos) return;

                            const element = document.getElementById(node.id);
                            if (!element || element.classList.contains('hidden')) return;

                            const nodeLeft = nodePos.x;
                            const nodeTop = nodePos.y;
                            const nodeRight = nodePos.x + nodePos.width;
                            const nodeBottom = nodePos.y + nodePos.height;

                            // このノードと重なる予想ラベルを検出
                            predictedLabelBounds.forEach(label => {
                                // 自分自身に向かうラベルは除外
                                if (label.to === node.id) return;

                                const xOverlap = !(nodeRight + collisionMargin < label.left || nodeLeft - collisionMargin > label.right);
                                const yOverlap = !(nodeBottom + collisionMargin < label.top || nodeTop - collisionMargin > label.bottom);

                                if (xOverlap && yOverlap) {
                                    // 衝突検出：ノードを下にシフト
                                    const shiftAmount = label.bottom + collisionMargin - nodeTop + baseSpacing;
                                    if (window.DEBUG_CONNECTIONS) {
                                        console.log('[NodeLabelCollision] Shifting ' + node.id + ' by ' + shiftAmount + 'px due to label from ' + label.from + ' to ' + label.to);
                                    }
                                    nodePos.y += shiftAmount;
                                    setNodePosition(element, nodePos.x, nodePos.y);
                                    hasCollision = true;
                                }
                            });
                        });
                    });

                    if (!hasCollision) break;
                }
            }

            resolveNodeLabelCollisions();

            const maxY = Math.max(...Array.from(nodePositions.values()).map(pos => pos.y + pos.height));
            const maxX = Math.max(...Array.from(nodePositions.values()).map(pos => pos.x + pos.width));

            if (maxY + 100 > containerHeight) {
                containerHeight = maxY + 100;
                container.style.height = containerHeight + 'px';
            }

            let containerWidth = Math.max(800, container.clientWidth || 800);
            if (maxX + 100 > containerWidth) {
                containerWidth = maxX + 100;
                container.style.width = containerWidth + 'px';
            }

            // 階層情報をグローバルに保存（エッジレンダラーで使用）
            window.layoutLevelInfo = {
                levelXPositions: levelXPositions,
                levelMaxWidths: levelMaxWidths,
                levelCount: treeStructure.levels.length
            };

            return nodePositions;
        }
    `;
}

module.exports = {
    getHorizontalLayout
};