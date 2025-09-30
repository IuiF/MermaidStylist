function getPathHighlighter() {
    return `
        const pathHighlighter = {
            highlightPathToRoot: function(nodeId) {
                // クリア
                this.clearPathHighlight();

                // 親マップを作成
                const parentMap = new Map();
                connections.forEach(conn => {
                    if (!parentMap.has(conn.to)) {
                        parentMap.set(conn.to, []);
                    }
                    parentMap.get(conn.to).push(conn.from);
                });

                // BFSで全てのルートまでのパスを検出
                const pathNodes = new Set();
                const pathConnections = new Set();
                const queue = [nodeId];
                const visited = new Set([nodeId]);
                pathNodes.add(nodeId);

                while (queue.length > 0) {
                    const currentId = queue.shift();
                    const parents = parentMap.get(currentId) || [];

                    for (const parentId of parents) {
                        pathNodes.add(parentId);

                        // 接続を記録
                        const connKey = parentId + '->' + currentId;
                        pathConnections.add(connKey);

                        if (!visited.has(parentId)) {
                            visited.add(parentId);
                            queue.push(parentId);
                        }
                    }
                }

                // ノードを強調表示
                pathNodes.forEach(id => {
                    const element = document.getElementById(id);
                    if (element) {
                        element.classList.add('path-highlighted');

                        // 同名ノードハイライトと同時の場合、黄色の輪郭を追加
                        if (element.classList.contains('highlighted')) {
                            this.addDoubleStroke(element);
                        }
                    }
                });

                // 接続線を強調表示
                const allLines = document.querySelectorAll('.connection-line, .connection-arrow');
                allLines.forEach(line => {
                    const from = line.getAttribute('data-from');
                    const to = line.getAttribute('data-to');
                    if (from && to) {
                        const connKey = from + '->' + to;
                        if (pathConnections.has(connKey)) {
                            line.classList.add('path-highlighted-line');
                        }
                    }
                });
            },

            addDoubleStroke: function(nodeElement) {
                const rect = nodeElement.querySelector('.node-rect');
                if (!rect) return;

                // 既存の追加輪郭を削除
                const existingOverlay = nodeElement.querySelector('.double-stroke-overlay');
                if (existingOverlay) {
                    existingOverlay.remove();
                }

                // 黄色の輪郭用rect要素を作成
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

                // rectの直後に挿入
                rect.parentNode.insertBefore(overlayRect, rect.nextSibling);
            },

            clearPathHighlight: function() {
                // 追加の黄色輪郭を削除
                document.querySelectorAll('.double-stroke-overlay').forEach(element => {
                    element.remove();
                });

                document.querySelectorAll('.path-highlighted').forEach(element => {
                    element.classList.remove('path-highlighted');
                });

                document.querySelectorAll('.path-highlighted-line').forEach(element => {
                    element.classList.remove('path-highlighted-line');
                });
            }
        };
    `;
}

module.exports = {
    getPathHighlighter
};