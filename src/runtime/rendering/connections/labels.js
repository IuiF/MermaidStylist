function getConnectionLabels() {
    return `
        // ラベル描画の共通処理
        let labelOffsets = {};

        function createConnectionLabel(conn, toElement) {
            if (!conn.label) return null;

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

            const toPos = getNodePosition(toElement);
            const toLeft = toPos.left;
            const toTop = toPos.top;

            // 同じターゲットノードへのラベル数を計算してオフセットを決定
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

            const labelVerticalSpacing = 3; // ラベル間の縦方向スペース

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

            // ラベルにクリックイベントを追加
            labelGroup.style.cursor = 'pointer';
            labelGroup.style.pointerEvents = 'auto';
            labelGroup.addEventListener('click', function(e) {
                e.stopPropagation();

                const fromNode = document.getElementById(conn.from);
                const toNode = document.getElementById(conn.to);

                // HTMLタグを除去してテキストのみ取得（<br/>を空白に、他のタグも除去）
                const fromLabel = fromNode ? fromNode.getAttribute('data-label').replace(/<br\\s*\\/?>/gi, ' ').replace(/<[^>]*>/g, '') : conn.from;
                const toLabel = toNode ? toNode.getAttribute('data-label').replace(/<br\\s*\\/?>/gi, ' ').replace(/<[^>]*>/g, '') : conn.to;

                // エッジパスを探してハイライト
                const edgePath = document.querySelector('path[data-from="' + conn.from + '"][data-to="' + conn.to + '"]');
                if (edgePath) {
                    // 既存のハイライトを解除
                    document.querySelectorAll('.edge-highlighted').forEach(el => {
                        el.classList.remove('edge-highlighted');
                        el.style.stroke = '';
                        el.style.strokeWidth = '';
                    });

                    // 新しいハイライトを適用
                    edgePath.classList.add('edge-highlighted');
                    edgePath.style.stroke = '#ff6b6b';
                    edgePath.style.strokeWidth = '3';
                }

                // エッジ情報を画面上に表示
                showEdgeInfo(fromLabel, toLabel, conn.label);
            });

            function showEdgeInfo(from, to, label) {
                // 既存の情報パネルを削除
                const existing = document.getElementById('edge-info-panel');
                if (existing) existing.remove();

                // 情報パネルを作成
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

                // 閉じるボタン
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

                // 内容
                const content = document.createElement('div');
                content.innerHTML = '<strong>エッジ情報</strong><br/>' +
                    '<div style=\"margin-top:10px\"><strong>From:</strong> ' + from + '</div>' +
                    '<div style=\"margin-top:5px\"><strong>To:</strong> ' + to + '</div>' +
                    '<div style=\"margin-top:5px\"><strong>ラベル:</strong> ' + label + '</div>';
                panel.appendChild(content);

                document.body.appendChild(panel);
            }

            return labelGroup;
        }
    `;
}

module.exports = {
    getConnectionLabels
};
