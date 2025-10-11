function getSegmentTypes() {
    return `
        // セグメントタイプの定義
        const SegmentType = {
            HORIZONTAL: 'H',
            VERTICAL: 'V'
        };

        // 座標型
        // Point { x: number, y: number }

        // セグメント型
        // Segment {
        //   type: SegmentType,
        //   from: Point,
        //   to: Point
        // }

        // セグメントを作成するヘルパー関数
        function createSegment(type, from, to) {
            return {
                type: type,
                from: { x: from.x, y: from.y },
                to: { x: to.x, y: to.y }
            };
        }

        // セグメントの長さを計算
        function getSegmentLength(segment) {
            if (segment.type === SegmentType.HORIZONTAL) {
                return Math.abs(segment.to.x - segment.from.x);
            } else {
                return Math.abs(segment.to.y - segment.from.y);
            }
        }

        // セグメントの方向を判定
        function getSegmentDirection(segment) {
            if (segment.type === SegmentType.HORIZONTAL) {
                return segment.to.x > segment.from.x ? 'right' : 'left';
            } else {
                return segment.to.y > segment.from.y ? 'down' : 'up';
            }
        }
    `;
}

module.exports = {
    getSegmentTypes
};
