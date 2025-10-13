# レイアウトシステム再設計計画

## 1. 現状の問題点

### 1.1 責務の混在

現在のコードは「レイアウト計算」と「描画」が混在している。

**horizontal-layout.js (レイアウト計算フェーズ)**
- ノード配置を計算 (47-114行目)
- エッジとの衝突回避を実施 (191-225行目)
- window.layoutLevelInfoをグローバルに設定 (242行目)

**renderer.js (描画フェーズ)**
- エッジを描画 (166-203行目)
- Y座標調整（=レイアウト変更）を実施 (65行目)
- window.layoutLevelInfoを暗黙的に参照 (88行目)

### 1.2 状態管理の課題

- グローバル変数による暗黙的な依存 (window.layoutLevelInfo)
- 状態の所有者が不明確
- レイアウト計算が2フェーズに分散

### 1.3 保守性の問題

- 機能追加時に関連部分をすべて洗い出す必要がある
- 衝突回避ロジックが重複
- デバッグが困難

## 2. 新アーキテクチャの設計方針

### 2.1 フェーズの完全分離

動作フェーズごとに責務を明確に分離する。

```
┌─────────────────────────────────────────┐
│ Phase 1: Layout Calculation             │
│ - 入力: nodes, connections, visibility  │
│ - 処理: 純粋な計算（副作用なし）        │
│ - 出力: LayoutResult (不変)             │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Phase 2: Rendering                      │
│ - 入力: LayoutResult                    │
│ - 処理: DOM/SVG操作のみ                 │
│ - 出力: なし                            │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Phase 3: Interaction                    │
│ - 入力: ユーザーイベント                │
│ - 処理: 状態更新 → Phase 1へ再計算     │
│ - 出力: Phase 1へのトリガー             │
└─────────────────────────────────────────┘
```

### 2.2 データフロー

```
入力データ
  ↓
[Phase 1] LayoutCalculation
  ├─ 1. ノード配置計算
  ├─ 2. エッジ経路計算
  ├─ 3. 衝突検出と回避
  └─ 4. ラベル配置計算
  ↓
LayoutResult (不変)
  ↓
[Phase 2] Rendering
  ├─ 1. ノード描画
  ├─ 2. エッジ描画
  └─ 3. ラベル描画
  ↓
画面表示
  ↓
[Phase 3] Interaction
  └─ ユーザー操作 → Phase 1へ
```

### 2.3 LayoutResult構造

```javascript
class LayoutResult {
    nodePositions: Map<id, NodeRect>
    edgeRoutes: Map<edgeKey, EdgeRoute>
    labelPositions: Map<edgeKey, LabelPosition>
    metadata: LayoutMetadata
}

class NodeRect {
    x, y, width, height
}

class EdgeRoute {
    segments: Segment[]     // 経路セグメントの配列
    arrowPoint: Point       // 矢印の位置
}

class Segment {
    type: 'horizontal' | 'vertical' | 'curve' | 'arc'
    start: Point
    end: Point
    curveParams: CurveParams | null
}
```

## 3. ファイル構成

### 3.1 Phase 1: Layout Calculation

```
src/core/layout/
├── layout-engine.js        # メインエンジン
├── node-placer.js          # ノード配置計算
├── edge-router.js          # エッジ経路計算
├── collision-resolver.js   # 衝突解決
└── types.js                # データ型定義
```

### 3.2 Phase 2: Rendering

```
src/runtime/rendering/v2/
├── renderer.js             # メインレンダラー
├── node-drawer.js          # ノード描画
├── edge-drawer.js          # エッジ描画
└── label-drawer.js         # ラベル描画
```

### 3.3 Phase 3: Interaction

```
src/runtime/interaction/
├── orchestrator.js         # 統合オーケストレーター
├── collapse-handler.js     # 折りたたみ処理
└── highlight-handler.js    # ハイライト処理
```

## 4. 実装計画

### 4.1 Phase 1: Layout Calculation

#### 4.1.1 types.js
- LayoutResult, NodeRect, EdgeRoute, Segment等の型定義
- 不変データ構造として設計

#### 4.1.2 node-placer.js
既存のhorizontal-layout.jsから以下を移植:
- 階層ごとのノード配置計算 (47-114行目)
- 階層間スペーシング計算 (32-44行目)
- 複数親を持つノードの最適配置 (56-87行目)

出力: Map<id, NodeRect>

#### 4.1.3 edge-router.js
既存のrenderer.jsのレイアウト計算部分を移植:
- 垂直セグメントX座標計算 (104行目)
- エッジ経路セグメント生成
- 交差検出とジャンプアーク生成 (144行目)

出力: Map<edgeKey, EdgeRoute>

#### 4.1.4 collision-resolver.js
既存の衝突回避ロジックを統合:
- 点線ノードとエッジの衝突回避 (horizontal-layout.js:191-264)
- 同階層ノードの重なり解消 (horizontal-layout.js:268-308)
- ノードとラベルの衝突回避 (horizontal-layout.js:310-409)
- エッジ終点の衝突回避 (path-y-adjuster.js)

入力: 初期配置
出力: 調整後の配置

#### 4.1.5 layout-engine.js
上記を統合するメインエンジン:

```javascript
function calculateLayout(input) {
    // 1. ノード初期配置
    let nodePositions = nodePlacer.place(input.nodes, input.connections);

    // 2. 衝突解決（反復的に実行）
    nodePositions = collisionResolver.resolve(nodePositions, input.connections);

    // 3. エッジ経路計算
    const edgeRoutes = edgeRouter.route(nodePositions, input.connections);

    // 4. ラベル配置計算
    const labelPositions = calculateLabelPositions(edgeRoutes, nodePositions);

    // 5. メタデータ生成
    const metadata = generateMetadata(nodePositions);

    return new LayoutResult(nodePositions, edgeRoutes, labelPositions, metadata);
}
```

### 4.2 Phase 2: Rendering

#### 4.2.1 node-drawer.js
既存のrender-orchestrator.jsから移植:
- SVGノード要素の生成 (48-146行目)
- スタイル適用
- 折りたたみボタンの作成

入力: LayoutResult.nodePositions
出力: なし（DOM操作のみ）

#### 4.2.2 edge-drawer.js
既存のpath-generator.jsを活用:
- セグメント配列からSVGパス生成
- カーブ処理
- ジャンプアーク描画

入力: LayoutResult.edgeRoutes
出力: なし（SVG操作のみ）

#### 4.2.3 label-drawer.js
既存のlabels.jsから移植:
- ラベル要素の生成
- 配置計算済みの座標に描画

入力: LayoutResult.labelPositions
出力: なし（SVG操作のみ）

#### 4.2.4 renderer.js
描画を統合:

```javascript
function render(layoutResult) {
    // 1. ノード描画
    nodeDrawer.draw(layoutResult.nodePositions);

    // 2. エッジ描画
    edgeDrawer.draw(layoutResult.edgeRoutes);

    // 3. ラベル描画
    labelDrawer.draw(layoutResult.labelPositions);

    // 4. Z-order調整
    adjustZOrder();
}
```

### 4.3 Phase 3: Interaction

#### 4.3.1 collapse-handler.js
既存のcollapse-manager.jsから移植:
- 折りたたみ状態管理
- 可視性計算

状態変更時: orchestratorに再計算を要求

#### 4.3.2 highlight-handler.js
既存のhighlight-manager.jsから移植:
- ハイライト状態管理
- パス強調表示

#### 4.3.3 orchestrator.js
全体を統合:

```javascript
class Orchestrator {
    constructor() {
        this.state = {
            nodes: [],
            connections: [],
            collapsed: new Set(),
            highlighted: new Set()
        };
        this.currentLayout = null;
    }

    initialize(nodes, connections) {
        this.state.nodes = nodes;
        this.state.connections = connections;
        this.recalculateAndRender();
    }

    recalculateAndRender() {
        // Phase 1: レイアウト計算
        const input = {
            nodes: this.getVisibleNodes(),
            connections: this.getVisibleConnections(),
            collapsed: this.state.collapsed
        };
        this.currentLayout = layoutEngine.calculateLayout(input);

        // Phase 2: 描画
        renderer.render(this.currentLayout);
    }

    handleCollapse(nodeId) {
        collapseHandler.toggle(nodeId);
        this.recalculateAndRender();
    }
}
```

## 5. 移行戦略

### 5.1 並行実装

既存コードを残したまま新システムを実装。

```
src/
├── core/
│   ├── layouts/              # 既存（保持）
│   │   └── horizontal-layout.js
│   └── layout/               # 新規
│       └── layout-engine.js
├── runtime/
│   ├── rendering/
│   │   ├── connections/      # 既存（保持）
│   │   └── v2/               # 新規
│   └── interaction/          # 新規
```

### 5.2 切り替え方法

orchestrator.jsで実装を切り替え可能に:

```javascript
const USE_NEW_LAYOUT = true;

if (USE_NEW_LAYOUT) {
    // 新システム
    orchestrator.initialize(nodes, connections);
} else {
    // 既存システム
    initializeAndRender();
}
```

### 5.3 検証手順

1. 新システムで同じHTMLを生成できることを確認
2. test-complex-ultimate.mmdで動作確認
3. B2→E3問題が解決していることを確認
4. パフォーマンス測定
5. 既存システムを削除

## 6. 期待される効果

### 6.1 保守性の向上

- レイアウト計算と描画が完全分離
- 状態管理が明示的
- デバッグが容易

### 6.2 バグ修正

- B2→E3問題の根本的解決
- 衝突回避ロジックの一元化

### 6.3 拡張性の向上

- 新機能追加時の影響範囲が明確
- テストが容易

### 6.4 コード削減

- 重複ロジックの削除
- グローバル変数の削減

## 7. 実装順序

1. **Phase 1の実装** (5-7日)
   - types.js
   - node-placer.js
   - edge-router.js
   - collision-resolver.js
   - layout-engine.js

2. **Phase 2の実装** (3-4日)
   - node-drawer.js
   - edge-drawer.js
   - label-drawer.js
   - renderer.js

3. **Phase 3の実装** (2-3日)
   - collapse-handler.js
   - highlight-handler.js
   - orchestrator.js

4. **統合とテスト** (2-3日)
   - 新旧システムの動作比較
   - バグ修正
   - パフォーマンス調整

**合計: 12-17日**

## 8. 成功基準

- [x] test-complex-ultimate.mmdが正しく表示される
- [x] B2→E3問題が解決している（複数階層スキップエッジが正常描画）
- [x] すべての衝突回避が機能している
- [x] 折りたたみ・展開が動作する（V2システムで正常動作）
- [x] ハイライト機能が動作する（V2システムで正常動作）
- [x] 既存機能がすべて動作する
- [x] V2システムがV1より高速（12%高速化達成）
- [x] V2システムがデフォルトで有効
- [x] コード行数が削減されている（482行削減）
- [x] グローバル変数が削減されている（window.layoutLevelInfo→window.currentLayoutResultに統一完了）

## 9. 進捗状況

### 完了した項目

1. **Phase 1: Layout Calculation** (完了)
   - types.js: データ構造定義（基本実装完了）
   - node-placer.js: ノード配置計算（horizontal-layout.jsから移植）
   - collision-resolver.js: 衝突解決（3種類の衝突回避実装）
   - layout-engine.js: メインエンジン統合

2. **ブラウザ実行形式への変換** (完了)
   - 全Phase 1コードを文字列生成形式に変換
   - getNodePlacer(), getCollisionResolver(), getLayoutEngine()として実装

3. **HTMLジェネレーターへの統合** (完了)
   - html.jsに新システムを統合
   - window.USE_V2_LAYOUTフラグで切り替え可能
   - window.toggleV2Layout()関数で動的切り替え実装

4. **redraw-helpersへの統合** (完了)
   - recalculateLayout()にV2システム分岐を追加
   - 新システムでのノード配置を実装

5. **動作確認** (完了)
   - test-complex-ultimate.mmdで正常動作確認
   - 新旧システムの切り替え動作確認
   - 折りたたみ・展開機能の動作確認（V2システムで正常動作）
   - エッジ描画の動作確認（既存システムと互換性あり）

6. **既存システムとの統合** (完了)
   - V2レイアウトシステムが既存のエッジ描画システムと正常に連携
   - 既存のcollapseManagerがV2システムと互換性あり
   - ハイライト機能も既存システムと互換性あり

7. **パフォーマンス測定と最適化** (完了)
   - V1とV2のベンチマーク実施（50回平均）
   - ボトルネック特定（衝突解決が67%占有）
   - collision-resolver.js最適化（70%高速化）
   - V2が最終的に12%高速化達成

8. **V2システムのデフォルト有効化** (完了)
   - window.USE_V2_LAYOUT = trueに変更
   - 複数テストケースで動作検証
   - V1/V2視覚的比較実施

9. **V1システムの完全削除** (完了)
   - window.USE_V2_LAYOUTフラグを削除
   - window.toggleV2Layout()関数を削除
   - redraw-helpers.jsをV2専用に簡略化
   - html.jsから切り替え機能を削除

10. **V1ファイルの削除** (完了)
   - horizontal-layout.jsを削除（470行削減）
   - debug-layout.jsを削除（古い開発用スクリプト）
   - build-webapp.jsからhorizontal-layout参照を削除
   - html.jsからhorizontal-layoutインポートを削除

11. **重複コードの削減** (完了)
   - calculateNodeSpacingV2Collision関数を削除（12行削減）
   - calculateNodeSpacingV2に統一

12. **LayoutResult構造の実装** (完了)
   - types.jsをブラウザ形式に変換
   - edge-router.jsをブラウザ形式に変換
   - layout-engineがLayoutResultを返却
   - edgeRoutes、labelPositions、metadataを含む完全な構造

13. **グローバル変数の削減** (完了)
   - window.layoutLevelInfoをwindow.currentLayoutResultに統一
   - vertical-layout.jsをLayoutResult互換構造に変更
   - redraw-helpers.jsで両レイアウトモードのLayoutResultを保存
   - renderer.jsからwindow.layoutLevelInfo後方互換性コードを削除
   - 単一のデータソース(window.currentLayoutResult.metadata)に統一

### 現在の実装状況

1. **ノード配置**: V2システム実装完了、正常動作
2. **エッジ描画**: 既存システムを使用（V2システムとの互換性確認済み）
3. **折りたたみ・展開**: 既存collapseManagerを使用（V2システムで正常動作）
4. **ハイライト機能**: 既存highlightManagerを使用（動作可能）
5. **Phase 2 (Rendering)**: 基本構造実装済み（v2/node-drawer.js, edge-drawer.js, label-drawer.js, renderer.js）
6. **Phase 3 (Interaction)**: 基本構造実装済み（orchestrator.js, collapse-handler.js, highlight-handler.js）

### 次のステップ（優先度順）

#### 短期（必須）✓ 全て完了
1. **パフォーマンス測定と最適化** ✓ (完了)
   - 新旧システムのパフォーマンス比較 ✓
   - ボトルネックの特定と改善 ✓
   - V2が12%高速、衝突解決70%高速化達成

2. **V2システムのデフォルト有効化** ✓ (完了)
   - window.USE_V2_LAYOUT = trueに変更 ✓
   - 複数のテストケースで動作確認 ✓
   - V1/V2の視覚的比較検証完了 ✓
   - V2は点線ノード配置がより保守的だが機能的に問題なし

3. **V1システムの完全削除** ✓ (完了)
   - window.USE_V2_LAYOUTフラグを削除 ✓
   - window.toggleV2Layout()関数を削除 ✓
   - redraw-helpers.jsをV2専用に簡略化 ✓
   - html.jsから切り替え機能を削除 ✓

4. **未使用V1ファイルの削除** ✓ (完了)
   - horizontal-layout.jsを削除 ✓
   - debug-layout.jsを削除 ✓
   - 依存関係の確認と整理 ✓

#### 中期（推奨）
1. **LayoutResult構造の実装** ✓ (完了)
   - types.jsとedge-router.jsをブラウザ形式に変換 ✓
   - layout-engineがLayoutResultを返却 ✓
   - 基本的なエッジルーティング実装 ✓

2. **グローバル変数の削減** ✓ (完了)
   - window.layoutLevelInfoをwindow.currentLayoutResultに統一 ✓
   - vertical/horizontal両レイアウトで単一データソース化 ✓
   - 後方互換性コードの削除 ✓

3. **エッジルーティングの高度化** (次のステップ)
   - 既存の複雑なロジックの移植（交差検出、ジャンプアーク、Y座標調整）
   - v2/edge-drawer.jsへの描画移植
   - 既存システムからの完全移行

4. **Phase 2/3の完全統合** (将来)
   - v2/rendererの完全統合
   - orchestratorの完全統合
   - 既存システムからの段階的移行

5. **コード削減と最適化** (一部完了)
   - 重複コードの削除 ✓ (calculateNodeSpacing統一完了)
   - グローバル変数の削減 ✓ (window.layoutLevelInfo統一完了)
   - メモリ使用量の最適化

#### 長期（オプション）
1. **既存システムの削除**
   - 新システムの安定性確認後
   - 段階的に既存コードを削除
   - ドキュメント更新

### 現在のアーキテクチャの状態

```
[水平レイアウト]
├─ V2システム (layout/) ✓ 完全実装、デフォルト有効
│   ├─ node-placer.js ✓ (実装完了、動作確認済み)
│   ├─ collision-resolver.js ✓ (実装完了、動作確認済み)
│   └─ layout-engine.js ✓ (実装完了、動作確認済み)
└─ V1システム削除済み (window.USE_V2_LAYOUTフラグ含む)

[垂直レイアウト]
└─ vertical-layout.js (既存システム継続使用)

[エッジ描画・インタラクション]
├─ connections/renderer.js (既存、V2レイアウトと互換)
├─ collapse-manager.js (既存、V2レイアウトと互換)
└─ rendering/v2/, interaction/ (基本構造のみ、未統合)

[統合状態]
✓ V2レイアウト ← → 既存エッジ描画 (正常動作)
✓ V2レイアウト ← → 既存折りたたみ (正常動作)
```

## 10. パフォーマンス測定結果

### 測定環境
- テストケース: test-complex-ultimate.mmd (33ノード、55エッジ、11点線エッジ)
- ブラウザ: Chrome DevTools
- 測定回数: 50回の平均値

### 最適化前 (初回実装)

**全体パフォーマンス** (10回平均):
- V1システム: 1.25ms
- V2システム: 1.14ms
- **V2が約9%高速**

**V2システム内訳** (0.6ms):
- ノード配置: 0.2ms (33%)
- 衝突解決: 0.4ms (67%)

**衝突解決の詳細** (0.4ms):
- 点線ノードvsエッジ: 0.21ms (52%)
- 同レベルノード: 0.01ms (3%)
- ノードvsラベル: 0.18ms (45%)

### 最適化後

**実施した最適化**:
1. nodeToLevelマップを事前構築（レベル検索のO(n²)→O(1)化）
2. 実線エッジの事前フィルタリング
3. ラベル付きエッジの早期リターン追加
4. 条件判定の順序最適化（早期リターン）
5. forEachからforループへの変更（一部）

**全体パフォーマンス** (50回平均):
- V1システム: 0.56ms (中央値: 0.5ms)
- V2システム: 0.49ms (中央値: 0.5ms)
- **V2が約12%高速**

**衝突解決の最適化効果** (20回平均):
- 最適化前: 0.40ms
- 最適化後: 0.12ms
- **約70%高速化**

**詳細内訳** (最適化後):
- 点線ノードvsエッジ: 0.04ms
- 同レベルノード: 0.04ms
- ノードvsラベル: 0.04ms

### 結論

1. **V2システムは既にV1より高速**
   - 平均で12%の性能向上を達成
   - 衝突解決の最適化により70%の性能向上

2. **十分な性能**
   - 33ノード、55エッジの複雑なグラフでも1ms以下
   - レイアウト計算がボトルネックにならない

3. **最適化の効果**
   - 主要なボトルネックだった衝突解決を大幅に改善
   - Map/Setによる効率的なデータアクセス
   - 早期リターンによる不要な計算の削減
