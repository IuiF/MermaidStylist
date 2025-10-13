function getRenderer() {
    const nodeDrawer = require('./node-drawer').getNodeDrawer();
    const edgeDrawer = require('./edge-drawer').getEdgeDrawer();
    const labelDrawer = require('./label-drawer').getLabelDrawer();

    return nodeDrawer + edgeDrawer + labelDrawer + `
        /**
         * LayoutResultを使ってすべてを描画
         */
        function renderFromLayoutResult(layoutResult, connections) {
            console.log('[V2 Renderer] Starting render from LayoutResult');

            drawNodes(layoutResult);
            console.log('[V2 Renderer] Nodes drawn');

            drawEdges(layoutResult);
            console.log('[V2 Renderer] Edges drawn');

            drawLabels(layoutResult, connections);
            console.log('[V2 Renderer] Labels drawn');

            adjustZOrder();
            console.log('[V2 Renderer] Z-order adjusted');
        }

        /**
         * Z-order調整: ルートノードを最前面に移動
         */
        function adjustZOrder() {
            const svgLayer = svgHelpers.getNodeLayer();
            nodes.forEach(node => {
                const isRoot = !connections.some(conn => conn.to === node.id);
                if (isRoot) {
                    const element = document.getElementById(node.id);
                    if (element && element.parentNode === svgLayer) {
                        svgLayer.appendChild(element);
                    }
                }
            });
        }
    `;
}

module.exports = {
    getRenderer
};
