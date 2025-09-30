function getCollapseManager() {
    return `
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

            addShadowRect: function(nodeElement) {
                const nodeId = nodeElement.getAttribute('id');
                const svgLayer = document.getElementById('svgLayer');

                // 既存の影要素を削除
                this.removeShadowRect(nodeElement);

                // 元のrect要素を取得
                const rect = nodeElement.querySelector('.node-rect');
                if (!rect) return;

                // ノードの現在位置を取得（transform属性から）
                const transform = nodeElement.getAttribute('transform');
                let nodeX = 0, nodeY = 0;
                if (transform) {
                    const match = transform.match(/translate\\(([^,\\s]+)\\s*,\\s*([^)]+)\\)/);
                    if (match) {
                        nodeX = parseFloat(match[1]);
                        nodeY = parseFloat(match[2]);
                    }
                }

                // 影用のg要素を作成
                const shadowGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                shadowGroup.setAttribute('class', 'shadow-group');
                shadowGroup.setAttribute('data-shadow-for', nodeId);
                shadowGroup.setAttribute('transform', \`translate(\${nodeX + 5}, \${nodeY + 5})\`);

                // 影用のrect要素を作成
                const shadowRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                shadowRect.setAttribute('class', 'shadow-rect');
                shadowRect.setAttribute('x', rect.getAttribute('x'));
                shadowRect.setAttribute('y', rect.getAttribute('y'));
                shadowRect.setAttribute('width', rect.getAttribute('width'));
                shadowRect.setAttribute('height', rect.getAttribute('height'));
                shadowRect.setAttribute('rx', rect.getAttribute('rx'));
                shadowRect.setAttribute('ry', rect.getAttribute('ry'));
                shadowRect.setAttribute('fill', '#d0d0d0');
                shadowRect.setAttribute('stroke', '#333');
                shadowRect.setAttribute('stroke-width', '2');

                shadowGroup.appendChild(shadowRect);

                // 元のノードの前に挿入（z-orderで後ろに配置）
                svgLayer.insertBefore(shadowGroup, nodeElement);
            },

            removeShadowRect: function(nodeElement) {
                const nodeId = nodeElement.getAttribute('id');
                const svgLayer = document.getElementById('svgLayer');
                const existingShadow = svgLayer.querySelector(\`[data-shadow-for="\${nodeId}"]\`);
                if (existingShadow) {
                    existingShadow.remove();
                }
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
                    const collapseButton = Array.from(nodeElement.children).find(el => el.classList && el.classList.contains('collapse-button'));

                    if (this.collapsedNodes.has(nodeId)) {
                        this.collapsedNodes.delete(nodeId);
                        nodeElement.classList.remove('collapsed-node');
                        this.removeShadowRect(nodeElement);
                        if (collapseButton) collapseButton.textContent = '▼';
                    } else {
                        this.collapsedNodes.add(nodeId);
                        nodeElement.classList.add('collapsed-node');
                        this.addShadowRect(nodeElement);
                        if (collapseButton) collapseButton.textContent = '▲';
                    }

                    this.updateVisibility();

                    // レイアウトを再計算
                    setTimeout(() => {
                        if (currentLayout === 'vertical') {
                            currentNodePositions = verticalLayout(nodes, connections, calculateAllNodeWidths, analyzeTreeStructure);
                        } else {
                            currentNodePositions = horizontalLayout(nodes, connections, calculateAllNodeWidths, analyzeTreeStructure);
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
                const svgLayer = document.getElementById('svgLayer');
                nodes.forEach(node => {
                    const element = document.getElementById(node.id);
                    if (element) {
                        if (this.isVisible(node.id)) {
                            element.classList.remove('hidden');
                        } else {
                            element.classList.add('hidden');
                        }
                    }

                    // 影要素も同様に表示/非表示を管理
                    if (svgLayer) {
                        const shadowElement = svgLayer.querySelector(\`[data-shadow-for="\${node.id}"]\`);
                        if (shadowElement) {
                            if (this.isVisible(node.id)) {
                                shadowElement.classList.remove('hidden');
                            } else {
                                shadowElement.classList.add('hidden');
                            }
                        }
                    }
                });
            },

            collapseAll: function() {
                nodes.forEach(node => {
                    if (this.canCollapse(node.id) && !this.isCollapsed(node.id)) {
                        const nodeElement = document.getElementById(node.id);
                        const collapseButton = Array.from(nodeElement.children).find(el => el.classList && el.classList.contains('collapse-button'));

                        this.collapsedNodes.add(node.id);
                        nodeElement.classList.add('collapsed-node');
                        this.addShadowRect(nodeElement);
                        if (collapseButton) collapseButton.textContent = '▲';
                    }
                });

                this.updateVisibility();

                setTimeout(() => {
                    if (currentLayout === 'vertical') {
                        currentNodePositions = verticalLayout(nodes, connections, calculateAllNodeWidths, analyzeTreeStructure);
                    } else {
                        currentNodePositions = horizontalLayout(nodes, connections, calculateAllNodeWidths, analyzeTreeStructure);
                    }
                    createCSSLines(connections, currentNodePositions);
                }, 50);
            },

            expandAll: function() {
                nodes.forEach(node => {
                    if (this.isCollapsed(node.id)) {
                        const nodeElement = document.getElementById(node.id);
                        const collapseButton = Array.from(nodeElement.children).find(el => el.classList && el.classList.contains('collapse-button'));

                        this.collapsedNodes.delete(node.id);
                        nodeElement.classList.remove('collapsed-node');
                        this.removeShadowRect(nodeElement);
                        if (collapseButton) collapseButton.textContent = '▼';
                    }
                });

                this.updateVisibility();

                setTimeout(() => {
                    if (currentLayout === 'vertical') {
                        currentNodePositions = verticalLayout(nodes, connections, calculateAllNodeWidths, analyzeTreeStructure);
                    } else {
                        currentNodePositions = horizontalLayout(nodes, connections, calculateAllNodeWidths, analyzeTreeStructure);
                    }
                    createCSSLines(connections, currentNodePositions);
                }, 50);
            },

            collapseAllByLabel: function(label) {
                nodes.forEach(node => {
                    if (node.label === label && this.canCollapse(node.id) && !this.isCollapsed(node.id)) {
                        const nodeElement = document.getElementById(node.id);
                        const collapseButton = Array.from(nodeElement.children).find(el => el.classList && el.classList.contains('collapse-button'));

                        this.collapsedNodes.add(node.id);
                        nodeElement.classList.add('collapsed-node');
                        this.addShadowRect(nodeElement);
                        if (collapseButton) collapseButton.textContent = '▲';
                    }
                });

                this.updateVisibility();

                setTimeout(() => {
                    if (currentLayout === 'vertical') {
                        currentNodePositions = verticalLayout(nodes, connections, calculateAllNodeWidths, analyzeTreeStructure);
                    } else {
                        currentNodePositions = horizontalLayout(nodes, connections, calculateAllNodeWidths, analyzeTreeStructure);
                    }
                    createCSSLines(connections, currentNodePositions);
                }, 50);
            },

            expandAllByLabel: function(label) {
                nodes.forEach(node => {
                    if (node.label === label && this.isCollapsed(node.id)) {
                        const nodeElement = document.getElementById(node.id);
                        const collapseButton = Array.from(nodeElement.children).find(el => el.classList && el.classList.contains('collapse-button'));

                        this.collapsedNodes.delete(node.id);
                        nodeElement.classList.remove('collapsed-node');
                        this.removeShadowRect(nodeElement);
                        if (collapseButton) collapseButton.textContent = '▼';
                    }
                });

                this.updateVisibility();

                setTimeout(() => {
                    if (currentLayout === 'vertical') {
                        currentNodePositions = verticalLayout(nodes, connections, calculateAllNodeWidths, analyzeTreeStructure);
                    } else {
                        currentNodePositions = horizontalLayout(nodes, connections, calculateAllNodeWidths, analyzeTreeStructure);
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
    `;
}

module.exports = {
    getCollapseManager
};