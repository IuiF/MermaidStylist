class LayoutSwitcher {
    constructor() {
        this.currentLayout = 'vertical';
    }

    getCurrentLayout() {
        return this.currentLayout;
    }

    setLayout(layoutType) {
        if (layoutType !== 'vertical' && layoutType !== 'horizontal') {
            console.error('Invalid layout type:', layoutType);
            return false;
        }
        this.currentLayout = layoutType;
        return true;
    }

    toggleLayout() {
        this.currentLayout = this.currentLayout === 'vertical' ? 'horizontal' : 'vertical';
        return this.currentLayout;
    }
}

module.exports = {
    LayoutSwitcher
};