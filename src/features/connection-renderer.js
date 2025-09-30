function getConnectionRenderer() {
    return `
        function createCSSLines(connections, nodePositions) {
            const contentWrapper = document.getElementById('contentWrapper');
            if (!contentWrapper) {
                console.error('Content wrapper element not found');
                return;
            }

            const existingLines = contentWrapper.querySelectorAll('.connection-line, .connection-label');
            existingLines.forEach(line => line.remove());

            let connectionCount = 0;
            connections.forEach(conn => {
                const fromElement = document.getElementById(conn.from);
                const toElement = document.getElementById(conn.to);

                // 両端のノードが存在し、かつ表示されている場合のみ接続線を描画
                if (fromElement && toElement &&
                    !fromElement.classList.contains('hidden') &&
                    !toElement.classList.contains('hidden')) {

                    // style.leftとstyle.topから直接座標を取得（transformの影響を受けない）
                    const fromLeft = parseFloat(fromElement.style.left) || 0;
                    const fromTop = parseFloat(fromElement.style.top) || 0;
                    const fromWidth = fromElement.offsetWidth;
                    const fromHeight = fromElement.offsetHeight;

                    const toLeft = parseFloat(toElement.style.left) || 0;
                    const toTop = parseFloat(toElement.style.top) || 0;
                    const toWidth = toElement.offsetWidth;
                    const toHeight = toElement.offsetHeight;

                    const x1 = fromLeft + fromWidth;
                    const y1 = fromTop + fromHeight / 2;
                    const x2 = toLeft;
                    const y2 = toTop + toHeight / 2;

                    const dx = x2 - x1;
                    const dy = y2 - y1;
                    const length = Math.sqrt(dx * dx + dy * dy);
                    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

                    const line = document.createElement('div');
                    line.className = 'connection-line';
                    line.dataset.from = conn.from;
                    line.dataset.to = conn.to;
                    line.style.left = x1 + 'px';
                    line.style.top = y1 + 'px';
                    line.style.width = (length - 8) + 'px';
                    line.style.transform = \`rotate(\${angle}deg)\`;

                    contentWrapper.appendChild(line);
                    connectionCount++;

                    // ラベルがある場合は表示
                    if (conn.label) {
                        const labelElement = document.createElement('div');
                        labelElement.className = 'connection-label';
                        labelElement.textContent = conn.label;

                        // ラベルを子ノード（toElement）の左上に配置
                        labelElement.style.left = toLeft + 'px';
                        labelElement.style.top = toTop + 'px';
                        labelElement.style.transform = 'translate(0, -100%)';

                        contentWrapper.appendChild(labelElement);
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