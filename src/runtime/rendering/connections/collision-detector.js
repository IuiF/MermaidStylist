function getCollisionDetector() {
    return `
        // エッジとラベル/ノードの衝突を検出・回避する関数

        // すべてのノードの座標を取得
        function getAllNodeBounds(excludeFrom, excludeTo) {
            const nodes = [];
            allNodes.forEach(node => {
                // 現在のエッジの始点・終点は除外
                if (node.id === excludeFrom || node.id === excludeTo) return;

                const element = svgHelpers.getNodeElement(node.id);
                if (element && !element.classList.contains('hidden')) {
                    const pos = getNodePosition(element);
                    const dim = getNodeDimensions(element);
                    nodes.push({
                        id: node.id,
                        left: pos.left,
                        top: pos.top,
                        right: pos.left + dim.width,
                        bottom: pos.top + dim.height,
                        width: dim.width,
                        height: dim.height
                    });
                }
            });
            return nodes;
        }

        // すべてのラベルの座標を取得
        function getAllLabelBounds() {
            const svgLayer = svgHelpers.getEdgeLayer();
            const labels = svgLayer.querySelectorAll('.connection-label');
            const labelBounds = [];

            labels.forEach(label => {
                // ラベルのrect要素から直接座標を取得（SVG座標系）
                const rectElement = label.querySelector('rect');
                if (rectElement) {
                    const x = parseFloat(rectElement.getAttribute('x'));
                    const y = parseFloat(rectElement.getAttribute('y'));
                    const width = parseFloat(rectElement.getAttribute('width'));
                    const height = parseFloat(rectElement.getAttribute('height'));

                    labelBounds.push({
                        from: label.getAttribute('data-from'),
                        to: label.getAttribute('data-to'),
                        left: x,
                        top: y,
                        right: x + width,
                        bottom: y + height,
                        width: width,
                        height: height
                    });
                }
            });

            return labelBounds;
        }

        // 垂直線がノードと交差するかチェック
        function checkVerticalLineIntersectsNode(x, y1, y2, nodeBounds) {
            const yMin = Math.min(y1, y2);
            const yMax = Math.max(y1, y2);
            const collisionPadding = 40; // ノードとの最小距離

            for (const node of nodeBounds) {
                // 垂直線のX座標がノードの範囲内にあるかチェック
                if (x >= node.left - collisionPadding && x <= node.right + collisionPadding) {
                    // 垂直線のY範囲がノードと重なるかチェック
                    if (!(yMax < node.top - collisionPadding || yMin > node.bottom + collisionPadding)) {
                        return node;
                    }
                }
            }
            return null;
        }

        // 垂直線がラベルと交差するかチェック
        function checkVerticalLineIntersectsLabel(x, y1, y2, labelBounds) {
            const yMin = Math.min(y1, y2);
            const yMax = Math.max(y1, y2);

            for (const label of labelBounds) {
                // 垂直線のX座標がラベルの範囲内にあるかチェック
                if (x >= label.left && x <= label.right) {
                    // 垂直線のY範囲がラベルと重なるかチェック
                    if (!(yMax < label.top || yMin > label.bottom)) {
                        return label;
                    }
                }
            }
            return null;
        }

        // 水平線がノードと交差するかチェック（すべての衝突ノードを返す）
        function checkHorizontalLineIntersectsNode(x1, x2, y, nodeBounds) {
            const xMin = Math.min(x1, x2);
            const xMax = Math.max(x1, x2);
            const collisionPadding = 40; // ノードとの最小距離
            const intersectingNodes = [];

            for (const node of nodeBounds) {
                // 水平線のY座標がノードの範囲内にあるかチェック
                if (y >= node.top - collisionPadding && y <= node.bottom + collisionPadding) {
                    // 水平線のX範囲がノードと重なるかチェック
                    if (!(xMax < node.left - collisionPadding || xMin > node.right + collisionPadding)) {
                        intersectingNodes.push(node);
                    }
                }
            }
            return intersectingNodes;
        }

        // 水平線がラベルと交差するかチェック
        function checkHorizontalLineIntersectsLabel(x1, x2, y, labelBounds) {
            const xMin = Math.min(x1, x2);
            const xMax = Math.max(x1, x2);

            for (const label of labelBounds) {
                // 水平線のY座標がラベルの範囲内にあるかチェック
                if (y >= label.top && y <= label.bottom) {
                    // 水平線のX範囲がラベルと重なるかチェック
                    if (!(xMax < label.left || xMin > label.right)) {
                        return label;
                    }
                }
            }
            return null;
        }

        // 水平線がラベルを避けるためのX座標を計算
        function calculateHorizontalLineAvoidance(x1, x2, y, labelBounds) {
            const collisionPadding = 15;
            const xMin = Math.min(x1, x2);
            const xMax = Math.max(x1, x2);

            // この水平線と交差するラベルを見つける
            const intersectingLabels = [];
            for (const label of labelBounds) {
                // 水平線のY座標がラベルの範囲内にあるかチェック
                if (y >= label.top - collisionPadding && y <= label.bottom + collisionPadding) {
                    // 水平線のX範囲がラベルと重なるかチェック
                    if (!(xMax < label.left - collisionPadding || xMin > label.right + collisionPadding)) {
                        intersectingLabels.push(label);
                    }
                }
            }

            if (intersectingLabels.length === 0) {
                return null; // 衝突なし
            }

            // 最も左にあるラベルの左側で折り返す
            const minLeft = Math.min(...intersectingLabels.map(l => l.left));
            return minLeft - collisionPadding;
        }

        // ノードを避けるためのX座標オフセットを計算
        function calculateNodeAvoidanceOffset(x, y1, y2, nodeBounds, edgeFrom, edgeTo) {
            const yMin = Math.min(y1, y2);
            const yMax = Math.max(y1, y2);
            const collisionPadding = 40; // ノードとの最小距離

            // この経路と交差するノードを見つける
            const intersectingNodes = [];
            for (const node of nodeBounds) {
                // 垂直線のX座標がノードの範囲内にあるかチェック
                if (x >= node.left - collisionPadding && x <= node.right + collisionPadding) {
                    // 垂直線のY範囲がノードと重なるかチェック
                    if (!(yMax < node.top - collisionPadding || yMin > node.bottom + collisionPadding)) {
                        intersectingNodes.push(node);
                    }
                }
            }

            if (intersectingNodes.length === 0) {
                return 0; // 衝突なし
            }

            // ノードの右側に移動（最も右にあるノード）
            const maxRight = Math.max(...intersectingNodes.map(n => n.right));
            const offset = maxRight + collisionPadding - x;

            if (window.DEBUG_CONNECTIONS) {
                console.log('Node collision: edge=' + edgeFrom + '->' + edgeTo +
                    ', intersecting=' + intersectingNodes.map(n => n.id).join(',') +
                    ', offset=' + offset);
            }

            return offset;
        }

        // ラベルを避けるためのX座標オフセットを計算
        function calculateLabelAvoidanceOffset(x, y1, y2, labelBounds, edgeFrom, edgeTo) {
            const yMin = Math.min(y1, y2);
            const yMax = Math.max(y1, y2);
            const collisionPadding = 15; // ラベルとの最小距離

            // この経路と交差するラベルを見つける
            const intersectingLabels = [];
            for (const label of labelBounds) {
                // 垂直線のX座標がラベルの範囲内にあるかチェック
                if (x >= label.left - collisionPadding && x <= label.right + collisionPadding) {
                    // 垂直線のY範囲がラベルと重なるかチェック
                    if (!(yMax < label.top - collisionPadding || yMin > label.bottom + collisionPadding)) {
                        intersectingLabels.push(label);
                    }
                }
            }

            if (intersectingLabels.length === 0) {
                return 0; // 衝突なし
            }

            // ラベルの右側に移動（最も右にあるラベル）
            const maxRight = Math.max(...intersectingLabels.map(l => l.right));
            const offset = maxRight + collisionPadding - x;

            if (window.DEBUG_CONNECTIONS) {
                console.log('Label collision: edge=' + edgeFrom + '->' + edgeTo +
                    ', intersecting=' + intersectingLabels.length +
                    ', offset=' + offset);
            }

            return offset;
        }
    `;
}

module.exports = {
    getCollisionDetector
};
