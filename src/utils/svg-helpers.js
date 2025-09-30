function getSVGHelpers() {
    return `
        const svgHelpers = {
            parseTransform: function(transformAttr) {
                let x = 0, y = 0;
                if (transformAttr) {
                    const match = transformAttr.match(/translate\\(([^,\\s]+)\\s*,\\s*([^)]+)\\)/);
                    if (match) {
                        x = parseFloat(match[1]);
                        y = parseFloat(match[2]);
                    }
                }
                return { x, y };
            },

            addDoubleStroke: function(nodeElement) {
                const rect = nodeElement.querySelector('.node-rect');
                if (!rect) return;

                const existingOverlay = nodeElement.querySelector('.double-stroke-overlay');
                if (existingOverlay) {
                    existingOverlay.remove();
                }

                const overlayRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                overlayRect.setAttribute('class', 'double-stroke-overlay');
                overlayRect.setAttribute('x', rect.getAttribute('x'));
                overlayRect.setAttribute('y', rect.getAttribute('y'));
                overlayRect.setAttribute('width', rect.getAttribute('width'));
                overlayRect.setAttribute('height', rect.getAttribute('height'));
                overlayRect.setAttribute('rx', rect.getAttribute('rx'));
                overlayRect.setAttribute('ry', rect.getAttribute('ry'));
                overlayRect.setAttribute('fill', 'none');
                overlayRect.setAttribute('stroke', '#ffc107');
                overlayRect.setAttribute('stroke-width', '2');
                overlayRect.setAttribute('pointer-events', 'none');

                rect.parentNode.insertBefore(overlayRect, rect.nextSibling);
            },

            removeDoubleStroke: function(nodeElement) {
                const overlay = nodeElement.querySelector('.double-stroke-overlay');
                if (overlay) {
                    overlay.remove();
                }
            }
        };
    `;
}

module.exports = {
    getSVGHelpers
};