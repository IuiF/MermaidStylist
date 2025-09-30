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

        // Import layout utilities
        ${getLayoutUtilsCode()}

        // Import hierarchical layout
        ${getHierarchicalLayoutCode()}

        // Collapse functionality
        const collapseManager = {
            collapsedNodes: new Set(),
            childrenMap: new Map(),

            init: function() {
                connections.forEach(conn => {
                    if (!this.childrenMap.has(conn.from)) {
                        this.childrenMap.set(conn.from, []);
                    }
                    this.childrenMap.get(conn.from).push(conn.to);
                });
            },

            isCollapsed: function(nodeId) {
                return this.collapsedNodes.has(nodeId);
            },

            canCollapse: function(nodeId) {
                return this.childrenMap.has(nodeId) && this.childrenMap.get(nodeId).length > 0;
            },

            toggleCollapse: function(nodeId) {
                if (this.canCollapse(nodeId)) {
                    const nodeElement = document.getElementById(nodeId);
                    const collapseButton = nodeElement.querySelector('.collapse-button');

                    if (this.collapsedNodes.has(nodeId)) {
                        this.collapsedNodes.delete(nodeId);
                        nodeElement.classList.remove('collapsed-node');
                        if (collapseButton) collapseButton.textContent = '▼';
                    } else {
                        this.collapsedNodes.add(nodeId);
                        nodeElement.classList.add('collapsed-node');
                        if (collapseButton) collapseButton.textContent = '▲';
                    }

                    this.updateVisibility();

                    // レイアウトを再計算
                    setTimeout(() => {
                        if (currentLayout === 'vertical') {
                            currentNodePositions = verticalLayout(nodes, connections, calculateAllNodeWidths);
                        } else {
                            currentNodePositions = horizontalLayout(nodes, connections, calculateAllNodeWidths);
                        }
                        createCSSLines(connections, currentNodePositions);
                    }, 50);
                }
            },

            isVisible: function(nodeId) {
                const isRoot = !connections.some(conn => conn.to === nodeId);
                if (isRoot) return true;

                const parentConnection = connections.find(conn => conn.to === nodeId);
                if (!parentConnection) return true;

                if (this.isCollapsed(parentConnection.from)) return false;

                return this.isVisible(parentConnection.from);
            },

            updateVisibility: function() {
                nodes.forEach(node => {
                    const element = document.getElementById(node.id);
                    if (element) {
                        if (this.isVisible(node.id)) {
                            element.classList.remove('hidden');
                        } else {
                            element.classList.add('hidden');
                        }
                    }
                });
            },

            collapseAll: function() {
                nodes.forEach(node => {
                    if (this.canCollapse(node.id) && !this.isCollapsed(node.id)) {
                        const nodeElement = document.getElementById(node.id);
                        const collapseButton = nodeElement.querySelector('.collapse-button');

                        this.collapsedNodes.add(node.id);
                        nodeElement.classList.add('collapsed-node');
                        if (collapseButton) collapseButton.textContent = '▲';
                    }
                });

                this.updateVisibility();

                setTimeout(() => {
                    if (currentLayout === 'vertical') {
                        currentNodePositions = verticalLayout(nodes, connections, calculateAllNodeWidths);
                    } else {
                        currentNodePositions = horizontalLayout(nodes, connections, calculateAllNodeWidths);
                    }
                    createCSSLines(connections, currentNodePositions);
                }, 50);
            },

            expandAll: function() {
                nodes.forEach(node => {
                    if (this.isCollapsed(node.id)) {
                        const nodeElement = document.getElementById(node.id);
                        const collapseButton = nodeElement.querySelector('.collapse-button');

                        this.collapsedNodes.delete(node.id);
                        nodeElement.classList.remove('collapsed-node');
                        if (collapseButton) collapseButton.textContent = '▼';
                    }
                });

                this.updateVisibility();

                setTimeout(() => {
                    if (currentLayout === 'vertical') {
                        currentNodePositions = verticalLayout(nodes, connections, calculateAllNodeWidths);
                    } else {
                        currentNodePositions = horizontalLayout(nodes, connections, calculateAllNodeWidths);
                    }
                    createCSSLines(connections, currentNodePositions);
                }, 50);
            }
        };

        function toggleNodeCollapse(nodeId) {
            collapseManager.toggleCollapse(nodeId);
        }

        function collapseAll() {
            collapseManager.collapseAll();
        }

        function expandAll() {
            collapseManager.expandAll();
        }

        // Layout state
        let currentLayout = 'vertical';
        let currentNodePositions = null;

        function switchLayout(layoutType) {
            currentLayout = layoutType;

            // Update button states
            document.getElementById('verticalBtn').classList.toggle('active', layoutType === 'vertical');
            document.getElementById('horizontalBtn').classList.toggle('active', layoutType === 'horizontal');

            // Apply layout
            if (layoutType === 'vertical') {
                currentNodePositions = verticalLayout(nodes, connections, calculateAllNodeWidths);
            } else {
                currentNodePositions = horizontalLayout(nodes, connections, calculateAllNodeWidths);
            }

            // Redraw lines
            setTimeout(() => {
                createCSSLines(connections, currentNodePositions);
            }, 50);
        }

        window.onload = function() {
            collapseManager.init();

            // Apply initial layout
            currentNodePositions = verticalLayout(nodes, connections, calculateAllNodeWidths);

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

        function verticalLayout(nodes, connections, calculateAllNodeWidths) {
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
                        if (element && !element.classList.contains('hidden')) {
                            const nodeWidth = nodeWidthMap.get(node.label);
                            element.style.left = currentX + 'px';
                            element.style.top = y + 'px';
                            element.style.width = nodeWidth + 'px';
                            nodePositions.set(node.id, { x: currentX, y: y, width: nodeWidth });
                            currentX += nodeWidth + fixedSpacing;
                        }
                    });
                } else {
                    let levelMaxX = leftMargin;

                    level.forEach(node => {
                        const element = document.getElementById(node.id);
                        if (element && !element.classList.contains('hidden')) {
                            const nodeWidth = nodeWidthMap.get(node.label);
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
                                element.style.width = nodeWidth + 'px';
                                nodePositions.set(node.id, { x: startX, y: y, width: nodeWidth });

                                levelMaxX = Math.max(levelMaxX, startX + nodeWidth + fixedSpacing);
                            } else {
                                element.style.left = levelMaxX + 'px';
                                element.style.top = y + 'px';
                                element.style.width = nodeWidth + 'px';
                                nodePositions.set(node.id, { x: levelMaxX, y: y, width: nodeWidth });
                                levelMaxX += nodeWidth + fixedSpacing;
                            }
                        }
                    });
                }
            });

            const maxX = Math.max(...Array.from(nodePositions.values()).map(pos => pos.x + pos.width));
            if (maxX + 100 > containerWidth) {
                containerWidth = maxX + 100;
                container.style.width = containerWidth + 'px';
                console.log("Container width expanded to: " + containerWidth + "px for vertical layout");
            }

            return nodePositions;
        }

        function horizontalLayout(nodes, connections, calculateAllNodeWidths) {
            const container = document.getElementById('treeContainer');
            let containerHeight = Math.max(800, container.clientHeight || 800);

            const nodeWidthMap = calculateAllNodeWidths(nodes);
            const treeStructure = analyzeTreeStructure(nodes, connections);
            const nodePositions = new Map();

            const leftMargin = 50;
            const topMargin = 50;
            const fixedSpacing = 60;
            const nodeHeight = 40;

            treeStructure.levels.forEach((level, levelIndex) => {
                if (levelIndex === 0) {
                    let currentY = topMargin;
                    level.forEach(node => {
                        const element = document.getElementById(node.id);
                        if (element && !element.classList.contains('hidden')) {
                            const nodeWidth = nodeWidthMap.get(node.label);
                            element.style.left = leftMargin + 'px';
                            element.style.top = currentY + 'px';
                            element.style.width = nodeWidth + 'px';
                            nodePositions.set(node.id, { x: leftMargin, y: currentY, width: nodeWidth, height: nodeHeight });
                            currentY += nodeHeight + fixedSpacing;
                        }
                    });
                } else {
                    let levelMaxY = topMargin;

                    level.forEach(node => {
                        const element = document.getElementById(node.id);
                        if (element && !element.classList.contains('hidden')) {
                            const nodeWidth = nodeWidthMap.get(node.label);
                            const parentId = connections.find(conn => conn.to === node.id)?.from;
                            if (parentId && nodePositions.has(parentId)) {
                                const parentPos = nodePositions.get(parentId);
                                const siblings = connections.filter(conn => conn.from === parentId).map(conn => conn.to);
                                const siblingIndex = siblings.indexOf(node.id);

                                // 親子間の距離を一定にする（横方向は倍のスペース）
                                const nodeX = parentPos.x + parentPos.width + fixedSpacing * 2;

                                let startY = parentPos.y;

                                for (let i = 0; i < siblingIndex; i++) {
                                    const siblingId = siblings[i];
                                    if (nodePositions.has(siblingId)) {
                                        const siblingPos = nodePositions.get(siblingId);
                                        startY = Math.max(startY, siblingPos.y + siblingPos.height + fixedSpacing);
                                    }
                                }

                                startY = Math.max(startY, levelMaxY);

                                element.style.left = nodeX + 'px';
                                element.style.top = startY + 'px';
                                element.style.width = nodeWidth + 'px';
                                nodePositions.set(node.id, { x: nodeX, y: startY, width: nodeWidth, height: nodeHeight });

                                levelMaxY = Math.max(levelMaxY, startY + nodeHeight + fixedSpacing);
                            } else {
                                element.style.left = leftMargin + 'px';
                                element.style.top = levelMaxY + 'px';
                                element.style.width = nodeWidth + 'px';
                                nodePositions.set(node.id, { x: leftMargin, y: levelMaxY, width: nodeWidth, height: nodeHeight });
                                levelMaxY += nodeHeight + fixedSpacing;
                            }
                        }
                    });
                }
            });

            const maxY = Math.max(...Array.from(nodePositions.values()).map(pos => pos.y + pos.height));
            const maxX = Math.max(...Array.from(nodePositions.values()).map(pos => pos.x + pos.width));

            if (maxY + 100 > containerHeight) {
                containerHeight = maxY + 100;
                container.style.height = containerHeight + 'px';
                console.log("Container height expanded to: " + containerHeight + "px for horizontal layout");
            }

            let containerWidth = Math.max(800, container.clientWidth || 800);
            if (maxX + 100 > containerWidth) {
                containerWidth = maxX + 100;
                container.style.width = containerWidth + 'px';
                console.log("Container width expanded to: " + containerWidth + "px for horizontal layout");
            }

            return nodePositions;
        }

        function createCSSLines(connections, nodePositions) {
            const container = document.getElementById('treeContainer');
            if (!container) {
                console.error('Container element not found');
                return;
            }

            const existingLines = container.querySelectorAll('.connection-line, .connection-label');
            existingLines.forEach(line => line.remove());

            let connectionCount = 0;
            connections.forEach(conn => {
                const fromElement = document.getElementById(conn.from);
                const toElement = document.getElementById(conn.to);

                // 両端のノードが存在し、かつ表示されている場合のみ接続線を描画
                if (fromElement && toElement &&
                    !fromElement.classList.contains('hidden') &&
                    !toElement.classList.contains('hidden')) {
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

                    // ラベルがある場合は表示
                    if (conn.label) {
                        const labelElement = document.createElement('div');
                        labelElement.className = 'connection-label';
                        labelElement.textContent = conn.label;

                        // ラベルを子ノード（toElement）の左上に配置
                        labelElement.style.left = toRect.left + 'px';
                        labelElement.style.top = toRect.top + 'px';
                        labelElement.style.transform = 'translate(0, -100%)';

                        container.appendChild(labelElement);
                    }
                }
            });

            console.log("Created " + connectionCount + " CSS lines");
        }
    `;
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