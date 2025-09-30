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
                const allLines = document.querySelectorAll('.connection-line');
                allLines.forEach(line => {
                    // data属性から接続情報を取得（後で追加）
                    const from = line.dataset.from;
                    const to = line.dataset.to;
                    if (from && to) {
                        const connKey = from + '->' + to;
                        if (pathConnections.has(connKey)) {
                            line.classList.add('path-highlighted-line');
                        }
                    }
                });
            },

            clearPathHighlight: function() {
                // ノードからpath-highlightedクラスを削除
                document.querySelectorAll('.path-highlighted').forEach(element => {
                    element.classList.remove('path-highlighted');
                });

                // 接続線からpath-highlighted-lineクラスを削除
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