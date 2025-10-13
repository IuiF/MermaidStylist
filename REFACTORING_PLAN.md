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

- [ ] test-complex-ultimate.mmdが正しく表示される
- [ ] B2→E3問題が解決している
- [ ] すべての衝突回避が機能している
- [ ] 折りたたみ・展開が動作する
- [ ] ハイライト機能が動作する
- [ ] 既存機能がすべて動作する
- [ ] コード行数が削減されている
- [ ] グローバル変数が削減されている
