function getTypes() {
    return `
        class Point {
            constructor(x, y) {
                this.x = x;
                this.y = y;
            }
        }

        class NodeRect {
            constructor(x, y, width, height) {
                this.x = x;
                this.y = y;
                this.width = width;
                this.height = height;
            }
        }

        class CurveParams {
            constructor(controlPoint1, controlPoint2) {
                this.controlPoint1 = controlPoint1;
                this.controlPoint2 = controlPoint2;
            }
        }

        class ArcParams {
            constructor(centerX, centerY, radius, startAngle, endAngle) {
                this.centerX = centerX;
                this.centerY = centerY;
                this.radius = radius;
                this.startAngle = startAngle;
                this.endAngle = endAngle;
            }
        }

        class Segment {
            constructor(type, start, end, curveParams = null, arcParams = null) {
                this.type = type;  // 'horizontal' | 'vertical' | 'curve' | 'arc'
                this.start = start;
                this.end = end;
                this.curveParams = curveParams;
                this.arcParams = arcParams;
            }
        }

        class EdgeRoute {
            constructor(segments, arrowPoint) {
                this.segments = segments;
                this.arrowPoint = arrowPoint;
            }
        }

        class LabelPosition {
            constructor(x, y, width, height) {
                this.x = x;
                this.y = y;
                this.width = width;
                this.height = height;
            }
        }

        class LayoutMetadata {
            constructor(levelXPositions, levelMaxWidths, levelCount) {
                this.levelXPositions = levelXPositions;
                this.levelMaxWidths = levelMaxWidths;
                this.levelCount = levelCount;
            }
        }

        class LayoutResult {
            constructor(nodePositions, edgeRoutes, labelPositions, metadata) {
                this.nodePositions = nodePositions;
                this.edgeRoutes = edgeRoutes;
                this.labelPositions = labelPositions;
                this.metadata = metadata;
            }
        }
    `;
}

module.exports = {
    getTypes
};
