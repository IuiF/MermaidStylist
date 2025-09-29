const { getBaseTemplate } = require('../templates/base');

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
    html += '    ' + template.htmlStructure.containerOpen + '\n';

    for (const node of nodes) {
        html += `        <div class="node" id="${node.id}" data-label="${node.label}">${node.label}</div>\n`;
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

        // Import layout utilities
        ${getLayoutUtilsCode()}

        // Import hierarchical layout
        ${getHierarchicalLayoutCode()}

        window.onload = function() {
            const nodePositions = hierarchicalLayout(nodes, connections, calculateAllNodeWidths);

            // コンテナの高さを動的に設定
            const treeStructure = analyzeTreeStructure(nodes, connections);
            const container = document.getElementById('treeContainer');
            const requiredHeight = Math.max(800, treeStructure.levels.length * 80 + 100);

            container.style.height = requiredHeight + 'px';

            // デバッグ：実際の要素幅と計算値を比較
            setTimeout(() => {
                debugActualWidths(nodes);
                createCSSLines(connections, nodePositions);
            }, 200);
        };
    </script>`;
}

function getLayoutUtilsCode() {
    return `
        function measureTextWidth(text, font) {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            context.font = font;
            return context.measureText(text).width;
        }

        function calculateAllNodeWidths(nodes) {
            const padding = 24;
            const nodeWidthMap = new Map();
            const font = '12px Arial, sans-serif';

            nodes.forEach(node => {
                if (!nodeWidthMap.has(node.label)) {
                    const textWidth = measureTextWidth(node.label, font);
                    const calculatedWidth = Math.ceil(textWidth) + padding;
                    nodeWidthMap.set(node.label, calculatedWidth);

                    if (node.label.length > 8) {
                        console.log("Debug: label=" + node.label + ", measured width=" + Math.ceil(textWidth) + "px, total width=" + calculatedWidth + "px");
                    }
                }
            });

            return nodeWidthMap;
        }

        function debugActualWidths(nodes) {
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
    `;
}

function getHierarchicalLayoutCode() {
    return `
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

                while (currentLevel.length > 0 && maxDepth < 50) {
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

            const nodeWidthMap = calculateAllNodeWidths(nodes);
            const treeStructure = analyzeTreeStructure(nodes, connections);
            const nodePositions = new Map();

            const levelHeight = 80;
            const leftMargin = 50;
            const fixedSpacing = 60;

            treeStructure.levels.forEach((level, levelIndex) => {
                const y = 50 + levelIndex * levelHeight;

                if (levelIndex === 0) {
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
                    let levelMaxX = leftMargin;

                    level.forEach(node => {
                        const element = document.getElementById(node.id);
                        if (element) {
                            const parentId = connections.find(conn => conn.to === node.id)?.from;
                            if (parentId && nodePositions.has(parentId)) {
                                const parentPos = nodePositions.get(parentId);
                                const siblings = connections.filter(conn => conn.from === parentId).map(conn => conn.to);
                                const siblingIndex = siblings.indexOf(node.id);

                                let startX = parentPos.x + parentPos.width + fixedSpacing;

                                for (let i = 0; i < siblingIndex; i++) {
                                    const siblingId = siblings[i];
                                    if (nodePositions.has(siblingId)) {
                                        const siblingPos = nodePositions.get(siblingId);
                                        startX = Math.max(startX, siblingPos.x + siblingPos.width + fixedSpacing);
                                    }
                                }

                                startX = Math.max(startX, levelMaxX);

                                element.style.left = startX + 'px';
                                element.style.top = y + 'px';
                                nodePositions.set(node.id, { x: startX, y: y, width: nodeWidthMap.get(node.label) });

                                levelMaxX = Math.max(levelMaxX, startX + nodeWidthMap.get(node.label) + fixedSpacing);
                            } else {
                                element.style.left = levelMaxX + 'px';
                                element.style.top = y + 'px';
                                nodePositions.set(node.id, { x: levelMaxX, y: y, width: nodeWidthMap.get(node.label) });
                                levelMaxX += nodeWidthMap.get(node.label) + fixedSpacing;
                            }
                        }
                    });
                }
            });

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

                    const x1 = fromRect.left + fromRect.width;
                    const y1 = fromRect.top + fromRect.height / 2;
                    const x2 = toRect.left;
                    const y2 = toRect.top + toRect.height / 2;

                    const dx = x2 - x1;
                    const dy = y2 - y1;
                    const length = Math.sqrt(dx * dx + dy * dy);
                    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

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
    `;
}

module.exports = {
    generateHTML
};