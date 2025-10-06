function getDepthCalculator() {
    return `
        // 階層情報計算モジュール

        const depthCalculator = {
            /**
             * 階層ごとの親の右端と子の左端を計算
             * @param {Array} edgeInfos - エッジ情報の配列
             * @param {Object} levelInfo - レイアウトから提供される階層情報
             * @returns {Object} depthMaxParentRightとdepthMinChildLeftのオブジェクト
             */
            calculateDepthBounds: function(edgeInfos, levelInfo) {
                const levelXPositions = levelInfo.levelXPositions || [];
                const levelMaxWidths = levelInfo.levelMaxWidths || [];

                const depthMaxParentRight = {}; // depth -> max(parentRight)
                const depthMinChildLeft = {}; // depth -> min(childLeft)

                edgeInfos.forEach(info => {
                    // 真横の1:1のみレーン計算から除外
                    if (info.is1to1Horizontal) return;

                    const depth = info.depth;

                    // 階層情報がある場合は、その階層の最大ノード幅を使用
                    if (levelXPositions[depth] !== undefined && levelMaxWidths[depth] !== undefined) {
                        const levelMaxRight = levelXPositions[depth] + levelMaxWidths[depth];
                        depthMaxParentRight[depth] = levelMaxRight;
                    } else {
                        // フォールバック: 実際のエッジの開始位置から計算
                        if (!depthMaxParentRight[depth] || info.x1 > depthMaxParentRight[depth]) {
                            depthMaxParentRight[depth] = info.x1;
                        }
                    }

                    // 次の階層の左端
                    const nextDepth = depth + 1;
                    if (levelXPositions[nextDepth] !== undefined) {
                        if (!depthMinChildLeft[depth] || levelXPositions[nextDepth] < depthMinChildLeft[depth]) {
                            depthMinChildLeft[depth] = levelXPositions[nextDepth];
                        }
                    } else {
                        // フォールバック: 実際のエッジの終了位置から計算
                        if (!depthMinChildLeft[depth] || info.x2 < depthMinChildLeft[depth]) {
                            depthMinChildLeft[depth] = info.x2;
                        }
                    }
                });

                return {
                    depthMaxParentRight: depthMaxParentRight,
                    depthMinChildLeft: depthMinChildLeft
                };
            }
        };
    `;
}

module.exports = {
    getDepthCalculator
};
