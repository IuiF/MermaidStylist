function getConnectionRenderer() {
    return `
        function createCSSLines(connections, nodePositions) {
            const container = document.getElementById('treeContainer');
            if (!container) {
                console.error('Container element not found');
                return;
            }

            const existingLines = container.querySelectorAll('.connection-line, .connection-label');
            existingLines.forEach(line => line.remove());

            let connectionCount = 0;
            connections.forEach(conn => {
                const fromElement = document.getElementById(conn.from);
                const toElement = document.getElementById(conn.to);

                // 両端のノードが存在し、かつ表示されている場合のみ接続線を描画
                if (fromElement && toElement &&
                    !fromElement.classList.contains('hidden') &&
                    !toElement.classList.contains('hidden')) {
                    const fromRect = {
                        left: fromElement.offsetLeft,
                        top: fromElement.offsetTop,
                        width: fromElement.offsetWidth,
                        height: fromElement.offsetHeight
                    };
                    const toRect = {
                        left: toElement.offsetLeft,
                        top: toElement.offsetTop,
                        width: toElement.offsetWidth,
                        height: toElement.offsetHeight
                    };

                    const x1 = fromRect.left + fromRect.width;
                    const y1 = fromRect.top + fromRect.height / 2;
                    const x2 = toRect.left;
                    const y2 = toRect.top + toRect.height / 2;

                    const dx = x2 - x1;
                    const dy = y2 - y1;
                    const length = Math.sqrt(dx * dx + dy * dy);
                    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

                    const line = document.createElement('div');
                    line.className = 'connection-line';
                    line.style.left = x1 + 'px';
                    line.style.top = y1 + 'px';
                    line.style.width = length + 'px';
                    line.style.transform = \`rotate(\${angle}deg)\`;

                    container.appendChild(line);
                    connectionCount++;

                    // ラベルがある場合は表示
                    if (conn.label) {
                        const labelElement = document.createElement('div');
                        labelElement.className = 'connection-label';
                        labelElement.textContent = conn.label;

                        // ラベルを子ノード（toElement）の左上に配置
                        labelElement.style.left = toRect.left + 'px';
                        labelElement.style.top = toRect.top + 'px';
                        labelElement.style.transform = 'translate(0, -100%)';

                        container.appendChild(labelElement);
                    }
                }
            });

            console.log("Created " + connectionCount + " CSS lines");
        }
    `;
}

module.exports = {
    getConnectionRenderer
};