const { getBaseTemplate } = require('../templates/base');
const { getLayoutUtils } = require('../utils/layout-utils');
const { getTreeStructureAnalyzer } = require('../utils/tree-structure');
const { getVerticalLayout } = require('../layouts/vertical-layout');
const { getHorizontalLayout } = require('../layouts/horizontal-layout');
const { getConnectionRenderer } = require('../features/connection-renderer');
const { getCollapseManager } = require('../features/collapse-manager');
const { getLayoutSwitcher } = require('../features/layout-switcher');
const { getViewportManager } = require('../features/viewport-manager');
const { getContextMenu } = require('../features/context-menu');
const { getHighlightManager } = require('../features/highlight-manager');
const { getPathHighlighter } = require('../features/path-highlighter');

function generateHTML(nodes, connections) {
    const template = getBaseTemplate();

    let html = template.htmlStructure.doctype + '\n';
    html += template.htmlStructure.htmlOpen + '\n';
    html += template.htmlStructure.headOpen + '\n';
    html += '    ' + template.htmlStructure.title + '\n';
    html += '    <style>\n';
    html += template.css + '\n';
    html += '    </style>\n';
    html += template.htmlStructure.headClose + '\n';
    html += template.htmlStructure.bodyOpen + '\n';
    html += '    ' + template.htmlStructure.layoutControls + '\n';
    html += '    ' + template.htmlStructure.containerOpen + '\n';
    html += '    ' + template.htmlStructure.containerClose + '\n';
    html += getJavaScriptContent(nodes, connections);
    html += template.htmlStructure.bodyClose + '\n';
    html += template.htmlStructure.htmlClose;

    return html;
}

function getJavaScriptContent(nodes, connections) {
    return `    <script>
        const nodes = ${JSON.stringify(nodes)};
        const connections = ${JSON.stringify(connections)};

        // Import utilities
        ${getLayoutUtils()}

        // Import tree structure analyzer
        ${getTreeStructureAnalyzer()}

        // Import layouts
        ${getVerticalLayout()}
        ${getHorizontalLayout()}

        // Import connection renderer
        ${getConnectionRenderer()}

        // Import collapse manager
        ${getCollapseManager()}

        // Import layout switcher
        ${getLayoutSwitcher()}

        // Import viewport manager
        ${getViewportManager()}

        // Import highlight manager
        ${getHighlightManager()}

        // Import path highlighter
        ${getPathHighlighter()}

        // Import context menu
        ${getContextMenu()}

        // Create SVG nodes
        function createSVGNodes() {
            const svgLayer = document.getElementById('svgLayer');

            nodes.forEach(node => {
                const hasChildren = connections.some(conn => conn.from === node.id);

                // グループ要素を作成
                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                g.setAttribute('id', node.id);
                g.setAttribute('class', 'node');
                g.setAttribute('data-label', node.label);
                g.setAttribute('data-has-children', hasChildren);

                // 一時的なテキスト要素でテキスト幅を測定
                const tempText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                tempText.textContent = node.label;
                tempText.setAttribute('font-size', '12');
                tempText.setAttribute('font-family', 'Arial, sans-serif');
                svgLayer.appendChild(tempText);
                const textWidth = tempText.getBBox().width;
                svgLayer.removeChild(tempText);

                const padding = 12;
                const buttonWidth = hasChildren ? 15 : 0;
                const boxWidth = textWidth + padding * 2 + buttonWidth;
                const boxHeight = 28;

                // 背景矩形
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('class', 'node-rect');
                rect.setAttribute('width', boxWidth);
                rect.setAttribute('height', boxHeight);
                rect.setAttribute('rx', 5);
                rect.setAttribute('ry', 5);

                // テキスト
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('class', 'node-text');
                text.setAttribute('x', padding);
                text.setAttribute('y', boxHeight / 2);
                text.setAttribute('dominant-baseline', 'middle');
                text.textContent = node.label;

                g.appendChild(rect);
                g.appendChild(text);

                // 折りたたみボタン
                if (hasChildren) {
                    const button = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    button.setAttribute('class', 'collapse-button');
                    button.setAttribute('x', boxWidth - padding - 5);
                    button.setAttribute('y', boxHeight / 2);
                    button.setAttribute('dominant-baseline', 'middle');
                    button.textContent = '▼';
                    g.appendChild(button);
                }

                // データ属性を保存
                g.setAttribute('data-width', boxWidth);
                g.setAttribute('data-height', boxHeight);

                // 初期位置を(0,0)に設定
                g.setAttribute('transform', 'translate(0,0)');

                // イベントリスナーを追加
                if (hasChildren) {
                    g.addEventListener('click', function() {
                        toggleNodeCollapse(node.id);
                    });
                }

                svgLayer.appendChild(g);
            });
        }

        window.onload = function() {
            createSVGNodes();
            collapseManager.init();
            viewportManager.init();
            contextMenu.init();

            // SVGノードが配置されるまで少し待つ
            setTimeout(() => {
                // Apply initial layout
                currentNodePositions = horizontalLayout(nodes, connections, calculateAllNodeWidths, analyzeTreeStructure);

                // レイアウト完了後に接続線を描画
                setTimeout(() => {
                    debugActualWidths(nodes);
                    createCSSLines(connections, currentNodePositions);
                }, 100);
            }, 50);
        };
    </script>`;
}

function generateErrorHTML(errors) {
    const errorList = errors.map(err => `            <li>${err}</li>`).join('\n');

    return `<!DOCTYPE html>
<html>
<head>
    <title>エラー - Mermaid Tree</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 40px;
            background-color: #f5f5f5;
        }
        .error-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #d32f2f;
            margin-top: 0;
        }
        .error-message {
            background: #ffebee;
            border-left: 4px solid #d32f2f;
            padding: 15px;
            margin: 20px 0;
        }
        ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        li {
            margin: 8px 0;
            line-height: 1.6;
        }
        .info {
            color: #666;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <h1>⚠ 木構造ではないため描画できません</h1>
        <div class="error-message">
            <strong>検出されたエラー:</strong>
            <ul>
${errorList}
            </ul>
        </div>
        <div class="info">
            <p>このツールは木構造のMermaid図のみをサポートしています。</p>
            <p>木構造の条件:</p>
            <ul>
                <li>各ノードは最大1つの親を持つ</li>
                <li>ルートノード（親を持たないノード）が存在する</li>
                <li>サイクル（循環参照）が存在しない</li>
            </ul>
        </div>
    </div>
</body>
</html>`;
}

function generateHTMLWithCollapse(nodes, connections) {
    const html = `<html>
<head>
<style>
    .collapse-button { cursor: pointer; }
    .collapsed-node {
        box-shadow: 2px 2px 4px rgba(0,0,0,0.3),
                    4px 4px 8px rgba(0,0,0,0.2);
    }
</style>
</head>
<body>
</body>
</html>`;
    return html;
}

module.exports = {
    generateHTML,
    generateErrorHTML,
    generateHTMLWithCollapse
};