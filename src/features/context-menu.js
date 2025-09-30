function getContextMenu() {
    return `
        const contextMenu = {
            menuElement: null,
            targetNode: null,

            init: function() {
                this.createMenuElement();
                this.attachEventListeners();
            },

            createMenuElement: function() {
                const menu = document.createElement('div');
                menu.id = 'contextMenu';
                menu.className = 'context-menu';
                document.body.appendChild(menu);
                this.menuElement = menu;
            },

            updateMenuItems: function(nodeElement) {
                const label = nodeElement.querySelector('.label').textContent;
                const isCollapsed = nodeElement.classList.contains('collapsed-node');
                const hasChildren = collapseManager.canCollapse(nodeElement.id);
                const isHighlighted = nodeElement.classList.contains('highlighted');
                const isPathHighlighted = nodeElement.classList.contains('path-highlighted');

                let menuHTML = '';

                if (hasChildren) {
                    if (isCollapsed) {
                        menuHTML += '<div class="context-menu-item" data-action="expandAllSame">同じ名前のノードをすべて展開</div>';
                    } else {
                        menuHTML += '<div class="context-menu-item" data-action="collapseAllSame">同じ名前のノードをすべて折りたたむ</div>';
                    }
                }

                if (isHighlighted) {
                    menuHTML += '<div class="context-menu-item" data-action="clearHighlight">強調表示を解除</div>';
                } else {
                    menuHTML += '<div class="context-menu-item" data-action="highlightSame">同じ名前のノードを強調</div>';
                }

                if (isPathHighlighted) {
                    menuHTML += '<div class="context-menu-item" data-action="clearPath">ルート表示を解除</div>';
                } else {
                    menuHTML += '<div class="context-menu-item" data-action="showPath">ルートを表示</div>';
                }

                this.menuElement.innerHTML = menuHTML;
            },

            attachEventListeners: function() {
                // 右クリックでメニュー表示
                document.addEventListener('contextmenu', (e) => {
                    const nodeElement = e.target.closest('.node');
                    if (nodeElement) {
                        e.preventDefault();
                        this.showMenu(e.clientX, e.clientY, nodeElement);
                    }
                });

                // メニュー外クリックで閉じる
                document.addEventListener('click', () => {
                    this.hideMenu();
                });

                // メニューアイテムのクリック（イベント委譲）
                this.menuElement.addEventListener('click', (e) => {
                    const item = e.target.closest('.context-menu-item');
                    if (item && this.targetNode) {
                        e.stopPropagation();
                        const action = item.getAttribute('data-action');
                        const label = this.targetNode.querySelector('.label').textContent;

                        if (action === 'collapseAllSame') {
                            collapseManager.collapseAllByLabel(label);
                        } else if (action === 'expandAllSame') {
                            collapseManager.expandAllByLabel(label);
                        } else if (action === 'highlightSame') {
                            highlightManager.highlightAllByLabel(label);
                        } else if (action === 'clearHighlight') {
                            highlightManager.clearHighlight();
                        } else if (action === 'showPath') {
                            pathHighlighter.highlightPathToRoot(this.targetNode.id);
                        } else if (action === 'clearPath') {
                            pathHighlighter.clearPathHighlight();
                        }

                        this.hideMenu();
                    }
                });
            },

            showMenu: function(x, y, nodeElement) {
                this.targetNode = nodeElement;
                this.updateMenuItems(nodeElement);
                this.menuElement.style.left = x + 'px';
                this.menuElement.style.top = y + 'px';
                this.menuElement.classList.add('visible');
            },

            hideMenu: function() {
                this.menuElement.classList.remove('visible');
                this.targetNode = null;
            }
        };
    `;
}

module.exports = {
    getContextMenu
};