function getLabelDrawer() {
    return `
        const LABEL_DRAWER_CONSTANTS = {
            PADDING: 4,
            VERTICAL_SPACING: 10,
            OFFSET_Y: 2,
            FONT_SIZE: 11,
            FONT_FAMILY: 'Arial, sans-serif',
            BORDER_RADIUS: 3,
            INFO_PANEL_TOP: '80px',
            INFO_PANEL_RIGHT: '20px',
            INFO_PANEL_PADDING: '15px',
            INFO_PANEL_BORDER_RADIUS: '8px',
            INFO_PANEL_MAX_WIDTH: '400px',
            INFO_PANEL_FONT_SIZE: '13px',
            INFO_PANEL_LINE_HEIGHT: '1.6'
        };

        let labelOffsets = {};

        /**
         * LayoutResultからラベルを描画
         */
        function drawLabels(layoutResult, connections) {
            const svgLayer = svgHelpers.getEdgeLayer();
            if (!svgLayer) {
                console.error('SVG layer element not found');
                return;
            }

            const existingLabels = svgLayer.querySelectorAll('.connection-label');
            existingLabels.forEach(label => label.remove());

            labelOffsets = {};

            connections.forEach(conn => {
                if (!conn.label) return;

                const toElement = svgHelpers.getNodeElement(conn.to);
                if (!toElement) return;
                if (toElement.classList.contains('hidden')) return;

                const labelGroup = createLabelElement(conn, toElement);
                if (labelGroup) {
                    svgLayer.appendChild(labelGroup);
                }
            });

            const labels = svgLayer.querySelectorAll('.connection-label');
            labels.forEach(label => svgLayer.appendChild(label));
        }

        /**
         * ラベル要素を作成
         */
        function createLabelElement(conn, toElement) {
            const svgLayer = svgHelpers.getEdgeLayer();
            const tempText = svgHelpers.createText(conn.label, {
                'font-size': LABEL_DRAWER_CONSTANTS.FONT_SIZE.toString(),
                'font-family': LABEL_DRAWER_CONSTANTS.FONT_FAMILY
            });
            svgLayer.appendChild(tempText);
            const textBBox = tempText.getBBox();
            svgLayer.removeChild(tempText);

            const labelPadding = LABEL_DRAWER_CONSTANTS.PADDING;
            const labelWidth = textBBox.width + labelPadding * 2;
            const labelHeight = textBBox.height + labelPadding * 2;

            const toPos = svgHelpers.getNodePosition(toElement);
            const toLeft = toPos.left;
            const toTop = toPos.top;

            const toNodeId = conn.to;
            if (!labelOffsets[toNodeId]) {
                labelOffsets[toNodeId] = 0;
            }
            const offset = labelOffsets[toNodeId];
            labelOffsets[toNodeId]++;

            const labelGroup = svgHelpers.createGroup({
                class: 'connection-label',
                'data-to': conn.to,
                'data-from': conn.from
            });

            const labelVerticalSpacing = LABEL_DRAWER_CONSTANTS.VERTICAL_SPACING;

            const labelRect = svgHelpers.createRect({
                x: toLeft,
                y: toTop - labelHeight - LABEL_DRAWER_CONSTANTS.OFFSET_Y - (offset * (labelHeight + labelVerticalSpacing)),
                width: labelWidth,
                height: labelHeight,
                fill: '#fff',
                stroke: '#999',
                'stroke-width': '1',
                rx: LABEL_DRAWER_CONSTANTS.BORDER_RADIUS.toString(),
                ry: LABEL_DRAWER_CONSTANTS.BORDER_RADIUS.toString()
            });

            const labelText = svgHelpers.createText(conn.label, {
                x: toLeft + labelPadding,
                y: toTop - labelHeight / 2 - LABEL_DRAWER_CONSTANTS.OFFSET_Y - (offset * (labelHeight + labelVerticalSpacing)),
                'dominant-baseline': 'central',
                fill: '#333',
                'font-size': LABEL_DRAWER_CONSTANTS.FONT_SIZE.toString(),
                'font-family': LABEL_DRAWER_CONSTANTS.FONT_FAMILY
            });

            labelGroup.appendChild(labelRect);
            labelGroup.appendChild(labelText);

            labelGroup.style.cursor = 'pointer';
            labelGroup.style.pointerEvents = 'auto';
            labelGroup.addEventListener('click', function(e) {
                e.stopPropagation();

                const fromNode = document.getElementById(conn.from);
                const toNode = document.getElementById(conn.to);

                const fromLabel = fromNode ? fromNode.getAttribute('data-label').replace(/<br\\s*\\/?>/gi, ' ').replace(/<[^>]*>/g, '') : conn.from;
                const toLabel = toNode ? toNode.getAttribute('data-label').replace(/<br\\s*\\/?>/gi, ' ').replace(/<[^>]*>/g, '') : conn.to;

                window.edgeHighlighter.highlightEdge(conn.from, conn.to);

                showEdgeInfo(fromLabel, toLabel, conn.label);
            });

            return labelGroup;
        }

        function showEdgeInfo(from, to, label) {
            const existing = document.getElementById('edge-info-panel');
            if (existing) existing.remove();

            const panel = document.createElement('div');
            panel.id = 'edge-info-panel';
            panel.style.position = 'fixed';
            panel.style.top = LABEL_DRAWER_CONSTANTS.INFO_PANEL_TOP;
            panel.style.right = LABEL_DRAWER_CONSTANTS.INFO_PANEL_RIGHT;
            panel.style.backgroundColor = '#fff';
            panel.style.border = '2px solid #333';
            panel.style.borderRadius = LABEL_DRAWER_CONSTANTS.INFO_PANEL_BORDER_RADIUS;
            panel.style.padding = LABEL_DRAWER_CONSTANTS.INFO_PANEL_PADDING;
            panel.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            panel.style.zIndex = '10000';
            panel.style.maxWidth = LABEL_DRAWER_CONSTANTS.INFO_PANEL_MAX_WIDTH;
            panel.style.fontSize = LABEL_DRAWER_CONSTANTS.INFO_PANEL_FONT_SIZE;
            panel.style.lineHeight = LABEL_DRAWER_CONSTANTS.INFO_PANEL_LINE_HEIGHT;

            const closeBtn = document.createElement('button');
            closeBtn.textContent = '×';
            closeBtn.style.position = 'absolute';
            closeBtn.style.top = '5px';
            closeBtn.style.right = '5px';
            closeBtn.style.border = 'none';
            closeBtn.style.background = 'none';
            closeBtn.style.fontSize = '20px';
            closeBtn.style.cursor = 'pointer';
            closeBtn.style.color = '#666';
            closeBtn.onclick = function() { panel.remove(); };
            panel.appendChild(closeBtn);

            const content = document.createElement('div');
            content.innerHTML = '<strong>エッジ情報</strong><br/>' +
                '<div style=\"margin-top:10px\"><strong>From:</strong> ' + from + '</div>' +
                '<div style=\"margin-top:5px\"><strong>To:</strong> ' + to + '</div>' +
                '<div style=\"margin-top:5px\"><strong>ラベル:</strong> ' + label + '</div>';
            panel.appendChild(content);

            document.body.appendChild(panel);
        }
    `;
}

module.exports = {
    getLabelDrawer
};
