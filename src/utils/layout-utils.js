function getLayoutUtils() {
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
                const element = document.getElementById(node.id);
                if (element) {
                    // SVGノードの場合はdata-width属性から取得
                    const dataWidth = element.getAttribute('data-width');
                    if (dataWidth) {
                        nodeWidthMap.set(node.label, parseFloat(dataWidth));
                    } else {
                        // 従来のHTML要素の場合
                        const actualWidth = element.offsetWidth;
                        nodeWidthMap.set(node.label, actualWidth);
                    }
                } else if (!nodeWidthMap.has(node.label)) {
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
                    const dataWidth = element.getAttribute('data-width');
                    const actualWidth = dataWidth ? parseFloat(dataWidth) : element.offsetWidth;
                    const calculatedWidth = nodeWidthMap.get(node.label);
                    const difference = actualWidth - calculatedWidth;

                    console.log("Width comparison: " + node.label);
                    console.log("  Calculated: " + calculatedWidth + "px, Actual: " + actualWidth + "px, Difference: " + difference + "px");
                }
            });
        }

        function calculateConnectionLabelSpacing(connections, parentId) {
            const labelFont = '11px Arial, sans-serif';
            const minSpacing = 60;
            const labelPadding = 30;

            let maxLabelWidth = 0;

            connections.forEach(conn => {
                if (conn.from === parentId && conn.label) {
                    const labelWidth = measureTextWidth(conn.label, labelFont);
                    maxLabelWidth = Math.max(maxLabelWidth, labelWidth);
                }
            });

            if (maxLabelWidth > 0) {
                return Math.max(minSpacing, maxLabelWidth + labelPadding);
            }

            return minSpacing;
        }

        function setNodePosition(element, x, y) {
            if (element.tagName === 'g') {
                // SVGノードの場合
                element.setAttribute('transform', 'translate(' + x + ',' + y + ')');
            } else {
                // HTML要素の場合
                element.style.left = x + 'px';
                element.style.top = y + 'px';
            }
        }

        function getNodeDimensions(element) {
            if (element.tagName === 'g') {
                // SVGノードの場合
                const width = parseFloat(element.getAttribute('data-width')) || 0;
                const height = parseFloat(element.getAttribute('data-height')) || 0;
                return { width: width, height: height };
            } else {
                // HTML要素の場合
                return { width: element.offsetWidth, height: element.offsetHeight };
            }
        }

        function getNodePosition(element) {
            if (element.tagName === 'g') {
                // SVGノードの場合
                const transform = element.getAttribute('transform');
                const pos = svgHelpers.parseTransform(transform);
                return { left: pos.x, top: pos.y };
            } else {
                // HTML要素の場合
                return {
                    left: parseFloat(element.style.left) || 0,
                    top: parseFloat(element.style.top) || 0
                };
            }
        }
    `;
}

module.exports = {
    getLayoutUtils
};