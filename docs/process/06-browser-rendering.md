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

#### エッジ描画の主要概念

エッジ描画は以下の主要概念に基づいて実装されている:

**階層（Depth）ベースの配置**
- 各ノードは階層（depth）を持つ（ルート=0、子=親+1）
- エッジの垂直セグメントは階層ごとにグループ化して配置
- 同じ階層内の全エッジは統一された配置ルールに従う

**クラスタリング**
- X座標が大きく離れた親ノード群は別クラスタとして扱う（閾値200px）
- クラスタごとに独立して等間隔配置を計算
- 離れた位置のエッジが互いに干渉しないようにする

**通過エッジ数カウント**
- 各階層を通過するエッジの本数を正確にカウント
- 長距離エッジ（複数階層をまたぐ）も考慮
- 衝突回避エッジは2本としてカウント（2本の垂直セグメントを持つため）

**等間隔配置**
- 親ノード数とエッジ数の大きい方を基準にレーン数を決定
- 利用可能な幅を等分してX座標を割り当て
- 中央基準で左右対称に配置

**衝突回避の2段階計算**
- 第1段階: 衝突回避なしで基本配置を計算
- 衝突判定: 最終水平セグメントとノードの交差を検出
- 第2段階: 衝突回避エッジをカウントに含めて再計算
- 2本目の垂直セグメントで折り返して衝突を回避

**階層単位でのオフセット集約**
- 各親ノードの衝突回避オフセットを計算
- 同じ階層内の全親に最大オフセット値を適用
- 垂直セグメントを階層ごとに揃えて視覚的に整然とさせる

---

#### エッジ描画の詳細プロセス

**`createCurvedLines()` の4フェーズ:**

##### Phase 0: SVGレイヤー初期化
`initializeAndClearSVGLayer()`
- SVGエッジレイヤーを取得
- 既存のエッジ、矢印、ラベルを削除
- ラベルオフセットマップをリセット

##### Phase 1: ラベル描画
`renderAllLabels(connections, svgLayer)`
- 表示中の全エッジに対してラベルを描画
- ラベルのバウンディングボックスを取得（後の衝突判定に使用）

##### Phase 2: エッジレイアウト計算
`calculateEdgeLayout(connections, labelBounds)`

以下の10ステップで構成:

**1. エッジ情報収集** (`edge-info-collector.js`)
- 各エッジの開始/終了座標、親子関係、階層情報を収集
- 1:1の水平エッジを判定（特殊処理対象）
- 兄弟エッジのインデックスとカウントを記録

**2. ノード階層計算** (`utils.js` - `calculateNodeDepths`)
- BFSでノードの階層（depth）を計算
- 複数の親を持つノードは最も深い階層を採用

**3. 親ごとの接続グループ化** (`utils.js` - `sortConnectionsByParent`)
- 親ノードごとにエッジをグループ化
- Y座標でソート

**4. 階層境界計算** (`depth-calculator.js`)
- 各階層の親ノード群の最大右端X座標を計算
- 各階層の子ノード群の最小左端X座標を計算
- レイアウト情報から取得、フォールバックとしてエッジ座標から計算

**5. 第1段階: 基本垂直セグメント計算** (`vertical-segment-calculator.js`)
- 親ノードをX座標でクラスタリング（閾値200px）
- 各階層を通過するエッジ数をカウント（長距離エッジ含む）
- クラスタ内でエッジを等間隔配置
  - 親ノード数とエッジ数の大きい方を基準にレーン数を決定
  - 利用可能な幅を等分してX座標を割り当て
  - 衝突回避オフセットを見込んで配置開始位置を調整

**6. 最終垂直X座標計算** (`final-vertical-calculator.js`)
- 現在は空実装（全エッジをノード左端に接続）

**7. 衝突判定とY座標調整** (`path-y-adjuster.js`)
- 最終水平セグメントとノードの衝突を検出
- 衝突がある場合はY座標を調整
- 点線エッジの場合は関連点線ノードを除外して判定
- 調整情報を `edgeToYAdjustment` に記録

**8. 第2段階: 衝突回避エッジを含めて再計算** (`vertical-segment-calculator.js`)
- Y調整が必要なエッジを衝突回避エッジとして追加カウント
- 通過エッジ数を2倍にして等間隔配置を再計算
- 垂直セグメントX座標を更新

**9. 2本目の垂直セグメント計算** (`collision-avoidance-segment-calculator.js`)
- 衝突回避エッジの2本目の垂直セグメントX座標を計算
- p4xとendXの中間付近に配置
- 複数の衝突回避エッジがある場合はスペースを確保

**10. 衝突回避オフセット集約** (`depth-offset-aggregator.js`)
- 各親ノードの衝突回避オフセットを計算（ノード回避+ラベル回避）
- 同じ階層内の全親に最大オフセット値を適用
- 垂直セグメントを階層ごとに揃える

計算結果:
- `edgeInfos`: エッジ情報配列
- `parentFinalVerticalSegmentX`: 親ID → 垂直セグメントX座標
- `edgeToFinalVerticalX`: エッジキー → 最終垂直X座標
- `edgeToYAdjustment`: エッジキー → Y調整情報
- `edgeToSecondVerticalX`: エッジキー → 2本目の垂直X座標

##### Phase 3: 単一エッジ描画
`renderSingleEdge()` を各エッジに対して実行

- **1:1水平エッジの場合**: 直線で描画
- **通常エッジの場合**:
  - 点線エッジは関連点線ノードを衝突判定から除外
  - `createCurvedPath()` でSVGパスデータを生成 (`path-generator.js`)
  - カーブ付きパスをSVGに追加
  - 矢印を描画 (`arrows.js`)

##### Phase 4: ラベル最前面配置
`finalizeLabels(svgLayer)`
- 全ラベルをSVGレイヤーの最後に移動
- Z-orderを調整してエッジより前面に表示

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
        [Phase 0] SVGレイヤー初期化
        [Phase 1] ラベル描画
        [Phase 2] エッジレイアウト計算
            1. エッジ情報収集
            2. ノード階層計算
            3. 親ごとの接続グループ化
            4. 階層境界計算
            5. 第1段階: 基本垂直セグメント計算（クラスタリング、等間隔配置）
            6. 最終垂直X座標計算
            7. 衝突判定とY座標調整
            8. 第2段階: 衝突回避エッジを含めて再計算
            9. 2本目の垂直セグメント計算
            10. 衝突回避オフセット集約
        [Phase 3] 単一エッジ描画（パス生成、矢印描画）
        [Phase 4] ラベル最前面配置
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
- `src/runtime/rendering/connections/renderer.js` - レンダリング統合（4フェーズオーケストレーター）
- `src/runtime/rendering/connections/edge-info-collector.js` - エッジ情報収集
- `src/runtime/rendering/connections/utils.js` - ユーティリティ（階層計算、グループ化）
- `src/runtime/rendering/connections/depth-calculator.js` - 階層境界計算
- `src/runtime/rendering/connections/vertical-segment-calculator.js` - 垂直セグメントX座標計算（クラスタリング、等間隔配置）
- `src/runtime/rendering/connections/edge-spacing-calculator.js` - エッジ間隔計算（通過エッジ数カウント、レーン配置）
- `src/runtime/rendering/connections/final-vertical-calculator.js` - 最終垂直X座標計算
- `src/runtime/rendering/connections/path-y-adjuster.js` - Y座標衝突回避調整
- `src/runtime/rendering/connections/collision-avoidance-segment-calculator.js` - 2本目の垂直セグメント計算
- `src/runtime/rendering/connections/depth-offset-aggregator.js` - 階層単位オフセット集約
- `src/runtime/rendering/connections/path-generator.js` - SVGパス生成
- `src/runtime/rendering/connections/arrows.js` - 矢印描画
- `src/runtime/rendering/connections/labels.js` - ラベル描画
- `src/runtime/rendering/connections/bounds-collector.js` - ノードバウンディングボックス収集
- `src/runtime/rendering/connections/collision-detector.js` - 衝突検出（純粋関数）
- `src/runtime/rendering/connections/constants.js` - 定数定義

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
