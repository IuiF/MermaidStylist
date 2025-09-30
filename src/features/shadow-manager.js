function getShadowManager() {
    return `
        const shadowManager = {
            add: function(nodeElement) {
                const nodeId = nodeElement.getAttribute('id');
                const svgLayer = document.getElementById('svgLayer');

                this.remove(nodeElement);

                const rect = nodeElement.querySelector('.node-rect');
                if (!rect) return;

                const pos = svgHelpers.parseTransform(nodeElement.getAttribute('transform'));

                const shadowGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                shadowGroup.setAttribute('class', 'shadow-group');
                shadowGroup.setAttribute('data-shadow-for', nodeId);
                shadowGroup.setAttribute('transform', \`translate(\${pos.x + 5}, \${pos.y + 5})\`);

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
                svgLayer.insertBefore(shadowGroup, nodeElement);
            },

            remove: function(nodeElement) {
                const nodeId = nodeElement.getAttribute('id');
                const svgLayer = document.getElementById('svgLayer');
                const existingShadow = svgLayer.querySelector(\`[data-shadow-for="\${nodeId}"]\`);
                if (existingShadow) {
                    existingShadow.remove();
                }
            },

            updatePositions: function(collapsedNodeIds) {
                collapsedNodeIds.forEach(nodeId => {
                    const nodeElement = document.getElementById(nodeId);
                    if (nodeElement) {
                        const svgLayer = document.getElementById('svgLayer');
                        const shadowElement = svgLayer.querySelector(\`[data-shadow-for="\${nodeId}"]\`);
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