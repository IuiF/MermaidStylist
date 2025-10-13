# エッジルーティング高度化 - 実装計画

## 目的

既存の複雑なエッジルーティングロジックをV2システム（core/layout/edge-router.js）に移植する。

## 現状分析

### 現在のV2 edge-router.js
- 基本的な3セグメント（水平-垂直-水平）ルーティング
- 1:1水平エッジの検出
- 約58行

### 既存システム（connections/renderer.js + 関連モジュール）
- 約60KB、10ファイル以上
- 高度な機能:
  1. 垂直セグメントX座標の動的計算（ノード/ラベル回避）
  2. Y座標調整（ノード衝突回避）
  3. 2本目の垂直セグメント（衝突回避用）
  4. エッジ交差検出とジャンプアーク生成
  5. カーブ処理

## 依存関係マップ

```
renderer.js (メイン)
├── vertical-segment-calculator.js
│   ├── edge-spacing-calculator.js
│   ├── depth-utils.js
│   └── utils.js (connectionUtils)
├── edge-crossing-detector.js
│   └── utils.js
├── path-y-adjuster.js
│   └── utils.js
├── path-generator.js
│   └── collision-utils.js
├── collectors.js (edgeInfoCollector)
└── labels.js

共通モジュール:
- constants.js
- utils.js (connectionUtils)
- depth-utils.js (depthCalculator)
```

## 段階的実装計画

### フェーズ1: 基盤整備（1-2日）
- [ ] types.jsにEdgeRoute関連の型を追加
  - `Segment`型の拡張（curve, arcパラメータ）
  - `EdgeLayoutData`型の定義
- [ ] 共通ユーティリティの移植
  - connectionUtils（エッジキー生成、深さ計算等）
  - 基本的なノード情報取得

### フェーズ2: 垂直セグメント計算（2-3日）
- [ ] edge-spacing-calculator.jsの移植
  - 等間隔配置計算
  - 長距離エッジのカウント
- [ ] depth-utils.jsの移植
  - 深さ境界の計算
  - 深さごとのグルーピング
- [ ] vertical-segment-calculator.jsのコア機能移植
  - 親ごとの垂直セグメントX座標計算
  - クラスタリングロジック
  - 衝突回避オフセット計算

### フェーズ3: Y座標調整（1-2日）
- [ ] path-y-adjuster.jsの移植
  - 初期セグメントY調整
  - 最終セグメントY調整（ノード衝突回避）
- [ ] collision-utils.jsの移植
  - 2本目の垂直セグメント計算

### フェーズ4: エッジ交差検出（2-3日）
- [ ] edge-crossing-detector.jsの移植
  - 交差検出アルゴリズム
  - ジャンプアーク座標計算
  - セグメント分割ロジック

### フェーズ5: パス生成（1-2日）
- [ ] path-generator.jsの移植
  - カーブパス生成
  - ジャンプアーク描画
  - SVGパス文字列生成

### フェーズ6: 統合とテスト（2-3日）
- [ ] layout-engine.jsへの統合
- [ ] LayoutResultへのedgeRoutes格納
- [ ] 既存システムとの動作比較
- [ ] パフォーマンス測定
- [ ] バグ修正

## 合計見積もり: 9-15日

## リスク

1. **複雑性**: 約60KBのコードの理解と移植
2. **依存関係**: 10以上のモジュールの相互依存
3. **テスト**: すべてのエッジケースの検証
4. **後方互換性**: 既存の動作を維持

## 代替案

### オプションA: 段階的移行（推奨）
- Phase 1のみ実装し、効果を検証
- 必要に応じて次のPhaseに進む
- 既存システムと並行運用

### オプションB: 現状維持
- V2レイアウトシステムと既存エッジ描画の連携は既に動作
- エッジルーティングの移植は長期タスクとして保留
- より優先度の高いタスクに注力

## 現在の状態

- **開始日**: 2025-10-13
- **現在のフェーズ**: フェーズ0 - 計画立案完了
- **次のアクション**: フェーズ1の開始判断
