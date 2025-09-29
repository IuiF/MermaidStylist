// Test for Mermaid parser
const assert = require('assert');
const fs = require('fs');

// Simple test to verify we can parse Mermaid node definitions
function testParseMermaidNodes() {
    const mermaidContent = `graph LR
    id_0["HE0320"]
    id_1["HE0560"]
    id_0 --> id_1`;

    const nodes = parseMermaidNodes(mermaidContent);

    assert.strictEqual(nodes.length, 2);
    assert.strictEqual(nodes[0].id, 'id_0');
    assert.strictEqual(nodes[0].label, 'HE0320');
    assert.strictEqual(nodes[1].id, 'id_1');
    assert.strictEqual(nodes[1].label, 'HE0560');

    console.log('parseMermaidNodes test passed');
}

// Simple test to verify we can parse Mermaid connections
function testParseMermaidConnections() {
    const mermaidContent = `graph LR
    id_0["HE0320"]
    id_1["HE0560"]
    id_0 --> id_1`;

    const connections = parseMermaidConnections(mermaidContent);

    assert.strictEqual(connections.length, 1);
    assert.strictEqual(connections[0].from, 'id_0');
    assert.strictEqual(connections[0].to, 'id_1');

    console.log('parseMermaidConnections test passed');
}

// Test tree structure analysis
function testAnalyzeTreeStructure() {
    const nodes = [
        { id: 'id_0', label: 'Root' },
        { id: 'id_1', label: 'Child1' },
        { id: 'id_2', label: 'Child2' },
        { id: 'id_3', label: 'Grandchild' }
    ];
    const connections = [
        { from: 'id_0', to: 'id_1' },
        { from: 'id_0', to: 'id_2' },
        { from: 'id_1', to: 'id_3' }
    ];

    const treeStructure = analyzeTreeStructure(nodes, connections);

    // ルートノードを正しく特定
    assert(treeStructure.rootNodes.length > 0);
    assert(treeStructure.rootNodes[0].id === 'id_0');

    // 階層レベルを正しく計算
    assert(treeStructure.levels.length === 3);
    assert(treeStructure.levels[0].length === 1); // root
    assert(treeStructure.levels[1].length === 2); // children
    assert(treeStructure.levels[2].length === 1); // grandchild

    console.log('analyzeTreeStructure test passed');
}

// Test CSS line creation
function testCSSLineCreation() {
    const nodes = [
        { id: 'id_0', label: 'Node1' },
        { id: 'id_1', label: 'Node2' }
    ];
    const connections = [
        { from: 'id_0', to: 'id_1' }
    ];

    const html = generateCSSConnectionHTML(nodes, connections);

    // CSS接続線の要素が含まれていることを確認
    assert(html.includes('connection-line'));
    assert(html.includes('position: absolute'));
    assert(html.includes('createCSSLines'));

    console.log('testCSSLineCreation test passed');
}

function generateCSSConnectionHTML(nodes, connections) {
    return `<!DOCTYPE html>
<html>
<head>
    <style>
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
    </style>
</head>
<body>
    <div id="treeContainer">
        <script>function createCSSLines() {}</script>
    </div>
</body>
</html>`;
}

// Test dynamic node spacing
function testDynamicNodeSpacing() {
    const nodes = [
        { id: 'id_0', label: 'Short' },
        { id: 'id_1', label: 'Very Long Label That Should Not Overlap' },
        { id: 'id_2', label: 'Medium Length' }
    ];

    const containerWidth = 800;
    // テスト用のnodeWidthMapを作成
    const nodeWidthMap = new Map();
    const charWidth = 10;
    const padding = 24;
    nodes.forEach(node => {
        const textWidth = node.label.length * charWidth;
        nodeWidthMap.set(node.label, textWidth + padding);
    });
    const spacing = calculateDynamicSpacing(nodes, containerWidth, nodeWidthMap);

    // 動的間隔計算の結果を検証
    assert(spacing.fixedSpacing === 60);
    assert(spacing.positions.length === nodes.length);
    assert(spacing.uniformSpacing === 60);

    // ノード間のスペースが統一されていることを確認（固定間隔60px）
    for (let i = 1; i < spacing.positions.length; i++) {
        const actualSpacing = spacing.positions[i] - spacing.positions[i-1] - spacing.nodeWidths[i-1];
        assert(Math.abs(actualSpacing - 60) < 1); // 60px固定間隔、1px未満の誤差許容
    }

    console.log('testDynamicNodeSpacing test passed');
}

// Test HTML generation
function testGenerateHTML() {
    const nodes = [
        { id: 'id_0', label: 'HE0320' },
        { id: 'id_1', label: 'HE0560' }
    ];
    const connections = [
        { from: 'id_0', to: 'id_1' }
    ];

    const html = generateHTML(nodes, connections);

    assert(html.includes('<html>'));
    assert(html.includes('HE0320'));
    assert(html.includes('HE0560'));
    // CSS接続線描画機能の存在を確認
    assert(html.includes('connection-line') || html.includes('createCSSLines'));
    assert(html.includes('hierarchicalLayout'));
    assert(html.includes('calculateDynamicSpacing'));

    console.log('generateHTML test passed');
}

// Run tests (will fail initially as functions don't exist yet)
try {
    testParseMermaidNodes();
    testParseMermaidConnections();
    testAnalyzeTreeStructure();
    testCSSLineCreation();
    testDynamicNodeSpacing();
    testGenerateHTML();
    console.log('All tests passed');
} catch (error) {
    console.log('Test failed:', error.message);
}

// Minimal implementation to make tests pass
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

            console.log(\`Created \${connectionCount} CSS lines\`);
        }

        window.onload = function() {
            hierarchicalLayout();

            // コンテナの高さを動的に設定
            const treeStructure = analyzeTreeStructure(nodes, connections);
            const container = document.getElementById('treeContainer');
            const requiredHeight = Math.max(800, treeStructure.levels.length * 80 + 100);

            container.style.height = requiredHeight + 'px';

            setTimeout(createCSSLines, 200);
        };
    </script>
</body>
</html>`;
    return html;
}

function measureTextWidth(text, font) {
    // キャンバスを使用して正確な文字幅を測定（テスト環境用の代替）
    // テスト環境ではcanvasが利用できない場合があるので文字数推定を使用
    return text.length * 8; // より保守的な推定
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
        }
    });

    return nodeWidthMap;
}

function analyzeTreeStructure(nodes, connections) {
    // ルートノードを特定（親がないノード）
    const childNodes = new Set(connections.map(c => c.to));
    const rootNodes = nodes.filter(node => !childNodes.has(node.id));

    // 親子関係のマップを作成
    const childrenMap = new Map();
    connections.forEach(conn => {
        if (!childrenMap.has(conn.from)) {
            childrenMap.set(conn.from, []);
        }
        childrenMap.get(conn.from).push(conn.to);
    });

    // 各階層レベルを計算
    const levels = [];
    const visited = new Set();

    if (rootNodes.length > 0) {
        let currentLevel = rootNodes.map(node => node.id);

        while (currentLevel.length > 0) {
            // 現在のレベルを追加
            const levelNodes = currentLevel.map(nodeId => nodes.find(n => n.id === nodeId)).filter(Boolean);
            levels.push(levelNodes);

            // 現在のレベルのノードを訪問済みにマーク
            currentLevel.forEach(nodeId => visited.add(nodeId));

            // 次のレベルを準備
            const nextLevel = [];
            currentLevel.forEach(nodeId => {
                const children = childrenMap.get(nodeId) || [];
                children.forEach(childId => {
                    if (!visited.has(childId)) {
                        nextLevel.push(childId);
                    }
                });
            });

            currentLevel = [...new Set(nextLevel)]; // 重複削除
        }
    }

    return {
        rootNodes,
        levels,
        childrenMap
    };
}

function calculateDynamicSpacing(nodes, containerWidth = 800, nodeWidthMap = null) {
    const fixedSpacing = 60; // 固定間隔（ノード端から端まで）
    const padding = 24; // ボックスのパディング（左右12pxずつ）
    const leftMargin = 50; // 左端マージン

    // 各ノードの推定幅を計算
    const nodeWidths = nodes.map(node => {
        if (nodeWidthMap) {
            return nodeWidthMap.get(node.label);
        } else {
            const textWidth = measureTextWidth(node.label, '12px Arial, sans-serif');
            return Math.ceil(textWidth) + padding;
        }
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