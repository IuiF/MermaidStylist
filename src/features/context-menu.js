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
                menu.innerHTML = '<div class="context-menu-item" id="collapseAllSame">同じ名前のノードをすべて折りたたむ</div>';
                document.body.appendChild(menu);
                this.menuElement = menu;
            },

            attachEventListeners: function() {
                // 右クリックでメニュー表示
                document.addEventListener('contextmenu', (e) => {
                    const nodeElement = e.target.closest('.node');
                    if (nodeElement && !nodeElement.classList.contains('collapsed-node')) {
                        e.preventDefault();
                        this.showMenu(e.clientX, e.clientY, nodeElement);
                    }
                });

                // メニュー外クリックで閉じる
                document.addEventListener('click', () => {
                    this.hideMenu();
                });

                // メニューアイテムのクリック
                document.getElementById('collapseAllSame').addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.targetNode) {
                        const label = this.targetNode.querySelector('.label').textContent;
                        collapseManager.collapseAllByLabel(label);
                    }
                    this.hideMenu();
                });
            },

            showMenu: function(x, y, nodeElement) {
                this.targetNode = nodeElement;
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