function analyzeTreeStructure(nodes, connections) {
    const childNodes = new Set(connections.map(c => c.to));
    const rootNodes = nodes.filter(node => !childNodes.has(node.id));

    const childrenMap = new Map();
    connections.forEach(conn => {
        if (!childrenMap.has(conn.from)) {
            childrenMap.set(conn.from, []);
        }
        childrenMap.get(conn.from).push(conn.to);
    });

    const levels = [];
    const visited = new Set();

    if (rootNodes.length > 0) {
        let currentLevel = rootNodes.map(node => node.id);
        let maxDepth = 0;

        while (currentLevel.length > 0 && maxDepth < 50) { // 最大深度制限
            const levelNodes = currentLevel.map(nodeId => nodes.find(n => n.id === nodeId)).filter(Boolean);
            levels.push(levelNodes);

            currentLevel.forEach(nodeId => visited.add(nodeId));

            const nextLevel = [];
            currentLevel.forEach(nodeId => {
                const children = childrenMap.get(nodeId) || [];
                children.forEach(childId => {
                    if (!visited.has(childId)) {
                        nextLevel.push(childId);
                    }
                });
            });

            currentLevel = [...new Set(nextLevel)];
            maxDepth++;
        }
    }

    return { rootNodes, levels, childrenMap };
}

function hierarchicalLayout(nodes, connections, calculateAllNodeWidths) {
    const container = document.getElementById('treeContainer');
    let containerWidth = Math.max(800, container.clientWidth || 800);

    // 全ノードの幅を事前計算（ラベルごとに統一）
    const nodeWidthMap = calculateAllNodeWidths(nodes);

    // 木構造を解析
    const treeStructure = analyzeTreeStructure(nodes, connections);

    // ノードの位置情報を保存するマップ
    const nodePositions = new Map();

    // 各階層レベルでノードを配置（一方向配置）
    const levelHeight = 80;
    const leftMargin = 50;
    const fixedSpacing = 60;

    treeStructure.levels.forEach((level, levelIndex) => {
        const y = 50 + levelIndex * levelHeight;

        if (levelIndex === 0) {
            // ルートレベルは左端から配置
            let currentX = leftMargin;
            level.forEach(node => {
                const element = document.getElementById(node.id);
                if (element) {
                    element.style.left = currentX + 'px';
                    element.style.top = y + 'px';
                    nodePositions.set(node.id, { x: currentX, y: y, width: nodeWidthMap.get(node.label) });
                    currentX += nodeWidthMap.get(node.label) + fixedSpacing;
                }
            });
        } else {
            // このレベルで既に配置されたノードの最右端X座標を追跡
            let levelMaxX = leftMargin;

            // 子レベルは親ノードの位置から右方向に配置
            level.forEach(node => {
                const element = document.getElementById(node.id);
                if (element) {
                    // この子ノードの親を見つける
                    const parentId = connections.find(conn => conn.to === node.id)?.from;
                    if (parentId && nodePositions.has(parentId)) {
                        const parentPos = nodePositions.get(parentId);

                        // 親の右端から配置開始（既に配置済みの兄弟ノードを考慮）
                        const siblings = connections.filter(conn => conn.from === parentId).map(conn => conn.to);
                        const siblingIndex = siblings.indexOf(node.id);

                        let startX = parentPos.x + parentPos.width + fixedSpacing;

                        // 兄弟ノードがある場合は順番に右へ配置
                        for (let i = 0; i < siblingIndex; i++) {
                            const siblingId = siblings[i];
                            if (nodePositions.has(siblingId)) {
                                const siblingPos = nodePositions.get(siblingId);
                                startX = Math.max(startX, siblingPos.x + siblingPos.width + fixedSpacing);
                            }
                        }

                        // レベル内の他のノードとの重複を回避
                        startX = Math.max(startX, levelMaxX);

                        element.style.left = startX + 'px';
                        element.style.top = y + 'px';
                        nodePositions.set(node.id, { x: startX, y: y, width: nodeWidthMap.get(node.label) });

                        // このレベルの最右端を更新
                        levelMaxX = Math.max(levelMaxX, startX + nodeWidthMap.get(node.label) + fixedSpacing);
                    } else {
                        // 親が見つからない場合はレベル内の最右端から配置
                        element.style.left = levelMaxX + 'px';
                        element.style.top = y + 'px';
                        nodePositions.set(node.id, { x: levelMaxX, y: y, width: nodeWidthMap.get(node.label) });
                        levelMaxX += nodeWidthMap.get(node.label) + fixedSpacing;
                    }
                }
            });
        }
    });

    // コンテナ幅を動的に調整
    const maxX = Math.max(...Array.from(nodePositions.values()).map(pos => pos.x + pos.width));
    if (maxX + 100 > containerWidth) {
        containerWidth = maxX + 100;
        container.style.width = containerWidth + 'px';
        console.log("Container width expanded to: " + containerWidth + "px for directional layout");
    }

    return nodePositions;
}

function createCSSLines(connections, nodePositions) {
    const container = document.getElementById('treeContainer');
    if (!container) {
        console.error('Container element not found');
        return;
    }

    // 既存の接続線を削除
    const existingLines = container.querySelectorAll('.connection-line');
    existingLines.forEach(line => line.remove());

    let connectionCount = 0;
    connections.forEach(conn => {
        const fromElement = document.getElementById(conn.from);
        const toElement = document.getElementById(conn.to);

        if (fromElement && toElement) {
            const fromRect = {
                left: fromElement.offsetLeft,
                top: fromElement.offsetTop,
                width: fromElement.offsetWidth,
                height: fromElement.offsetHeight
            };
            const toRect = {
                left: toElement.offsetLeft,
                top: toElement.offsetTop,
                width: toElement.offsetWidth,
                height: toElement.offsetHeight
            };

            // 一方向レイアウトに適した矢印描画（親の右端から子の左端へ）
            const x1 = fromRect.left + fromRect.width;
            const y1 = fromRect.top + fromRect.height / 2;
            const x2 = toRect.left;
            const y2 = toRect.top + toRect.height / 2;

            // 線の長さと角度を計算
            const dx = x2 - x1;
            const dy = y2 - y1;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;

            // CSS線要素を作成
            const line = document.createElement('div');
            line.className = 'connection-line';
            line.style.left = x1 + 'px';
            line.style.top = y1 + 'px';
            line.style.width = length + 'px';
            line.style.transform = `rotate(${angle}deg)`;

            container.appendChild(line);
            connectionCount++;
        }
    });

    console.log("Created " + connectionCount + " CSS lines");
}