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
            DEFAULT_VERTICAL_OFFSET: 50,     // デフォルトの垂直セグメントオフセット

            // パス描画
            CORNER_RADIUS: 8,                // パスのコーナー半径
            EDGE_SPACING: 15                 // エッジ間のスペース
        };
    `;
}

module.exports = {
    getConnectionConstants
};
