function getShadowManager() {
    return `
        const shadowManager = {
            add: function(nodeElement) {
                const nodeId = nodeElement.getAttribute('id');
                const edgeLayer = svgHelpers.getEdgeLayer();

                this.remove(nodeElement);

                const rect = nodeElement.querySelector('.node-rect');
                if (!rect) return;

                const pos = svgHelpers.parseTransform(nodeElement.getAttribute('transform'));

                const shadowGroup = svgHelpers.createGroup({
                    class: 'shadow-group',
                    'data-shadow-for': nodeId,
                    transform: \`translate(\${pos.x + 5}, \${pos.y + 5})\`
                });

                const shadowRect = svgHelpers.createRect({
                    class: 'shadow-rect',
                    x: rect.getAttribute('x'),
                    y: rect.getAttribute('y'),
                    width: rect.getAttribute('width'),
                    height: rect.getAttribute('height'),
                    rx: rect.getAttribute('rx'),
                    ry: rect.getAttribute('ry'),
                    fill: '#d0d0d0',
                    stroke: '#333',
                    'stroke-width': '2'
                });

                shadowGroup.appendChild(shadowRect);
                edgeLayer.appendChild(shadowGroup);
            },

            remove: function(nodeElement) {
                const nodeId = nodeElement.getAttribute('id');
                const edgeLayer = svgHelpers.getEdgeLayer();
                const existingShadow = edgeLayer.querySelector(\`[data-shadow-for="\${nodeId}"]\`);
                if (existingShadow) {
                    existingShadow.remove();
                }
            },

            updatePositions: function(collapsedNodeIds) {
                collapsedNodeIds.forEach(nodeId => {
                    const nodeElement = svgHelpers.getNodeElement(nodeId);
                    if (nodeElement) {
                        const edgeLayer = svgHelpers.getEdgeLayer();
                        const shadowElement = edgeLayer.querySelector(\`[data-shadow-for="\${nodeId}"]\`);
                        if (shadowElement) {
                            const pos = svgHelpers.parseTransform(nodeElement.getAttribute('transform'));
                            shadowElement.setAttribute('transform', \`translate(\${pos.x + 5}, \${pos.y + 5})\`);
                        }
                    }
                });
            }
        };
    `;
}

module.exports = {
    getShadowManager
};