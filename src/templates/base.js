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
            position: relative;
            box-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .collapsed-node::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: 2px solid #333;
            background: #e9e9e9;
            border-radius: 5px;
            z-index: -2;
            box-sizing: border-box;
            transform: translate(-2px, -2px);
            pointer-events: none;
        }
        .collapsed-node::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: 2px solid #333;
            background: #ddd;
            border-radius: 5px;
            z-index: -3;
            box-sizing: border-box;
            transform: translate(-4px, -4px);
            pointer-events: none;
        }
        .hidden {
            display: none;
        }`,

        htmlStructure: {
            doctype: '<!DOCTYPE html>',
            htmlOpen: '<html>',
            headOpen: '<head>',
            title: '<title>Mermaid Tree</title>',
            headClose: '</head>',
            bodyOpen: '<body>',
            pageTitle: '<h1>Tree Structure</h1>',
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