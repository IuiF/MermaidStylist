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