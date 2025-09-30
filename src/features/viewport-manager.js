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
            initialTouchDistance: 0,
            initialTouchCenter: { x: 0, y: 0 },
            lastTouchCenter: { x: 0, y: 0 },

            init: function() {
                const container = document.getElementById('treeContainer');

                // ホイールイベント（Ctrl+ホイールでズーム、通常の2本指スライドでパン）
                container.addEventListener('wheel', (e) => {
                    e.preventDefault();

                    if (e.ctrlKey) {
                        // Ctrl+ホイール → ズーム
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
                    } else {
                        // 通常のホイール/2本指スライド → パン
                        this.translateX -= e.deltaX;
                        this.translateY -= e.deltaY;
                    }

                    this.applyTransform();
                }, { passive: false });

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

                // タッチイベント（2本指でパン、ピンチでズーム）
                container.addEventListener('touchstart', (e) => {
                    if (e.touches.length === 2) {
                        e.preventDefault();

                        const rect = container.getBoundingClientRect();

                        // 2本指の距離と中心点を記録
                        const touch1 = e.touches[0];
                        const touch2 = e.touches[1];

                        const dx = touch2.clientX - touch1.clientX;
                        const dy = touch2.clientY - touch1.clientY;
                        this.initialTouchDistance = Math.sqrt(dx * dx + dy * dy);

                        this.initialTouchCenter = {
                            x: (touch1.clientX + touch2.clientX) / 2 - rect.left,
                            y: (touch1.clientY + touch2.clientY) / 2 - rect.top
                        };

                        this.lastTouchCenter = { ...this.initialTouchCenter };
                    }
                }, { passive: false });

                container.addEventListener('touchmove', (e) => {
                    if (e.touches.length === 2) {
                        e.preventDefault();

                        const rect = container.getBoundingClientRect();
                        const touch1 = e.touches[0];
                        const touch2 = e.touches[1];

                        // 現在の2本指の距離
                        const dx = touch2.clientX - touch1.clientX;
                        const dy = touch2.clientY - touch1.clientY;
                        const currentDistance = Math.sqrt(dx * dx + dy * dy);

                        // 現在の中心点
                        const currentCenter = {
                            x: (touch1.clientX + touch2.clientX) / 2 - rect.left,
                            y: (touch1.clientY + touch2.clientY) / 2 - rect.top
                        };

                        // ピンチズーム
                        if (this.initialTouchDistance > 0) {
                            const worldX = (this.initialTouchCenter.x - this.translateX) / this.scale;
                            const worldY = (this.initialTouchCenter.y - this.translateY) / this.scale;

                            const scaleChange = currentDistance / this.initialTouchDistance;
                            const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * scaleChange));

                            this.translateX = this.initialTouchCenter.x - worldX * newScale;
                            this.translateY = this.initialTouchCenter.y - worldY * newScale;
                            this.scale = newScale;

                            this.initialTouchDistance = currentDistance;
                        }

                        // 2本指でパン
                        const panX = currentCenter.x - this.lastTouchCenter.x;
                        const panY = currentCenter.y - this.lastTouchCenter.y;

                        this.translateX += panX;
                        this.translateY += panY;

                        this.lastTouchCenter = currentCenter;

                        this.applyTransform();
                    }
                }, { passive: false });

                container.addEventListener('touchend', (e) => {
                    if (e.touches.length < 2) {
                        this.initialTouchDistance = 0;
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