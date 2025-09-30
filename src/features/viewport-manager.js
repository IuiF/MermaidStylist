function getViewportManager() {
    return `
        const viewportManager = {
            scale: 1.0,
            translateX: 0,
            translateY: 0,
            isDragging: false,
            startX: 0,
            startY: 0,
            minScale: 0.1,
            maxScale: 3.0,

            init: function() {
                const container = document.getElementById('treeContainer');

                // マウスホイールでズーム
                container.addEventListener('wheel', (e) => {
                    e.preventDefault();

                    const rect = container.getBoundingClientRect();
                    const mouseX = e.clientX - rect.left;
                    const mouseY = e.clientY - rect.top;

                    // ズーム前のマウス位置（ワールド座標）
                    const worldX = (mouseX - this.translateX) / this.scale;
                    const worldY = (mouseY - this.translateY) / this.scale;

                    // ズーム
                    const delta = e.deltaY > 0 ? 0.9 : 1.1;
                    const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * delta));

                    // ズーム後もマウス位置が同じワールド座標を指すように調整
                    this.translateX = mouseX - worldX * newScale;
                    this.translateY = mouseY - worldY * newScale;
                    this.scale = newScale;

                    this.applyTransform();
                });

                // ドラッグで移動
                container.addEventListener('mousedown', (e) => {
                    if (e.target === container || e.target.classList.contains('connection-line') || e.target.classList.contains('connection-label')) {
                        this.isDragging = true;
                        this.startX = e.clientX - this.translateX;
                        this.startY = e.clientY - this.translateY;
                        container.style.cursor = 'grabbing';
                    }
                });

                document.addEventListener('mousemove', (e) => {
                    if (this.isDragging) {
                        this.translateX = e.clientX - this.startX;
                        this.translateY = e.clientY - this.startY;
                        this.applyTransform();
                    }
                });

                document.addEventListener('mouseup', () => {
                    if (this.isDragging) {
                        this.isDragging = false;
                        const container = document.getElementById('treeContainer');
                        container.style.cursor = 'grab';
                    }
                });

                // 初期カーソル設定
                container.style.cursor = 'grab';
            },

            applyTransform: function() {
                const contentWrapper = document.getElementById('contentWrapper');
                if (contentWrapper) {
                    contentWrapper.style.transform = \`translate(\${this.translateX}px, \${this.translateY}px) scale(\${this.scale})\`;
                }
            },

            resetView: function() {
                this.scale = 1.0;
                this.translateX = 0;
                this.translateY = 0;
                this.applyTransform();
            },

            fitToView: function() {
                const container = document.getElementById('treeContainer');
                const contentWrapper = document.getElementById('contentWrapper');

                if (!contentWrapper) return;

                // すべてのノードの境界を計算
                const nodes = contentWrapper.querySelectorAll('.node');
                if (nodes.length === 0) return;

                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

                nodes.forEach(node => {
                    const x = parseFloat(node.style.left);
                    const y = parseFloat(node.style.top);
                    const width = node.offsetWidth;
                    const height = node.offsetHeight;

                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x + width);
                    maxY = Math.max(maxY, y + height);
                });

                const contentWidth = maxX - minX;
                const contentHeight = maxY - minY;
                const containerWidth = container.clientWidth;
                const containerHeight = container.clientHeight;

                // パディングを考慮したスケール計算
                const padding = 50;
                const scaleX = (containerWidth - padding * 2) / contentWidth;
                const scaleY = (containerHeight - padding * 2) / contentHeight;
                const newScale = Math.min(scaleX, scaleY, this.maxScale);

                // コンテンツを中央に配置
                this.scale = newScale;
                this.translateX = (containerWidth - contentWidth * newScale) / 2 - minX * newScale;
                this.translateY = (containerHeight - contentHeight * newScale) / 2 - minY * newScale;

                this.applyTransform();
            }
        };
    `;
}

module.exports = {
    getViewportManager
};