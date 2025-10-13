function getNodeDrawer() {
    return `
        const NODE_DRAWER_CONSTANTS = {
            PADDING: 12,
            COLLAPSE_BUTTON_WIDTH: 15,
            COLLAPSE_BUTTON_OFFSET: 5,
            BASE_HEIGHT: 28,
            BORDER_RADIUS: 5,
            FONT_SIZE: 12,
            FONT_FAMILY: 'Arial, sans-serif',
            DASHED_STROKE: '5,5',
            DASHED_OPACITY: '0.6'
        };

        /**
         * LayoutResultからノードを描画
         */
        function drawNodes(layoutResult) {
            const nodePositions = layoutResult.nodePositions;

            nodePositions.forEach((rect, nodeId) => {
                const element = document.getElementById(nodeId);
                if (!element) return;

                const x = rect.x;
                const y = rect.y;

                element.setAttribute('transform', 'translate(' + x + ',' + y + ')');
            });
        }

        /**
         * 単一ノードのSVG要素を作成
         */
        function createNodeElement(node, isDashed, hasChildren) {
            const g = svgHelpers.createGroup({
                id: node.id,
                class: isDashed ? 'node dashed-node' : 'node',
                'data-label': node.label,
                'data-has-children': hasChildren,
                'data-is-dashed': isDashed
            });

            const textSize = svgHelpers.measureRichText(node.label, NODE_DRAWER_CONSTANTS.FONT_SIZE);

            const padding = NODE_DRAWER_CONSTANTS.PADDING;
            const buttonWidth = hasChildren ? NODE_DRAWER_CONSTANTS.COLLAPSE_BUTTON_WIDTH : 0;
            const boxWidth = textSize.width + padding * 2 + buttonWidth;
            const baseHeight = NODE_DRAWER_CONSTANTS.BASE_HEIGHT;
            const boxHeight = Math.max(baseHeight, textSize.height + padding);

            const rect = svgHelpers.createRect({
                class: isDashed ? 'node-rect dashed-rect' : 'node-rect',
                width: boxWidth,
                height: boxHeight,
                rx: NODE_DRAWER_CONSTANTS.BORDER_RADIUS,
                ry: NODE_DRAWER_CONSTANTS.BORDER_RADIUS
            });

            if (isDashed) {
                rect.style.strokeDasharray = NODE_DRAWER_CONSTANTS.DASHED_STROKE;
                rect.style.opacity = NODE_DRAWER_CONSTANTS.DASHED_OPACITY;
            }

            const text = svgHelpers.createRichText(node.label, {
                class: 'node-text',
                x: padding,
                y: boxHeight / 2,
                'dominant-baseline': 'central',
                'font-size': NODE_DRAWER_CONSTANTS.FONT_SIZE.toString(),
                'font-family': NODE_DRAWER_CONSTANTS.FONT_FAMILY
            });

            if (isDashed) {
                text.style.opacity = NODE_DRAWER_CONSTANTS.DASHED_OPACITY;
            }

            g.appendChild(rect);
            g.appendChild(text);

            applyNodeStyle(rect, isDashed ? node.originalId : node.id, node.classes);

            if (hasChildren) {
                const button = svgHelpers.createText('▼', {
                    class: 'collapse-button',
                    x: boxWidth - padding - NODE_DRAWER_CONSTANTS.COLLAPSE_BUTTON_OFFSET,
                    y: boxHeight / 2,
                    'dominant-baseline': 'central'
                });
                g.appendChild(button);
            }

            g.setAttribute('data-width', boxWidth);
            g.setAttribute('data-height', boxHeight);
            g.setAttribute('transform', 'translate(0,0)');

            attachNodeEventListeners(g, node, isDashed, hasChildren);

            return g;
        }

        /**
         * ノードにイベントリスナーを追加
         */
        function attachNodeEventListeners(element, node, isDashed, hasChildren) {
            if (hasChildren) {
                element.addEventListener('click', function() {
                    const targetNodeId = isDashed ? node.originalId : node.id;
                    toggleNodeCollapse(targetNodeId);
                });
            } else if (isDashed) {
                element.addEventListener('click', function(e) {
                    e.stopPropagation();
                    highlightManager.highlightOriginalNode(node.originalId);
                });
                element.style.cursor = 'pointer';
            } else {
                element.addEventListener('click', function(e) {
                    e.stopPropagation();
                    highlightManager.highlightAllByLabel(node.label);
                });
                element.style.cursor = 'pointer';
            }
        }

        /**
         * すべてのノード要素を作成
         */
        function createAllNodes(nodes, dashedNodes, connections, allConnections) {
            const svgLayer = svgHelpers.getSVGLayer();

            nodes.forEach(node => {
                const hasChildren = allConnections.some(conn => conn.from === node.id);
                const nodeElement = createNodeElement(node, false, hasChildren);
                svgLayer.appendChild(nodeElement);
            });

            dashedNodes.forEach(node => {
                const hasChildren = allConnections.some(conn => conn.from === node.originalId);
                const nodeElement = createNodeElement(node, true, hasChildren);
                svgLayer.appendChild(nodeElement);
            });
        }
    `;
}

module.exports = {
    getNodeDrawer
};
