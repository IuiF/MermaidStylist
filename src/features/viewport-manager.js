function getViewportManager() {
    return `
        const viewportManager = {
            scale: 1.0,
            translateX: 0,
            translateY: 0,
            isDragging: false,
            startX: 0,
            startY: 0,
            minScale: 0.2,
            maxScale: 6.0,
            initialTouchDistance: 0,
            initialTouchCenter: { x: 0, y: 0 },
            lastTouchCenter: { x: 0, y: 0 },
            wheelHistory: [],
            activePointers: new Map(),
            diagonalUnlocked: false,
            lastValidDeltaX: 0,
            lastValidDeltaY: 0,
            lastWheelTime: 0,

            init: function() {
                const container = document.getElementById('treeContainer');

                // ホイールイベント（斜め検出による軸ロック解除）
                container.addEventListener('wheel', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const now = Date.now();

                    // 500ms以上間隔が空いたらリセット（新しいジェスチャーと判断）
                    if (now - this.lastWheelTime > 500) {
                        this.diagonalUnlocked = false;
                        this.wheelHistory = [];
                        this.lastValidDeltaX = 0;
                        this.lastValidDeltaY = 0;
                    }
                    this.lastWheelTime = now;

                    if (e.ctrlKey) {
                        // Ctrl+ホイール → ズーム
                        const rect = container.getBoundingClientRect();
                        const mouseX = e.clientX - rect.left;
                        const mouseY = e.clientY - rect.top;

                        const worldX = (mouseX - this.translateX) / this.scale;
                        const worldY = (mouseY - this.translateY) / this.scale;

                        const delta = e.deltaY > 0 ? 0.9 : 1.1;
                        const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * delta));

                        this.translateX = mouseX - worldX * newScale;
                        this.translateY = mouseY - worldY * newScale;
                        this.scale = newScale;

                        this.applyTransform();
                        return;
                    }

                    // 履歴に追加
                    this.wheelHistory.push({
                        time: now,
                        deltaX: e.deltaX,
                        deltaY: e.deltaY
                    });

                    // 古い履歴を削除
                    this.wheelHistory = this.wheelHistory.filter(h => now - h.time < 300);

                    let deltaX = e.deltaX;
                    let deltaY = e.deltaY;

                    // 斜め移動の検出（過去3イベント内に両軸の動きがあるか）
                    const recentEvents = this.wheelHistory.slice(-3);
                    const hasRecentX = recentEvents.some(h => Math.abs(h.deltaX) > 0.5);
                    const hasRecentY = recentEvents.some(h => Math.abs(h.deltaY) > 0.5);

                    // 両軸に動きがあったら斜めモードを有効化
                    if (hasRecentX && hasRecentY && !this.diagonalUnlocked) {
                        this.diagonalUnlocked = true;
                        console.log('Diagonal mode unlocked!');
                    }

                    // 有効なデルタ値を記録
                    if (Math.abs(deltaX) > 0.5) {
                        this.lastValidDeltaX = deltaX;
                    }
                    if (Math.abs(deltaY) > 0.5) {
                        this.lastValidDeltaY = deltaY;
                    }

                    // 斜めモードが有効な場合、片方が0でも補完
                    if (this.diagonalUnlocked) {
                        const threshold = 0.5;

                        // 両方の最後の有効値が存在する場合のみ補完
                        if (Math.abs(this.lastValidDeltaX) > 0 && Math.abs(this.lastValidDeltaY) > 0) {
                            const ratio = Math.abs(this.lastValidDeltaX / this.lastValidDeltaY);

                            // Xが0だがYが動いている → Xを補完
                            if (Math.abs(deltaX) < threshold && Math.abs(deltaY) > threshold) {
                                deltaX = deltaY * ratio * Math.sign(this.lastValidDeltaX);
                                console.log(\`Compensating X: \${deltaX}\`);
                            }
                            // Yが0だがXが動いている → Yを補完
                            else if (Math.abs(deltaY) < threshold && Math.abs(deltaX) > threshold) {
                                deltaY = deltaX / ratio * Math.sign(this.lastValidDeltaY);
                                console.log(\`Compensating Y: \${deltaY}\`);
                            }
                        }
                    }

                    this.translateX -= deltaX;
                    this.translateY -= deltaY;

                    this.applyTransform();
                }, { passive: false });

                // Pointer Eventsでマルチタッチ対応
                container.addEventListener('pointerdown', (e) => {
                    this.activePointers.set(e.pointerId, {
                        x: e.clientX,
                        y: e.clientY
                    });

                    if (this.activePointers.size === 2) {
                        // 2本指の初期状態を記録
                        const pointers = Array.from(this.activePointers.values());
                        const dx = pointers[1].x - pointers[0].x;
                        const dy = pointers[1].y - pointers[0].y;
                        this.initialTouchDistance = Math.sqrt(dx * dx + dy * dy);
                        this.initialTouchCenter = {
                            x: (pointers[0].x + pointers[1].x) / 2,
                            y: (pointers[0].y + pointers[1].y) / 2
                        };
                        this.lastTouchCenter = { ...this.initialTouchCenter };
                    } else if (this.activePointers.size === 1 &&
                              (e.target === container || e.target.classList.contains('connection-line') ||
                               e.target.classList.contains('connection-label'))) {
                        // 1本指/マウスでドラッグ開始
                        this.isDragging = true;
                        this.startX = e.clientX - this.translateX;
                        this.startY = e.clientY - this.translateY;
                        container.style.cursor = 'grabbing';
                    }
                });

                container.addEventListener('pointermove', (e) => {
                    if (!this.activePointers.has(e.pointerId)) return;

                    this.activePointers.set(e.pointerId, {
                        x: e.clientX,
                        y: e.clientY
                    });

                    if (this.activePointers.size === 2) {
                        // 2本指操作
                        const pointers = Array.from(this.activePointers.values());
                        const dx = pointers[1].x - pointers[0].x;
                        const dy = pointers[1].y - pointers[0].y;
                        const currentDistance = Math.sqrt(dx * dx + dy * dy);

                        const currentCenter = {
                            x: (pointers[0].x + pointers[1].x) / 2,
                            y: (pointers[0].y + pointers[1].y) / 2
                        };

                        // ピンチズーム
                        if (this.initialTouchDistance > 0) {
                            const rect = container.getBoundingClientRect();
                            const centerX = this.initialTouchCenter.x - rect.left;
                            const centerY = this.initialTouchCenter.y - rect.top;

                            const worldX = (centerX - this.translateX) / this.scale;
                            const worldY = (centerY - this.translateY) / this.scale;

                            const scaleChange = currentDistance / this.initialTouchDistance;
                            const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * scaleChange));

                            this.translateX = centerX - worldX * newScale;
                            this.translateY = centerY - worldY * newScale;
                            this.scale = newScale;

                            this.initialTouchDistance = currentDistance;
                        }

                        // 2本指パン
                        const panX = currentCenter.x - this.lastTouchCenter.x;
                        const panY = currentCenter.y - this.lastTouchCenter.y;

                        this.translateX += panX;
                        this.translateY += panY;

                        this.lastTouchCenter = currentCenter;

                        this.applyTransform();
                    } else if (this.isDragging) {
                        // 1本指/マウスドラッグ
                        this.translateX = e.clientX - this.startX;
                        this.translateY = e.clientY - this.startY;
                        this.applyTransform();
                    }
                });

                container.addEventListener('pointerup', (e) => {
                    this.activePointers.delete(e.pointerId);

                    if (this.activePointers.size < 2) {
                        this.initialTouchDistance = 0;
                    }

                    if (this.activePointers.size === 0 && this.isDragging) {
                        this.isDragging = false;
                        container.style.cursor = 'grab';
                    }
                });

                container.addEventListener('pointercancel', (e) => {
                    this.activePointers.delete(e.pointerId);
                    if (this.activePointers.size === 0 && this.isDragging) {
                        this.isDragging = false;
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