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
            wheelHistory: [],
            activePointers: new Map(),

            init: function() {
                const container = document.getElementById('treeContainer');

                // ホイールイベント（軸ロック検出機能付き）
                container.addEventListener('wheel', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const now = Date.now();

                    // 履歴に追加
                    this.wheelHistory.push({
                        time: now,
                        deltaX: e.deltaX,
                        deltaY: e.deltaY
                    });

                    // 200ms以上古い履歴を削除
                    this.wheelHistory = this.wheelHistory.filter(h => now - h.time < 200);

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
                    } else {
                        // 軸ロック検出：履歴に両軸の動きがあるか確認
                        const hasXMovement = this.wheelHistory.some(h => Math.abs(h.deltaX) > 0.1);
                        const hasYMovement = this.wheelHistory.some(h => Math.abs(h.deltaY) > 0.1);

                        let deltaX = e.deltaX;
                        let deltaY = e.deltaY;

                        // 両軸に動きがあったのに現在片方が0の場合、軸ロックされている
                        if (hasXMovement && hasYMovement) {
                            // 最近の動きの平均比率を計算
                            const recentMoves = this.wheelHistory.slice(-5);
                            const avgRatio = this.calculateAverageRatio(recentMoves);

                            // 現在のdeltaが0でも、履歴から推定して補完
                            if (Math.abs(deltaX) < 0.1 && Math.abs(deltaY) > 0.1) {
                                deltaX = deltaY * avgRatio.xToY;
                            } else if (Math.abs(deltaY) < 0.1 && Math.abs(deltaX) > 0.1) {
                                deltaY = deltaX * avgRatio.yToX;
                            }
                        }

                        this.translateX -= deltaX;
                        this.translateY -= deltaY;
                    }

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

            calculateAverageRatio: function(moves) {
                let totalXToY = 0;
                let totalYToX = 0;
                let countX = 0;
                let countY = 0;

                for (const move of moves) {
                    if (Math.abs(move.deltaY) > 0.1) {
                        totalXToY += move.deltaX / move.deltaY;
                        countX++;
                    }
                    if (Math.abs(move.deltaX) > 0.1) {
                        totalYToX += move.deltaY / move.deltaX;
                        countY++;
                    }
                }

                return {
                    xToY: countX > 0 ? totalXToY / countX : 0,
                    yToX: countY > 0 ? totalYToX / countY : 0
                };
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