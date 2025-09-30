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

            clearPathHighlight: function() {
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