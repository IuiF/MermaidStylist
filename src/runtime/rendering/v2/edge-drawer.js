function getEdgeDrawer() {
    return `
        /**
         * LayoutResultからエッジを描画
         */
        function drawEdges(layoutResult) {
            const svgLayer = svgHelpers.getEdgeLayer();
            if (!svgLayer) {
                console.error('SVG layer element not found');
                return;
            }

            const existingLines = svgLayer.querySelectorAll('.connection-line, .connection-arrow');
            existingLines.forEach(line => line.remove());

            layoutResult.edgeRoutes.forEach((route, edgeKey) => {
                const [from, to] = edgeKey.split('->');

                const fromElement = svgHelpers.getNodeElement(from);
                const toElement = svgHelpers.getNodeElement(to);

                if (!fromElement || !toElement) return;
                if (fromElement.classList.contains('hidden') || toElement.classList.contains('hidden')) return;

                const pathData = renderEdgeRoute(route);

                const conn = allConnections.find(c => c.from === from && c.to === to);
                if (!conn) return;

                const path = svgHelpers.createPath(pathData, {
                    class: conn.isDashed ? 'connection-line dashed-edge' : 'connection-line',
                    'data-from': from,
                    'data-to': to,
                    fill: 'none'
                });

                if (conn.isDashed) {
                    path.style.strokeDasharray = '5,5';
                    path.style.opacity = '0.6';
                }

                svgLayer.appendChild(path);

                const arrow = createHorizontalArrow(route.arrowPoint.x, route.arrowPoint.y, conn);
                svgLayer.appendChild(arrow);
            });
        }

        /**
         * EdgeRouteからSVGパスを生成
         */
        function renderEdgeRoute(route) {
            if (!route.segments || route.segments.length === 0) {
                return '';
            }

            let path = 'M ' + route.segments[0].start.x + ' ' + route.segments[0].start.y;

            route.segments.forEach(segment => {
                if (segment.type === 'horizontal' || segment.type === 'vertical') {
                    path += ' L ' + segment.end.x + ' ' + segment.end.y;
                } else if (segment.type === 'curve' && segment.curveParams) {
                    path += ' Q ' + segment.curveParams.controlPoint1.x + ' ' +
                            segment.curveParams.controlPoint1.y + ' ' +
                            segment.end.x + ' ' + segment.end.y;
                } else if (segment.type === 'arc') {
                    const arcHeight = 6;
                    path += ' A ' + arcHeight + ' ' + arcHeight + ' 0 0 1 ' +
                            segment.end.x + ' ' + segment.end.y;
                }
            });

            return path;
        }

        /**
         * 水平方向の矢印を作成
         */
        function createHorizontalArrow(x2, y2, conn) {
            const angle = 0;
            const arrowSize = 8;

            const p1x = x2;
            const p1y = y2;
            const p2x = x2 - arrowSize * Math.cos(angle - Math.PI / 6);
            const p2y = y2 - arrowSize * Math.sin(angle - Math.PI / 6);
            const p3x = x2 - arrowSize * Math.cos(angle + Math.PI / 6);
            const p3y = y2 - arrowSize * Math.sin(angle + Math.PI / 6);

            return svgHelpers.createPolygon(p1x + ',' + p1y + ' ' + p2x + ',' + p2y + ' ' + p3x + ',' + p3y, {
                class: 'connection-arrow',
                'data-from': conn.from,
                'data-to': conn.to
            });
        }
    `;
}

module.exports = {
    getEdgeDrawer
};
