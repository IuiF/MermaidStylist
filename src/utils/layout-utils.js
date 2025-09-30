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
    `;
}

module.exports = {
    getLayoutUtils
};