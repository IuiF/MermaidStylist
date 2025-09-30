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
            }
        };
    `;
}

module.exports = {
    getViewportManager
};