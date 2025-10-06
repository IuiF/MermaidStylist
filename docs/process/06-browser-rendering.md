# プロセス6: ブラウザレンダリング

## 目的

生成されたHTMLファイルをブラウザで開いた際に実行される、描画とインタラクション処理のすべてを制御する。

## 実行開始

### エントリーポイント

**`window.onload`**イベントで描画プロセスが開始される。

```javascript
window.onload = function() {
    initializeAndRender();
};
```

HTML生成時にすべてのデータとモジュールが埋め込まれているため、外部リソースへのアクセスなしで完全に動作する。

---

## 描画プロセスの5つのフェーズ

`initializeAndRender()` 関数が以下の5つのフェーズを順序立てて実行する。

### フェーズ1: ノード作成

**実装:** `createSVGNodes()`

すべてのノード要素をSVGとして生成し、DOMに追加する。

**処理内容:**

1. **通常ノードの作成**
   - `nodes` 配列のすべてのノードを処理
   - 各ノードに対して `createSingleNode(node, false)` を呼び出し

2. **点線ノードの作成**
   - `dashedNodes` 配列のすべてのノードを処理
   - 各ノードに対して `createSingleNode(node, true)` を呼び出し

#### 単一ノード作成の詳細 (`createSingleNode`)

**1. グループ要素の作成**
```javascript
const g = svgHelpers.createGroup({
    id: node.id,
    class: isDashed ? 'node dashed-node' : 'node',
    'data-label': node.label,
    'data-has-children': hasChildren,
    'data-is-dashed': isDashed
});
```

**2. テキストサイズの測定**
```javascript
const textSize = svgHelpers.measureRichText(node.label, 12);
```

HTMLタグ（`<br>`など）を含むラベルのサイズを正確に測定。

**3. ノードサイズの計算**
```javascript
const padding = 12;
const buttonWidth = hasChildren ? 15 : 0;
const boxWidth = textSize.width + padding * 2 + buttonWidth;
const boxHeight = Math.max(28, textSize.height + padding);
```

**4. 背景矩形の作成**
```javascript
const rect = svgHelpers.createRect({
    class: isDashed ? 'node-rect dashed-rect' : 'node-rect',
    width: boxWidth,
    height: boxHeight,
    rx: 5,
    ry: 5
});
```

点線ノードの場合は `stroke-dasharray: '5,5'` と `opacity: 0.6` を適用。

**5. テキストの作成**
```javascript
const text = svgHelpers.createRichText(node.label, {
    class: 'node-text',
    x: padding,
    y: boxHeight / 2,
    'dominant-baseline': 'central',
    'font-size': '12'
});
```

**6. スタイルの適用**
```javascript
applyNodeStyle(rect, nodeId, node.classes);
```

クラス定義とインラインスタイルを適用。優先順位: クラスDef → インラインStyle

**7. 折りたたみボタンの追加**
```javascript
if (hasChildren) {
    const button = svgHelpers.createText('▼', {
        class: 'collapse-button',
        x: boxWidth - padding - 5,
        y: boxHeight / 2
    });
    g.appendChild(button);
}
```

**8. イベントリスナーの追加**

- **子を持つノード:** クリックで折りたたみ/展開
- **点線ノード:** クリックで元ノードを強調表示

**9. SVGレイヤーに追加**
```javascript
const svgLayer = svgHelpers.getSVGLayer();
svgLayer.appendChild(g);
```

---

### フェーズ2: マネージャー初期化

**実装:** `initializeManagers()`

各マネージャーの初期化処理を実行。

```javascript
function initializeManagers() {
    collapseManager.init();
    viewportManager.init();
    contextMenu.init();
}
```

#### 各マネージャーの役割

**1. collapseManager**
- 折りたたみ状態を管理
- 親子関係マップを構築
- 折りたたみ/展開時のレイアウト再計算

**2. viewportManager**
- ズーム・パン・ピンチ操作
- イベントリスナーの設定:
  - `wheel` - Ctrl+ホイールでズーム、ホイールでパン
  - `pointerdown/pointermove/pointerup` - ドラッグとピンチズーム
- トランスフォーム管理 (`scale`, `translateX`, `translateY`)

**3. contextMenu**
- 右クリックメニュー（未実装の場合あり）

---

### フェーズ3: レイアウト計算

**実装:** `computeLayout()`

ノードの座標を計算して配置する。

```javascript
function computeLayout() {
    const nodePositions = horizontalLayout(
        allNodes,
        allConnections,
        calculateAllNodeWidths,
        (n, c) => analyzeTreeStructure(n, c, dashedNodes)
    );

    debugActualWidths(nodes);

    return nodePositions;
}
```

初期レイアウトは **横方向レイアウト** (`horizontalLayout`)。

#### レイアウト計算の流れ

**1. ノード幅の測定**
```javascript
const nodeWidthMap = calculateAllNodeWidths(nodes);
```

すべてのノードの実際の幅を測定してマップに保存。

**2. 階層構造の解析**
```javascript
const treeStructure = analyzeTreeStructure(nodes, connections);
```

ルートノードから深さ優先探索を実行し、各ノードの階層レベルを決定。

**出力:**
```javascript
{
    levels: [
        [ルートノード],
        [第1階層のノード群],
        [第2階層のノード群],
        ...
    ],
    nodeDepths: Map { nodeId => depth }
}
```

**3. 各階層の最大ノード幅を計算**
```javascript
levelMaxWidths[levelIndex] = maxWidth;
```

各階層で最も幅の広いノードの幅を取得。

**4. 階層間のスペースを計算**
```javascript
const levelSpacings = [];
for (let i = 0; i < levels.length - 1; i++) {
    levelSpacings[i] = calculateLevelSpacing(fromLevel, toLevel, connections);
}
```

エッジラベルの数や複雑さに応じて動的に計算。

**5. 各階層のX座標を決定**
```javascript
levelXPositions[i] = levelXPositions[i - 1] + levelMaxWidths[i - 1] + spacing + edgeClearance;
```

**6. 各ノードのY座標を決定**

- **親ノードが1つの場合:** 親ノードの中央に配置
- **親ノードが複数の場合:** 最もY座標が小さくなる親を選択

**7. ノードをSVGに配置**
```javascript
element.setAttribute('transform', `translate(${x},${y})`);
```

---

### フェーズ4: エッジ描画

**実装:** `renderConnections(nodePositions)`

計算されたノード位置を使ってエッジとラベルを描画する。

```javascript
function renderConnections(nodePositions) {
    currentNodePositions = nodePositions;
    createCSSLines(allConnections, currentNodePositions);
}
```

#### エッジ描画の15モジュール連携

**`createCSSLines()` の処理フロー:**

1. **SVGレイヤーの初期化と消去**
   - `initializeAndClearSVGLayer()`

2. **ラベル描画**
   - `renderAllLabels(connections, svgLayer)`
   - 全エッジのラベルをSVGに配置

3. **エッジレイアウト計算**
   - `calculateEdgeLayout(connections, labelBounds)`
   - 以下のモジュールを順次実行:
     - `edge-info-collector.js` - エッジ情報収集
     - `depth-calculator.js` - 深度計算
     - `collision-detector.js` - 衝突検出（純粋関数）
     - `bounds-collector.js` - ノード座標収集（DOM依存）
     - `edge-spacing-calculator.js` - エッジ間隔計算
     - `depth-offset-aggregator.js` - オフセット集約
     - `path-y-adjuster.js` - Y座標調整
     - `vertical-segment-calculator.js` - 垂直セグメント計算
     - `final-vertical-calculator.js` - 最終垂直座標
     - `path-generator.js` - パス生成

4. **各エッジの描画**
   - `renderSingleEdge()` を各エッジに対して実行
   - `arrows.js` - 矢印描画
   - SVGパスとして描画

5. **ラベルのZ-order調整**
   - `finalizeLabels(svgLayer)`
   - ラベルを最前面に移動

---

### フェーズ5: 最終調整

**実装:** `applyFinalAdjustments()`

描画完了後の最終調整を行う。

```javascript
function applyFinalAdjustments() {
    // ルートノードを最前面に移動
    bringRootNodesToFront();

    // コンテンツ全体が見えるように初期位置を調整
    requestAnimationFrame(() => {
        viewportManager.fitToContent();
    });
}
```

#### ルートノードのZ-order調整

```javascript
function bringRootNodesToFront() {
    const svgLayer = svgHelpers.getNodeLayer();
    nodes.forEach(node => {
        const isRoot = !connections.some(conn => conn.to === node.id);
        if (isRoot) {
            const element = document.getElementById(node.id);
            svgLayer.appendChild(element);  // 最後に追加 = 最前面
        }
    });
}
```

#### ビューポート初期調整

`viewportManager.fitToContent()` で以下を実行:

1. **コンテンツ境界の計算**
   - すべてのノードのbboxを取得
   - `minX`, `minY`, `maxX`, `maxY` を計算

2. **初期位置の決定**
   - `translateX = 50 - minX`
   - `translateY = 50 - minY`
   - `scale = 1.0`

3. **トランスフォームの適用**
   - SVGレイヤーに `transform` 属性を設定

---

## インタラクティブ機能

描画完了後、ユーザー操作に応じて動的に更新される。

### 1. ボタン操作

#### レイアウト切り替え

**横方向ボタン:**
```javascript
document.getElementById('horizontalBtn').addEventListener('click', () => {
    switchLayout('horizontal');
});
```

**縦方向ボタン:**
```javascript
document.getElementById('verticalBtn').addEventListener('click', () => {
    switchLayout('vertical');
});
```

**処理:**
1. レイアウト計算 (`horizontalLayout` / `verticalLayout`)
2. エッジ再描画 (`createCSSLines`)
3. パスハイライト再適用
4. ビューポート調整

#### 折りたたみ操作

**すべて折りたたむ:**
```javascript
document.getElementById('collapseAllBtn').addEventListener('click', () => {
    collapseManager.collapseAll();
});
```

**すべて展開:**
```javascript
document.getElementById('expandAllBtn').addEventListener('click', () => {
    collapseManager.expandAll();
});
```

**処理:**
1. 折りたたみ状態を変更
2. ノードの表示/非表示を切り替え
3. レイアウト再計算
4. エッジ再描画

#### ビューポート操作

**位置リセット:**
```javascript
document.getElementById('resetViewBtn').addEventListener('click', () => {
    viewportManager.resetView();
});
```

**全体表示:**
```javascript
document.getElementById('fitViewBtn').addEventListener('click', () => {
    viewportManager.fitToView();
});
```

---

### 2. マウス/タッチ操作

#### ズーム

**マウスホイール（Ctrl+ホイール）:**
```javascript
container.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
        viewportManager.handleWheelZoom(e, container);
    }
});
```

**処理:**
- マウス位置を中心にズーム
- `scale` を 0.2～6.0 の範囲で調整

**ピンチズーム（タッチ）:**
```javascript
handlePinchZoom: function(pointers, container) {
    const currentDistance = Math.sqrt(dx * dx + dy * dy);
    const scaleChange = currentDistance / this.initialTouchDistance;
    const newScale = this.scale * scaleChange;
    // ...
}
```

#### パン

**マウスドラッグ:**
```javascript
container.addEventListener('pointermove', (e) => {
    if (this.isDragging) {
        this.translateX = e.clientX - this.startX;
        this.translateY = e.clientY - this.startY;
        this.applyTransform();
    }
});
```

**マウスホイール（ホイール単独）:**
```javascript
handleWheelPan: function(e) {
    this.translateX -= e.deltaX;
    this.translateY -= e.deltaY;
    this.applyTransform();
}
```

**2本指パン（タッチ）:**
```javascript
handleTwoFingerPan: function(currentCenter) {
    const panX = currentCenter.x - this.lastTouchCenter.x;
    const panY = currentCenter.y - this.lastTouchCenter.y;
    this.translateX += panX;
    this.translateY += panY;
}
```

---

### 3. ノードクリック

#### 子を持つノード

クリックで折りたたみ/展開:

```javascript
element.addEventListener('click', function() {
    toggleNodeCollapse(nodeId);
});
```

**処理:**
1. ボタンの表示を変更（▼ ↔ ▲）
2. 影エフェクトの追加/削除
3. 子孫ノードの表示/非表示
4. レイアウト再計算
5. エッジ再描画

#### 点線ノード（子なし）

クリックで元ノードを強調表示:

```javascript
element.addEventListener('click', function(e) {
    e.stopPropagation();
    highlightManager.highlightOriginalNode(node.originalId);
});
```

---

## SVG階層構造

描画されるSVGは2つのレイヤーで構成される:

```html
<svg id="svgCanvas">
    <g id="edgeLayer" transform="translate(0, 0) scale(1)">
        <!-- すべてのエッジとラベル -->
    </g>
    <g id="nodeLayer" transform="translate(0, 0) scale(1)">
        <!-- すべてのノード -->
    </g>
</svg>
```

**レイヤー分離の理由:**
- エッジを背面、ノードを前面に配置
- ビューポート変換を両方に統一適用
- Z-orderの管理が容易

---

## 状態管理

### 折りたたみ状態

`collapseManager.collapsedNodes` (Set)

折りたたまれているノードIDのセット。

### レイアウト状態

`currentLayout` (String)

- `'horizontal'` - 横方向レイアウト
- `'vertical'` - 縦方向レイアウト

### ビューポート状態

`viewportManager` オブジェクト:
- `scale` - ズーム倍率 (0.2～6.0)
- `translateX` - X方向移動量
- `translateY` - Y方向移動量

### ハイライト状態

`highlightManager` と `pathHighlighter` が管理。

---

## 描画更新トリガー

以下の操作時にレイアウト再計算とエッジ再描画が実行される:

1. **レイアウト切り替え** (`switchLayout`)
2. **折りたたみ/展開** (`toggleNodeCollapse`)
3. **すべて折りたたむ/展開** (`collapseAll`, `expandAll`)

**更新フロー:**
```javascript
requestAnimationFrame(() => {
    // 1. レイアウト計算
    currentNodePositions = horizontalLayout(...);

    // 2. エッジ再描画
    createCSSLines(allConnections, currentNodePositions);

    // 3. エフェクト再適用
    pathHighlighter.reapplyPathHighlight();
    highlightManager.reapplyRelationHighlight();

    // 4. ビューポート更新
    viewportManager.updateContentBounds();
});
```

---

## パフォーマンス最適化

### requestAnimationFrame

すべての描画更新は `requestAnimationFrame` でラップされ、ブラウザの描画サイクルに同期する。

### トランスフォームの使用

ズーム・パンは CSS `transform` を使用し、再レイアウトを避ける:

```javascript
applyTransform: function() {
    const transform = `translate(${this.translateX}, ${this.translateY}) scale(${this.scale})`;
    nodeLayer.setAttribute('transform', transform);
    edgeLayer.setAttribute('transform', transform);
}
```

### 部分更新

折りたたみ時は影響を受けるノードのみを更新。

---

## コンソール出力

描画プロセス実行時のログ:

```
[Render] Starting render process...
[Render] Phase 1: Creating SVG nodes
[Render] Phase 2: Initializing managers
[Render] Phase 3: Computing layout
[Render] Phase 4: Rendering connections and labels
[Render] Phase 5: Final adjustments
[Render] Render process completed
```

---

## データフローまとめ

```
window.onload
    ↓
initializeAndRender()
    ↓
[Phase 1] createSVGNodes()
    → 通常ノード生成
    → 点線ノード生成
    → イベントリスナー設定
    ↓
[Phase 2] initializeManagers()
    → collapseManager.init()
    → viewportManager.init()
    → contextMenu.init()
    ↓
[Phase 3] computeLayout()
    → calculateAllNodeWidths()
    → analyzeTreeStructure()
    → horizontalLayout() / verticalLayout()
    → ノード座標決定
    ↓
[Phase 4] renderConnections()
    → createCSSLines()
        → ラベル描画
        → エッジ情報収集
        → 衝突検出・オフセット計算
        → パス生成
        → 矢印描画
    ↓
[Phase 5] applyFinalAdjustments()
    → bringRootNodesToFront()
    → viewportManager.fitToContent()
    ↓
インタラクティブ操作可能
```

---

## エラーハンドリング

ブラウザレンダリング中のエラーは基本的に発生しない設計:

- すべてのデータが事前にバリデーション済み
- 循環参照はバックエッジ処理で解決済み
- 不正なノードIDは存在しない

万が一エラーが発生した場合、ブラウザのコンソールにJavaScriptエラーが表示される。

---

## 次のプロセス

ブラウザレンダリングが完了すると、ユーザーはインタラクティブにグラフを操作できる。

追加の処理は発生せず、すべてのロジックはブラウザ内で完結する。

---

## 関連ファイル

**コア:**
- `src/runtime/core/render-orchestrator.js` - メインオーケストレーター

**レイアウト:**
- `src/core/layouts/horizontal-layout.js` - 横方向レイアウト
- `src/core/layouts/vertical-layout.js` - 縦方向レイアウト
- `src/shared/tree-structure.js` - 階層構造解析

**エッジレンダリング:**
- `src/runtime/rendering/connections/renderer.js` - レンダリング統合
- `src/runtime/rendering/connections/*.js` - 15個の接続モジュール

**UI:**
- `src/runtime/ui/layout-switcher.js` - レイアウト切り替え
- `src/runtime/ui/viewport-manager.js` - ビューポート管理
- `src/runtime/ui/context-menu.js` - コンテキストメニュー

**状態管理:**
- `src/runtime/state/collapse-manager.js` - 折りたたみ管理
- `src/runtime/state/highlight-manager.js` - ハイライト管理
- `src/runtime/state/path-highlighter.js` - パスハイライト
- `src/runtime/state/edge-highlighter.js` - エッジハイライト

**エフェクト:**
- `src/runtime/rendering/effects/shadow-manager.js` - 影エフェクト

**ユーティリティ:**
- `src/shared/svg-helpers.js` - SVG操作ヘルパー
- `src/shared/layout-utils.js` - レイアウトユーティリティ
