function getBaseTemplate() {
    return {
        css: `        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            overflow: hidden;
            touch-action: none;
        }
        .tree-container {
            position: fixed;
            top: 60px;
            left: 0;
            right: 0;
            bottom: 0;
            overflow: hidden;
            background: #fafafa;
            cursor: grab;
            touch-action: none;
            overscroll-behavior: none;
        }
        .tree-container:active {
            cursor: grabbing;
        }
        #contentWrapper {
            position: absolute;
            top: 0;
            left: 0;
            transform-origin: 0 0;
            transform: translateZ(0);
            will-change: transform;
            backface-visibility: hidden;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
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
            backface-visibility: hidden;
            text-rendering: optimizeLegibility;
        }
        .connection-line {
            position: absolute;
            background-color: #666;
            transform-origin: left center;
            height: 2px;
            z-index: 1;
            backface-visibility: hidden;
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
        .connection-label {
            position: absolute;
            background: #fff;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
            color: #333;
            border: 1px solid #999;
            white-space: nowrap;
            z-index: 3;
            pointer-events: none;
            backface-visibility: hidden;
            text-rendering: optimizeLegibility;
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
        .highlighted {
            background: #fff3cd !important;
            border-color: #ffc107 !important;
            box-shadow: 0 0 8px rgba(255, 193, 7, 0.5);
        }
        .highlighted.collapsed-node {
            box-shadow:
                5px 5px 0 0 #d0d0d0,
                5px 5px 0 2px #ffc107,
                2px 2px 4px rgba(0,0,0,0.3),
                0 0 8px rgba(255, 193, 7, 0.5) !important;
        }
        .path-highlighted {
            background: #e3f2fd !important;
            border-color: #2196f3 !important;
            box-shadow: 0 0 8px rgba(33, 150, 243, 0.5);
        }
        .path-highlighted.collapsed-node {
            box-shadow:
                5px 5px 0 0 #d0d0d0,
                5px 5px 0 2px #2196f3,
                2px 2px 4px rgba(0,0,0,0.3),
                0 0 8px rgba(33, 150, 243, 0.5) !important;
        }
        .highlighted.path-highlighted {
            background: #e3f2fd !important;
            border-color: #2196f3 !important;
            box-shadow: 0 0 8px rgba(33, 150, 243, 0.5);
            outline: 3px solid #ffc107;
            outline-offset: 2px;
        }
        .highlighted.path-highlighted.collapsed-node {
            box-shadow:
                5px 5px 0 0 #d0d0d0,
                5px 5px 0 2px #ffc107,
                2px 2px 4px rgba(0,0,0,0.3),
                0 0 8px rgba(33, 150, 243, 0.5) !important;
            outline: 3px solid #ffc107;
            outline-offset: 2px;
        }
        .path-highlighted-line {
            background-color: #2196f3 !important;
        }
        .path-highlighted-line::after {
            border-left-color: #2196f3 !important;
        }
        .highlighted-line {
            background-color: #ffc107 !important;
        }
        .highlighted-line::after {
            border-left-color: #ffc107 !important;
        }
        .path-highlighted-line.highlighted-line {
            background-color: #2196f3 !important;
            box-shadow: 0 -3px 0 0 #ffc107, 0 3px 0 0 #ffc107;
        }
        .path-highlighted-line.highlighted-line::after {
            border-left-color: #2196f3 !important;
            filter: drop-shadow(0 -3px 0 #ffc107) drop-shadow(0 3px 0 #ffc107);
        }
        .layout-controls {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #fff;
            padding: 10px;
            border-bottom: 1px solid #ddd;
            z-index: 1000;
            display: flex;
            align-items: flex-start;
            gap: 16px;
        }
        .button-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .layout-button {
            padding: 6px 12px;
            border: 1px solid #666;
            background: #f0f0f0;
            cursor: pointer;
            border-radius: 3px;
            font-size: 12px;
            min-width: 120px;
            text-align: center;
        }
        .layout-button:hover {
            background: #e0e0e0;
        }
        .layout-button.active {
            background: #333;
            color: #fff;
        }
        .viewport-info {
            margin-left: auto;
            font-size: 11px;
            color: #666;
            align-self: center;
        }
        .context-menu {
            position: fixed;
            background: #fff;
            border: 1px solid #999;
            border-radius: 3px;
            box-shadow: 2px 2px 8px rgba(0,0,0,0.2);
            padding: 4px 0;
            z-index: 10000;
            display: none;
        }
        .context-menu.visible {
            display: block;
        }
        .context-menu-item {
            padding: 8px 16px;
            cursor: pointer;
            font-size: 12px;
            white-space: nowrap;
        }
        .context-menu-item:hover {
            background: #f0f0f0;
        }`,

        htmlStructure: {
            doctype: '<!DOCTYPE html>',
            htmlOpen: '<html>',
            headOpen: '<head>',
            title: '<title>Mermaid Tree</title>',
            headClose: '</head>',
            bodyOpen: '<body>',
            pageTitle: '<h1>Tree Structure</h1>',
            layoutControls: '<div class="layout-controls"><div class="button-group"><button class="layout-button active" id="horizontalBtn" onclick="switchLayout(\'horizontal\')">横方向</button><button class="layout-button" id="verticalBtn" onclick="switchLayout(\'vertical\')">縦方向</button></div><div class="button-group"><button class="layout-button" onclick="collapseAll()">すべて折りたたむ</button><button class="layout-button" onclick="expandAll()">すべて展開</button></div><button class="layout-button" onclick="viewportManager.resetView()">位置リセット</button><span class="viewport-info">ドラッグで移動 | ホイールで拡大縮小</span></div>',
            containerOpen: '<div class="tree-container" id="treeContainer"><div id="contentWrapper">',
            containerClose: '</div></div>',
            bodyClose: '</body>',
            htmlClose: '</html>'
        }
    };
}

module.exports = {
    getBaseTemplate
};
