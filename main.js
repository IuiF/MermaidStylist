const fs = require('fs');

// Parse Mermaid nodes from content
function parseMermaidNodes(content) {
    const nodes = [];
    const lines = content.split('\n');

    for (const line of lines) {
        const nodeMatch = line.trim().match(/^\s*(id_\d+)\["([^"]+)"\]/);
        if (nodeMatch) {
            nodes.push({
                id: nodeMatch[1],
                label: nodeMatch[2]
            });
        }
    }

    return nodes;
}

// Parse Mermaid connections from content
function parseMermaidConnections(content) {
    const connections = [];
    const lines = content.split('\n');

    for (const line of lines) {
        const connectionMatch = line.trim().match(/^\s*(id_\d+)\s+-->\s+(id_\d+)/);
        if (connectionMatch) {
            connections.push({
                from: connectionMatch[1],
                to: connectionMatch[2]
            });
        }
    }

    return connections;
}

// Generate HTML from nodes and connections
function generateHTML(nodes, connections) {
    let html = `<!DOCTYPE html>
<html>
<head>
    <title>Mermaid Tree</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
        }
        .tree-container {
            position: relative;
            width: 100%;
            height: 800px;
            overflow: auto;
            border: 1px solid #ddd;
            background: #fafafa;
        }
        .node {
            position: absolute;
            border: 2px solid #333;
            background: #f9f9f9;
            padding: 8px 12px;
            border-radius: 5px;
            font-size: 12px;
            white-space: nowrap;
            cursor: pointer;
        }
        .connection-line {
            position: absolute;
            background-color: #666;
            transform-origin: left center;
            height: 2px;
            z-index: 1;
        }
        .connection-line::after {
            content: '';
            position: absolute;
            right: -8px;
            top: -3px;
            width: 0;
            height: 0;
            border-left: 8px solid #666;
            border-top: 4px solid transparent;
            border-bottom: 4px solid transparent;
        }
        .node {
            z-index: 2;
        }
    </style>
</head>
<body>
    <h1>Tree Structure</h1>
    <div class="tree-container" id="treeContainer">
`;

    for (const node of nodes) {
        html += `        <div class="node" id="${node.id}" data-label="${node.label}">${node.label}</div>\n`;
    }

    html += '    </div>\n';
    html += '    <script>\n';
    html += '        const nodes = ' + JSON.stringify(nodes) + ';\n';
    html += '        const connections = ' + JSON.stringify(connections) + ';\n';
    html += `
        function hierarchicalLayout() {
            const container = document.getElementById('treeContainer');
            let containerWidth = Math.max(800, container.clientWidth || 800);

            // 全ノードの幅を事前計算（ラベルごとに統一）
            const nodeWidthMap = calculateAllNodeWidths(nodes);

            // 木構造を解析
            const treeStructure = analyzeTreeStructure(nodes, connections);

            // 必要な最大幅を事前計算
            let maxRequiredWidth = 0;
            treeStructure.levels.forEach(level => {
                const spacing = calculateDynamicSpacing(level, containerWidth, nodeWidthMap);
                const requiredWidth = spacing.totalWidth + 100; // 左右マージン含む
                maxRequiredWidth = Math.max(maxRequiredWidth, requiredWidth);
            });

            // コンテナが狭すぎる場合は拡張
            if (maxRequiredWidth > containerWidth) {
                containerWidth = maxRequiredWidth;
                container.style.width = containerWidth + 'px';
                console.log("Container width expanded to: " + containerWidth + "px");
            }

            // 各階層レベルでノードを配置
            const levelHeight = 80;

            treeStructure.levels.forEach((level, levelIndex) => {
                const y = 50 + levelIndex * levelHeight;

                // 動的間隔計算（containerWidthと事前計算された幅マップを渡す）
                const spacing = calculateDynamicSpacing(level, containerWidth, nodeWidthMap);

                level.forEach((node, nodeIndex) => {
                    const element = document.getElementById(node.id);
                    if (element) {
                        element.style.left = spacing.positions[nodeIndex] + 'px';
                        element.style.top = y + 'px';
                    }
                });
            });
        }

        function measureTextWidth(text, font) {
            // キャンバスを使用して正確な文字幅を測定
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            context.font = font;
            return context.measureText(text).width;
        }

        function calculateAllNodeWidths(nodes) {
            const padding = 24; // ボックスのパディング（左右12pxずつ）
            const nodeWidthMap = new Map();
            const font = '12px Arial, sans-serif'; // CSSで指定されているフォント

            // 全ノードのラベルから幅を計算
            nodes.forEach(node => {
                if (!nodeWidthMap.has(node.label)) {
                    const textWidth = measureTextWidth(node.label, font);
                    const calculatedWidth = Math.ceil(textWidth) + padding;
                    nodeWidthMap.set(node.label, calculatedWidth);

                    // デバッグ：長いラベルの幅計算を出力
                    if (node.label.length > 8) {
                        console.log("Debug: label=" + node.label + ", measured width=" + Math.ceil(textWidth) + "px, total width=" + calculatedWidth + "px");
                    }
                }
            });

            return nodeWidthMap;
        }

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

        function calculateDynamicSpacing(nodes, containerWidth = 800, nodeWidthMap) {
            const fixedSpacing = 60; // 固定間隔（ノード端から端まで）
            const leftMargin = 50; // 左端マージン

            // 各ノードの幅を事前計算されたマップから取得
            const nodeWidths = nodes.map(node => {
                return nodeWidthMap.get(node.label);
            });

            if (nodes.length <= 1) {
                const singleNodeX = Math.max(leftMargin, (containerWidth - nodeWidths[0]) / 2);
                return {
                    fixedSpacing,
                    positions: [singleNodeX],
                    nodeWidths,
                    totalWidth: nodeWidths[0] || 0,
                    uniformSpacing: fixedSpacing
                };
            }

            // 固定間隔での総幅を計算
            const totalNodeWidth = nodeWidths.reduce((sum, width) => sum + width, 0);
            const totalSpacingWidth = fixedSpacing * (nodes.length - 1);
            const totalLayoutWidth = totalNodeWidth + totalSpacingWidth;

            // 中央寄せの開始位置を計算（左マージンを下回らないよう調整）
            const idealStartX = (containerWidth - totalLayoutWidth) / 2;
            const startX = Math.max(leftMargin, idealStartX);

            // デバッグ：レイアウト情報を出力
            if (nodes.length > 3) {
                console.log("Layout debug: containerWidth=" + containerWidth + "px, totalLayoutWidth=" + totalLayoutWidth + "px, startX=" + startX + "px");
            }

            const positions = [];
            let currentX = startX;

            for (let i = 0; i < nodes.length; i++) {
                positions.push(currentX);
                currentX += nodeWidths[i] + fixedSpacing;
            }

            return {
                fixedSpacing,
                positions,
                nodeWidths,
                totalWidth: totalLayoutWidth,
                uniformSpacing: fixedSpacing,
                actualStartX: startX
            };
        }

        function createCSSLines() {
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

                    const x1 = fromRect.left + fromRect.width / 2;
                    const y1 = fromRect.top + fromRect.height;
                    const x2 = toRect.left + toRect.width / 2;
                    const y2 = toRect.top;

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
                    line.style.transform = \`rotate(\${angle}deg)\`;

                    container.appendChild(line);
                    connectionCount++;
                }
            });

            console.log("Created " + connectionCount + " CSS lines");
        }

        window.onload = function() {
            hierarchicalLayout();

            // コンテナの高さを動的に設定
            const treeStructure = analyzeTreeStructure(nodes, connections);
            const container = document.getElementById('treeContainer');
            const requiredHeight = Math.max(800, treeStructure.levels.length * 80 + 100);

            container.style.height = requiredHeight + 'px';

            // デバッグ：実際の要素幅と計算値を比較
            setTimeout(() => {
                debugActualWidths();
                createCSSLines();
            }, 200);
        };

        function debugActualWidths() {
            const nodeWidthMap = calculateAllNodeWidths(nodes);

            nodes.forEach(node => {
                const element = document.getElementById(node.id);
                if (element && node.label.length > 10) {
                    const actualWidth = element.offsetWidth;
                    const calculatedWidth = nodeWidthMap.get(node.label);
                    const difference = actualWidth - calculatedWidth;

                    console.log("Width comparison: " + node.label);
                    console.log("  Calculated: " + calculatedWidth + "px, Actual: " + actualWidth + "px, Difference: " + difference + "px");
                }
            });
        }
    </script>
</body>
</html>`;
    return html;
}

// Main function
function main() {
    try {
        // Read the sample Mermaid file
        const mermaidContent = fs.readFileSync('sample_mermaid.mmd', 'utf8');

        // Parse nodes and connections
        const nodes = parseMermaidNodes(mermaidContent);
        const connections = parseMermaidConnections(mermaidContent);

        console.log(`Parsed ${nodes.length} nodes and ${connections.length} connections`);

        // Generate HTML
        const html = generateHTML(nodes, connections);

        // Write to output file
        fs.writeFileSync('output.html', html);

        console.log('HTML output generated: output.html');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();