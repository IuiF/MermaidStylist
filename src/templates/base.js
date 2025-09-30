function getBaseTemplate() {
    return {
        css: `        body {
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
            z-index: 2;
            box-sizing: content-box;
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
        .collapse-button {
            cursor: pointer;
            font-size: 10px;
            margin-left: 5px;
            user-select: none;
        }
        .collapsed-node {
            box-shadow:
                5px 5px 0 0 #d0d0d0,
                5px 5px 0 2px #333,
                2px 2px 4px rgba(0,0,0,0.3);
            background: #f9f9f9 !important;
        }
        .hidden {
            display: none;
        }
        .layout-controls {
            margin-bottom: 10px;
        }
        .layout-button {
            padding: 6px 12px;
            margin-right: 8px;
            border: 1px solid #666;
            background: #f0f0f0;
            cursor: pointer;
            border-radius: 3px;
            font-size: 12px;
        }
        .layout-button:hover {
            background: #e0e0e0;
        }
        .layout-button.active {
            background: #333;
            color: #fff;
        }`,

        htmlStructure: {
            doctype: '<!DOCTYPE html>',
            htmlOpen: '<html>',
            headOpen: '<head>',
            title: '<title>Mermaid Tree</title>',
            headClose: '</head>',
            bodyOpen: '<body>',
            pageTitle: '<h1>Tree Structure</h1>',
            layoutControls: '<div class="layout-controls"><button class="layout-button active" id="verticalBtn" onclick="switchLayout(\'vertical\')">縦方向</button><button class="layout-button" id="horizontalBtn" onclick="switchLayout(\'horizontal\')">横方向</button><button class="layout-button" onclick="collapseAll()">すべて折りたたむ</button><button class="layout-button" onclick="expandAll()">すべて展開</button></div>',
            containerOpen: '<div class="tree-container" id="treeContainer">',
            containerClose: '</div>',
            bodyClose: '</body>',
            htmlClose: '</html>'
        }
    };
}

module.exports = {
    getBaseTemplate
};
