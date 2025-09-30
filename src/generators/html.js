const { getBaseTemplate } = require('../templates/base');
const { getLayoutUtils } = require('../utils/layout-utils');
const { getTreeStructureAnalyzer } = require('../utils/tree-structure');
const { getVerticalLayout } = require('../layouts/vertical-layout');
const { getHorizontalLayout } = require('../layouts/horizontal-layout');
const { getConnectionRenderer } = require('../features/connection-renderer');
const { getCollapseManager } = require('../features/collapse-manager');
const { getLayoutSwitcher } = require('../features/layout-switcher');

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
    html += '    ' + template.htmlStructure.pageTitle + '\n';
    html += '    ' + template.htmlStructure.layoutControls + '\n';
    html += '    ' + template.htmlStructure.containerOpen + '\n';

    for (const node of nodes) {
        const hasChildren = connections.some(conn => conn.from === node.id);
        const collapseButton = hasChildren ? '<span class="collapse-button" onclick="toggleNodeCollapse(\'' + node.id + '\'); event.stopPropagation();">▼</span>' : '';
        const nodeOnClick = hasChildren ? ` onclick="toggleNodeCollapse('${node.id}')"` : '';
        html += `        <div class="node" id="${node.id}" data-label="${node.label}" data-has-children="${hasChildren}"${nodeOnClick}>${node.label}${collapseButton}</div>\n`;
    }

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

        window.onload = function() {
            collapseManager.init();

            // Apply initial layout
            currentNodePositions = verticalLayout(nodes, connections, calculateAllNodeWidths, analyzeTreeStructure);

            // コンテナの高さを動的に設定
            const treeStructure = analyzeTreeStructure(nodes, connections);
            const container = document.getElementById('treeContainer');
            const requiredHeight = Math.max(800, treeStructure.levels.length * 80 + 100);

            container.style.height = requiredHeight + 'px';

            // デバッグ：実際の要素幅と計算値を比較
            setTimeout(() => {
                debugActualWidths(nodes);
                createCSSLines(connections, currentNodePositions);
            }, 200);
        };
    </script>`;
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
    generateHTMLWithCollapse
};