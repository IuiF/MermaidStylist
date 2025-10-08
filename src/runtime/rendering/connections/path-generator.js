function getPathGenerator() {
    return `
        // SVGパス生成モジュール

        const pathGenerator = {
            /**
             * カーブ付き複雑パスを生成
             * @param {Object} points - 制御点オブジェクト { p1, p2, p3, p4, end }
             * @param {number} cornerRadius - コーナー半径
             * @returns {string} SVGパス文字列
             */
            generateCurvedPath: function(points, cornerRadius) {
                const { p1, p2, p3, p4, end } = points;

                // Y座標調整が必要かチェック
                const hasInitialYAdjustment = Math.abs(p2.y - p1.y) > 1;
                const needsFinalVertical = Math.abs(p3.y - p4.y) > 1;
                const canCurveFinalVertical = needsFinalVertical && Math.abs(p3.y - p4.y) > cornerRadius * 2;

                // 初期Y調整がある場合
                if (hasInitialYAdjustment) {
                    return this._generatePathWithInitialAdjustment(
                        p1, p2, p3, p4, end,
                        cornerRadius,
                        needsFinalVertical,
                        canCurveFinalVertical
                    );
                }

                // 通常のパス（Y調整なし）
                return this._generateNormalPath(
                    p1, p2, p3, p4, end,
                    cornerRadius,
                    needsFinalVertical,
                    canCurveFinalVertical
                );
            },

            /**
             * 初期Y調整ありのパスを生成
             */
            _generatePathWithInitialAdjustment: function(p1, p2, p3, p4, end, cornerRadius, needsFinalVertical, canCurveFinalVertical) {
                const shortHorizontal = p2.x;
                const canCurveVertical = Math.abs(p3.y - p2.y) > cornerRadius * 2;

                if (canCurveVertical) {
                    const basePath = this._generateInitialCurvedSegment(p1, p2, p3, cornerRadius);
                    return this._appendFinalSegment(basePath, p3, p4, end, cornerRadius, needsFinalVertical, canCurveFinalVertical);
                } else {
                    // 垂直距離が短い場合は直線
                    return this._generateInitialStraightSegment(p1, p2, p3, p4, end, shortHorizontal, needsFinalVertical);
                }
            },

            /**
             * 通常パス（Y調整なし）を生成
             */
            _generateNormalPath: function(p1, p2, p3, p4, end, cornerRadius, needsFinalVertical, canCurveFinalVertical) {
                const canCurveVertical = Math.abs(p3.y - p2.y) > cornerRadius * 2;

                if (canCurveVertical) {
                    const basePath = this._generateNormalCurvedSegment(p1, p2, p3, cornerRadius);
                    return this._appendFinalSegment(basePath, p3, p4, end, cornerRadius, needsFinalVertical, canCurveFinalVertical);
                } else {
                    // 垂直距離が短い場合は直線
                    return this._generateNormalStraightSegment(p1, p2, p3, p4, end, needsFinalVertical);
                }
            },

            /**
             * 初期カーブセグメント生成（Y調整あり）
             */
            _generateInitialCurvedSegment: function(p1, p2, p3, r) {
                const shortHorizontal = p2.x;

                if (p3.y > p2.y) {
                    // 下向き
                    return \`M \${p1.x} \${p1.y} L \${shortHorizontal} \${p1.y} L \${shortHorizontal} \${p2.y} L \${p2.x - r} \${p2.y} Q \${p2.x} \${p2.y} \${p2.x} \${p2.y + r} L \${p3.x} \${p3.y - r} Q \${p3.x} \${p3.y} \${p3.x + r} \${p3.y}\`;
                } else {
                    // 上向き
                    return \`M \${p1.x} \${p1.y} L \${shortHorizontal} \${p1.y} L \${shortHorizontal} \${p2.y} L \${p2.x - r} \${p2.y} Q \${p2.x} \${p2.y} \${p2.x} \${p2.y - r} L \${p3.x} \${p3.y + r} Q \${p3.x} \${p3.y} \${p3.x + r} \${p3.y}\`;
                }
            },

            /**
             * 通常カーブセグメント生成（Y調整なし）
             */
            _generateNormalCurvedSegment: function(p1, p2, p3, r) {
                if (p3.y > p2.y) {
                    // 下向き
                    return \`M \${p1.x} \${p1.y} L \${p2.x - r} \${p2.y} Q \${p2.x} \${p2.y} \${p2.x} \${p2.y + r} L \${p3.x} \${p3.y - r} Q \${p3.x} \${p3.y} \${p3.x + r} \${p3.y}\`;
                } else {
                    // 上向き
                    return \`M \${p1.x} \${p1.y} L \${p2.x - r} \${p2.y} Q \${p2.x} \${p2.y} \${p2.x} \${p2.y - r} L \${p3.x} \${p3.y + r} Q \${p3.x} \${p3.y} \${p3.x + r} \${p3.y}\`;
                }
            },

            /**
             * 最終セグメント追加
             */
            _appendFinalSegment: function(basePath, p3, p4, end, r, needsFinalVertical, canCurveFinalVertical) {
                // p4yとend.yが異なる場合は最終垂直調整が必要
                const needsFinalYAdjustment = Math.abs(p4.y - end.y) > 0.1;
                const finalHorizontal = needsFinalYAdjustment ? \`L \${end.x} \${p4.y} L \${end.x} \${end.y}\` : \`L \${end.x} \${end.y}\`;

                if (canCurveFinalVertical) {
                    // 最終垂直セグメントをカーブで描画
                    if (p3.y > p4.y) {
                        return \`\${basePath} L \${p4.x - r} \${p3.y} Q \${p4.x} \${p3.y} \${p4.x} \${p3.y - r} L \${p4.x} \${p4.y + r} Q \${p4.x} \${p4.y} \${p4.x + r} \${p4.y} \${finalHorizontal}\`;
                    } else {
                        return \`\${basePath} L \${p4.x - r} \${p3.y} Q \${p4.x} \${p3.y} \${p4.x} \${p3.y + r} L \${p4.x} \${p4.y - r} Q \${p4.x} \${p4.y} \${p4.x + r} \${p4.y} \${finalHorizontal}\`;
                    }
                } else if (needsFinalVertical) {
                    // 最終垂直セグメントを直線で描画
                    return \`\${basePath} L \${p4.x} \${p3.y} L \${p4.x} \${p4.y} \${finalHorizontal}\`;
                } else {
                    // 最終垂直セグメント不要
                    return \`\${basePath} \${finalHorizontal}\`;
                }
            },

            /**
             * 初期直線セグメント生成（Y調整あり、垂直距離短い）
             */
            _generateInitialStraightSegment: function(p1, p2, p3, p4, end, shortHorizontal, needsFinalVertical) {
                const needsFinalYAdjustment = Math.abs(p4.y - end.y) > 0.1;
                const finalSegment = needsFinalYAdjustment ? \`L \${end.x} \${p4.y} L \${end.x} \${end.y}\` : \`L \${end.x} \${end.y}\`;

                if (needsFinalVertical) {
                    return \`M \${p1.x} \${p1.y} L \${shortHorizontal} \${p1.y} L \${shortHorizontal} \${p2.y} L \${p2.x} \${p2.y} L \${p3.x} \${p3.y} L \${p4.x} \${p3.y} L \${p4.x} \${p4.y} \${finalSegment}\`;
                } else {
                    return \`M \${p1.x} \${p1.y} L \${shortHorizontal} \${p1.y} L \${shortHorizontal} \${p2.y} L \${p2.x} \${p2.y} L \${p3.x} \${p3.y} \${finalSegment}\`;
                }
            },

            /**
             * 通常直線セグメント生成（Y調整なし、垂直距離短い）
             */
            _generateNormalStraightSegment: function(p1, p2, p3, p4, end, needsFinalVertical) {
                const needsFinalYAdjustment = Math.abs(p4.y - end.y) > 0.1;
                const finalSegment = needsFinalYAdjustment ? \`L \${end.x} \${p4.y} L \${end.x} \${end.y}\` : \`L \${end.x} \${end.y}\`;

                if (needsFinalVertical) {
                    return \`M \${p1.x} \${p1.y} L \${p2.x} \${p2.y} L \${p3.x} \${p3.y} L \${p4.x} \${p3.y} L \${p4.x} \${p4.y} \${finalSegment}\`;
                } else {
                    return \`M \${p1.x} \${p1.y} L \${p2.x} \${p2.y} L \${p3.x} \${p3.y} \${finalSegment}\`;
                }
            }
        };
    `;
}

module.exports = {
    getPathGenerator
};
