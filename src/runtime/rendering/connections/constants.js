function getConnectionConstants() {
    return `
        // エッジ描画に関する定数を統一管理
        const CONNECTION_CONSTANTS = {
            // 衝突検出用のパディング
            COLLISION_PADDING_NODE: 40,      // ノードとの最小距離
            COLLISION_PADDING_LABEL: 15,     // ラベルとの最小距離

            // ラベル関連
            LABEL_PADDING: 4,                // ラベル内の余白
            LABEL_VERTICAL_SPACING: 3,       // ラベル間の縦方向スペース

            // 垂直セグメント配置
            MIN_OFFSET: 30,                  // ノード右端からの最小オフセット
            LANE_WIDTH: 20,                  // レーン幅の基準値

            // カーブパス
            CURVE_CONTROL_RATIO: 0.5         // ベジェ曲線の制御点比率
        };
    `;
}

module.exports = {
    getConnectionConstants
};
