# プロセス5: HTML生成

## 目的

パースされたデータとバックエッジ処理の結果を受け取り、自己完結型のHTMLファイルを生成する。

## 実装場所

- `src/core/generators/html.js`
- `src/templates/base.js`

## 自己完結型HTMLの構造

生成されるHTMLは、外部ファイルに依存せず、ブラウザだけで完全に動作する。

### HTML構成

```html
<!DOCTYPE html>
<html>
<head>
    <title>Mermaid Tree</title>
    <style>
        /* 全CSSがインライン埋め込み */
    </style>
</head>
<body>
    <!-- UIコントロール -->
    <!-- SVGコンテナ -->

    <script>
        // 全データとロジックがインライン埋め込み
        const nodes = [...];
        const connections = [...];
        const dashedNodes = [...];
        const dashedEdges = [...];

        // 全モジュールのJavaScriptコード
        // レンダリングロジック
    </script>
</body>
</html>
```

---

## 処理の流れ

### 1. テンプレート読み込み

**ベーステンプレート (`src/templates/base.js`):**

```javascript
{
    htmlStructure: {
        doctype: '<!DOCTYPE html>',
        htmlOpen: '<html>',
        headOpen: '<head>',
        title: '<title>Mermaid Tree</title>',
        headClose: '</head>',
        bodyOpen: '<body>',
        layoutControls: '<div>...</div>',  // UIコントロール
        containerOpen: '<div id="container">',
        containerClose: '</div>',
        bodyClose: '</body>',
        htmlClose: '</html>'
    },
    css: '/* 全スタイル定義 */'
}
```

### 2. HTML構造の組み立て

```javascript
let html = '';
html += template.htmlStructure.doctype + '\n';
html += template.htmlStructure.htmlOpen + '\n';
html += template.htmlStructure.headOpen + '\n';
html += '    ' + template.htmlStructure.title + '\n';
html += '    <style>\n';
html += template.css + '\n';
html += '    </style>\n';
html += template.htmlStructure.headClose + '\n';
html += template.htmlStructure.bodyOpen + '\n';
html += '    ' + template.htmlStructure.layoutControls + '\n';
html += '    ' + template.htmlStructure.containerOpen + '\n';
html += '    ' + template.htmlStructure.containerClose + '\n';
html += getJavaScriptContent(...);  // JavaScriptセクション
html += template.htmlStructure.bodyClose + '\n';
html += template.htmlStructure.htmlClose;
```

---

### 3. JavaScriptコンテンツの生成

`getJavaScriptContent()` 関数が以下を生成:

#### 3-1. データの埋め込み

```javascript
const nodes = [JSON.stringify(nodes)];
const connections = [JSON.stringify(connections)];
const styles = [JSON.stringify(styles)];
const classDefs = [JSON.stringify(classDefs)];
const dashedNodes = [JSON.stringify(dashedNodes)];
const dashedEdges = [JSON.stringify(dashedEdges)];
```

**例:**
```javascript
const nodes = [
    {"id":"A","label":"ルート","classes":[]},
    {"id":"B","label":"子1","classes":[]}
];
```

#### 3-2. 全ノード・全エッジの統合

```javascript
const allNodes = [...nodes, ...dashedNodes];
const allConnections = [...connections, ...dashedEdges];
```

通常ノードと点線ノード、通常エッジと点線エッジを統合。

#### 3-3. モジュールコードの埋め込み

以下のモジュールが順番に埋め込まれる:

1. **レイアウトユーティリティ** (`layout-utils.js`)
2. **SVGヘルパー** (`svg-helpers.js`)
3. **ツリー構造解析** (`tree-structure.js`)
4. **レイアウトアルゴリズム**
   - `vertical-layout.js`
   - `horizontal-layout.js`
5. **接続レンダリング関連**（15モジュール）
   - `constants.js` - 定数
   - `utils.js` - ユーティリティ
   - `bounds-collector.js` - 座標収集
   - `collision-detector.js` - 衝突検出
   - `edge-info-collector.js` - エッジ情報収集
   - `depth-calculator.js` - 深度計算
   - `edge-spacing-calculator.js` - エッジ間隔計算
   - `depth-offset-aggregator.js` - オフセット集約
   - `path-y-adjuster.js` - Y座標調整
   - `path-generator.js` - パス生成
   - `final-vertical-calculator.js` - 最終垂直座標
   - `vertical-segment-calculator.js` - 垂直セグメント
   - `arrows.js` - 矢印描画
   - `labels.js` - ラベル描画
   - `renderer.js` - レンダリング統合
6. **エフェクト・状態管理**
   - `shadow-manager.js` - 影エフェクト
   - `collapse-manager.js` - 折りたたみ
   - `highlight-manager.js` - ハイライト
   - `path-highlighter.js` - パスハイライト
   - `edge-highlighter.js` - エッジハイライト
7. **UIコンポーネント**
   - `layout-switcher.js` - レイアウト切り替え
   - `viewport-manager.js` - ビューポート管理
   - `context-menu.js` - コンテキストメニュー
8. **レンダリングオーケストレーター** (`render-orchestrator.js`)

**各モジュールの埋め込み方:**
```javascript
${getConnectionConstants()}
${getConnectionUtils()}
// ... 他のモジュール
```

各関数は、モジュールのJavaScriptコードを文字列として返す。

#### 3-4. スタイル適用関数

ノードにスタイルを適用する関数:

```javascript
function applyNodeStyle(element, nodeId, nodeClasses) {
    const styleObj = {};

    // クラスからスタイルを適用
    if (nodeClasses && nodeClasses.length > 0) {
        nodeClasses.forEach(className => {
            if (classDefs[className]) {
                Object.assign(styleObj, classDefs[className]);
            }
        });
    }

    // 直接スタイルを適用（優先度が高い）
    if (styles[nodeId]) {
        Object.assign(styleObj, styles[nodeId]);
    }

    // SVG要素にスタイルを適用
    for (const [key, value] of Object.entries(styleObj)) {
        element.style[key] = value;
    }
}
```

**スタイル適用の優先順位:**
1. クラス定義（`classDef`）
2. インラインスタイル（`style`）- これが優先

#### 3-5. エントリーポイント

```javascript
window.onload = function() {
    initializeAndRender();
};
```

ページ読み込み完了時に `initializeAndRender()` を呼び出す。

---

## UIコントロールの構造

### レイアウトコントロール

```html
<div id="layout-controls">
    <button id="layout-horizontal">横方向</button>
    <button id="layout-vertical">縦方向</button>
    <button id="collapse-all">すべて折りたたむ</button>
    <button id="expand-all">すべて展開</button>
    <button id="toggle-line-style">直線</button>
    <button id="reset-viewport">位置リセット</button>
    <button id="fit-viewport">全体表示</button>
</div>
```

### SVGコンテナ

```html
<div id="container">
    <!-- レイヤー構造は動的に生成される -->
</div>
```

---

## エラーHTML生成

バリデーションエラーがある場合、`generateErrorHTML()` が呼ばれる。

### エラーページの構造

```html
<!DOCTYPE html>
<html>
<head>
    <title>エラー - Mermaid Tree</title>
    <style>
        /* エラーページ用スタイル */
    </style>
</head>
<body>
    <div class="error-container">
        <h1>⚠ グラフ構造が不正なため描画できません</h1>
        <div class="error-message">
            <strong>検出されたエラー:</strong>
            <ul>
                <li>エラーメッセージ1</li>
                <li>エラーメッセージ2</li>
            </ul>
        </div>
        <div class="info">
            <p>このツールはDAG（有向非巡環グラフ）構造のMermaid図をサポートしています。</p>
            <!-- サポートされる構造の説明 -->
        </div>
    </div>
</body>
</html>
```

---

## データフローの例

### 入力データ

```javascript
nodes = [
    { id: "A", label: "ルート", classes: [] },
    { id: "B", label: "子1", classes: [] }
];

connections = [
    { from: "A", to: "B", label: "" }
];

styles = {
    "A": { "fill": "#f9f" }
};

classDefs = {
    "important": { "stroke": "#f00" }
};

dashedNodes = [];
dashedEdges = [];
```

### 生成されるJavaScriptセクション（抜粋）

```javascript
<script>
    const nodes = [{"id":"A","label":"ルート","classes":[]},{"id":"B","label":"子1","classes":[]}];
    const connections = [{"from":"A","to":"B","label":""}];
    const styles = {"A":{"fill":"#f9f"}};
    const classDefs = {"important":{"stroke":"#f00"}};
    const dashedNodes = [];
    const dashedEdges = [];

    const allNodes = [...nodes, ...dashedNodes];
    const allConnections = [...connections, ...dashedEdges];

    window.DEBUG_CONNECTIONS = false;

    // Import utilities
    /* layout-utils.js のコード */
    /* svg-helpers.js のコード */
    /* ... 全モジュールのコード ... */

    function applyNodeStyle(element, nodeId, nodeClasses) {
        /* スタイル適用ロジック */
    }

    window.onload = function() {
        initializeAndRender();
    };
</script>
```

---

## ファイル書き込み

生成されたHTML文字列を、指定されたファイルパスに書き込む。

```javascript
writeHtmlFile(outputFile, html);
```

**実装 (`cli/utils/file.js`):**
```javascript
fs.writeFileSync(outputFile, html, 'utf-8');
```

---

## コンソール出力

```
HTML output generated: output.html
Generated: output.html
```

---

## 生成されるHTMLの特徴

### 1. 完全な自己完結性
- 外部CSS/JSファイルへの依存なし
- ブラウザだけで完全に動作
- ネットワーク不要

### 2. データの埋め込み
- グラフデータがJavaScriptとして埋め込まれる
- サーバー不要

### 3. インタラクティブ性
- ボタンでレイアウト切り替え
- ノードの折りたたみ・展開
- ドラッグ・ズーム操作

### 4. レスポンシブ
- ビューポート管理
- 自動フィット機能

---

## 次のプロセス

生成されたHTMLをブラウザで開くと、ブラウザレンダリング（06-browser-rendering.md）が開始される。

---

## 関連ファイル

- `src/core/generators/html.js` - HTML生成ロジック
- `src/templates/base.js` - ベーステンプレート
- `cli/utils/file.js` - ファイル書き込み
- `src/runtime/**` - 埋め込まれるランタイムモジュール
