const { getBaseTemplate } = require('../templates/base');
const { getLayoutUtils } = require('../utils/layout-utils');
const { getTreeStructureAnalyzer } = require('../utils/tree-structure');
const { getSVGHelpers } = require('../utils/svg-helpers');
const { getVerticalLayout } = require('../layouts/vertical-layout');
const { getHorizontalLayout } = require('../layouts/horizontal-layout');
const { getConnectionRenderer } = require('../features/connection-renderer');
const { getShadowManager } = require('../features/shadow-manager');
const { getCollapseManager } = require('../features/collapse-manager');
const { getLayoutSwitcher } = require('../features/layout-switcher');
const { getViewportManager } = require('../features/viewport-manager');
const { getContextMenu } = require('../features/context-menu');
const { getHighlightManager } = require('../features/highlight-manager');
const { getPathHighlighter } = require('../features/path-highlighter');

function generateHTML(nodes, connections, styles = {}, classDefs = {}, dashedNodes = [], dashedEdges = []) {
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
    html += getJavaScriptContent(nodes, connections, styles, classDefs, dashedNodes, dashedEdges);
    html += template.htmlStructure.bodyClose + '\n';
    html += template.htmlStructure.htmlClose;

    return html;
}

function getJavaScriptContent(nodes, connections, styles = {}, classDefs = {}, dashedNodes = [], dashedEdges = []) {
    return `    <script>
        const nodes = ${JSON.stringify(nodes)};
        const connections = ${JSON.stringify(connections)};
        const styles = ${JSON.stringify(styles)};
        const classDefs = ${JSON.stringify(classDefs)};
        const dashedNodes = ${JSON.stringify(dashedNodes)};
        const dashedEdges = ${JSON.stringify(dashedEdges)};

        // 全ノードと全エッジ（点線含む）
        const allNodes = [...nodes, ...dashedNodes];
        const allConnections = [...connections, ...dashedEdges];

        // デバッグフラグ（ブラウザコンソールで window.DEBUG_CONNECTIONS = true で有効化）
        window.DEBUG_CONNECTIONS = false;

        // Import utilities
        ${getLayoutUtils()}
        ${getSVGHelpers()}

        // Import tree structure analyzer
        ${getTreeStructureAnalyzer()}

        // Import layouts
        ${getVerticalLayout()}
        ${getHorizontalLayout()}

        // Import connection renderer
        ${getConnectionRenderer()}

        // Import shadow manager
        ${getShadowManager()}

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

        // スタイルを適用
        function applyNodeStyle(element, nodeId, nodeClasses) {
            const styleObj = {};

            // クラスからスタイルを適用
            if (nodeClasses && nodeClasses.length > 0) {
                nodeClasses.forEach(className => {
                    if (classDefs[className]) {
                        Object.assign(styleObj, classDefs[className]);
                    }
                });
            }

            // 直接スタイルを適用（優先度が高い）
            if (styles[nodeId]) {
                Object.assign(styleObj, styles[nodeId]);
            }

            // SVG要素にスタイルを適用
            if (Object.keys(styleObj).length > 0) {
                for (const [key, value] of Object.entries(styleObj)) {
                    element.style[key] = value;
                }
            }
        }

        // Create SVG nodes
        function createSVGNodes() {
            const svgLayer = svgHelpers.getSVGLayer();

            // 通常のノードを作成
            nodes.forEach(node => {
                createSingleNode(node, false);
            });

            // 点線ノードを作成
            dashedNodes.forEach(node => {
                createSingleNode(node, true);
            });

            function createSingleNode(node, isDashed) {
                const hasChildren = connections.some(conn => conn.from === node.id);

                // グループ要素を作成
                const g = svgHelpers.createGroup({
                    id: node.id,
                    class: isDashed ? 'node dashed-node' : 'node',
                    'data-label': node.label,
                    'data-has-children': hasChildren,
                    'data-is-dashed': isDashed
                });

                // 一時的なテキスト要素でテキスト幅を測定
                const tempText = svgHelpers.createText(node.label, {
                    'font-size': '12',
                    'font-family': 'Arial, sans-serif'
                });
                svgLayer.appendChild(tempText);
                const textWidth = tempText.getBBox().width;
                svgLayer.removeChild(tempText);

                const padding = 12;
                const buttonWidth = hasChildren ? 15 : 0;
                const boxWidth = textWidth + padding * 2 + buttonWidth;
                const boxHeight = 28;

                // 背景矩形
                const rect = svgHelpers.createRect({
                    class: isDashed ? 'node-rect dashed-rect' : 'node-rect',
                    width: boxWidth,
                    height: boxHeight,
                    rx: 5,
                    ry: 5
                });

                // 点線ノードの場合はスタイルを追加
                if (isDashed) {
                    rect.style.strokeDasharray = '5,5';
                    rect.style.opacity = '0.6';
                }

                // テキスト
                const text = svgHelpers.createText(node.label, {
                    class: 'node-text',
                    x: padding,
                    y: boxHeight / 2,
                    'dominant-baseline': 'central'
                });

                if (isDashed) {
                    text.style.opacity = '0.6';
                }

                g.appendChild(rect);
                g.appendChild(text);

                // スタイルを適用
                applyNodeStyle(rect, isDashed ? node.originalId : node.id, node.classes);

                // 折りたたみボタン（点線ノードには折りたたみボタンを付けない）
                if (hasChildren && !isDashed) {
                    const button = svgHelpers.createText('▼', {
                        class: 'collapse-button',
                        x: boxWidth - padding - 5,
                        y: boxHeight / 2,
                        'dominant-baseline': 'central'
                    });
                    g.appendChild(button);
                }

                // データ属性を保存
                g.setAttribute('data-width', boxWidth);
                g.setAttribute('data-height', boxHeight);

                // 初期位置を(0,0)に設定
                g.setAttribute('transform', 'translate(0,0)');

                // イベントリスナーを追加
                if (isDashed) {
                    // 点線ノードの場合：元ノードを強調表示
                    g.addEventListener('click', function(e) {
                        e.stopPropagation();
                        highlightManager.highlightOriginalNode(node.originalId);
                    });
                    g.style.cursor = 'pointer';
                } else if (hasChildren) {
                    // 通常ノードで子を持つ場合：折りたたみ
                    g.addEventListener('click', function() {
                        toggleNodeCollapse(node.id);
                    });
                }

                svgLayer.appendChild(g);
            }
        }

        window.onload = function() {
            createSVGNodes();
            collapseManager.init();
            viewportManager.init();
            contextMenu.init();

            // SVGノードが配置された後に即座にレイアウト
            requestAnimationFrame(() => {
                currentNodePositions = horizontalLayout(allNodes, allConnections, calculateAllNodeWidths,
                    (n, c) => analyzeTreeStructure(n, c, dashedNodes));
                debugActualWidths(nodes);
                createCSSLines(allConnections, currentNodePositions);

                // レイアウトとエッジ描画完了後、コンテンツ全体が見えるように初期位置を調整
                requestAnimationFrame(() => {
                    viewportManager.fitToContent();
                });
            });
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
        <h1>⚠ グラフ構造が不正なため描画できません</h1>
        <div class="error-message">
            <strong>検出されたエラー:</strong>
            <ul>
${errorList}
            </ul>
        </div>
        <div class="info">
            <p>このツールはDAG（有向非巡環グラフ）構造のMermaid図をサポートしています。</p>
            <p>サポートされる構造の条件:</p>
            <ul>
                <li>ルートノード（親を持たないノード）が存在する</li>
                <li>サイクル（循環参照）が存在しない</li>
                <li>複数の親を持つノードは許容されます</li>
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