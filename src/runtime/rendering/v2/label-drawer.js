function getLabelDrawer() {
    return `
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
                'font-size': '11',
                'font-family': 'Arial, sans-serif'
            });
            svgLayer.appendChild(tempText);
            const textBBox = tempText.getBBox();
            svgLayer.removeChild(tempText);

            const labelPadding = 4;
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

            const labelVerticalSpacing = 10;

            const labelRect = svgHelpers.createRect({
                x: toLeft,
                y: toTop - labelHeight - 2 - (offset * (labelHeight + labelVerticalSpacing)),
                width: labelWidth,
                height: labelHeight,
                fill: '#fff',
                stroke: '#999',
                'stroke-width': '1',
                rx: '3',
                ry: '3'
            });

            const labelText = svgHelpers.createText(conn.label, {
                x: toLeft + labelPadding,
                y: toTop - labelHeight / 2 - 2 - (offset * (labelHeight + labelVerticalSpacing)),
                'dominant-baseline': 'central',
                fill: '#333',
                'font-size': '11',
                'font-family': 'Arial, sans-serif'
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
            panel.style.top = '80px';
            panel.style.right = '20px';
            panel.style.backgroundColor = '#fff';
            panel.style.border = '2px solid #333';
            panel.style.borderRadius = '8px';
            panel.style.padding = '15px';
            panel.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            panel.style.zIndex = '10000';
            panel.style.maxWidth = '400px';
            panel.style.fontSize = '13px';
            panel.style.lineHeight = '1.6';

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
