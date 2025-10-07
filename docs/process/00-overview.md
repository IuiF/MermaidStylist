# MermaidTreeStylist 処理フロー概要

## 目的

Mermaid形式のグラフ定義ファイル(.mmd)を読み込み、DAG(有向非巡環グラフ)として視覚化されたHTMLファイルを生成する。

## 全体フロー

```
mmdファイル
    ↓
[1] ファイル読み込み
    ↓
生のMermaidテキスト
    ↓
[2] パース処理
    ↓
構造化データ(nodes, connections, styles, classDefs)
    ↓
[3] バリデーション
    ↓
検証結果 + バックエッジ情報
    ↓
[4] バックエッジ処理
    ↓
通常エッジ + 点線ノード・エッジ
    ↓
[5] HTML生成
    ↓
HTMLファイル
    ↓
[6] ブラウザレンダリング
    ↓
視覚化されたグラフ
```

## 各プロセスの概要

### 1. ファイル読み込み (01-file-reading.md)
- コマンドライン引数からファイルパスを取得
- mmdファイルをUTF-8テキストとして読み込み

### 2. パース処理 (02-parsing.md)
- Mermaid構文を解析し、構造化データに変換
- ノード定義、接続関係、スタイル、クラス定義を抽出

### 3. バリデーション (03-validation.md)
- DAG構造として妥当かチェック
- サイクル検出とバックエッジ識別

### 4. バックエッジ処理 (04-back-edge-handling.md)
- サイクルを含む場合、点線ノードと点線エッジを生成
- DAG構造を維持しながら全ての関係を表現

### 5. HTML生成 (05-html-generation.md)
- JavaScriptとCSSを含む自己完結型HTMLを生成
- レンダリングロジックとデータを埋め込み

### 6. ブラウザレンダリング (06-browser-rendering.md)
- ブラウザでHTMLを開くとJavaScriptが実行
- SVGでグラフを動的に描画
- インタラクティブ機能を提供

## データ構造

### Node（ノード）
```javascript
{
    id: string,        // ノードID
    label: string,     // 表示ラベル
    classes: [string], // 適用クラス名
    isDashed: boolean  // 点線ノードフラグ（バックエッジ用）
}
```

### Connection（エッジ）
```javascript
{
    from: string,      // 開始ノードID
    to: string,        // 終了ノードID
    label: string,     // エッジラベル
    isDashed: boolean  // 点線エッジフラグ（バックエッジ用）
}
```

### Style（スタイル）
```javascript
{
    [nodeId]: {
        fill: string,
        stroke: string,
        color: string,
        // ...その他のCSSプロパティ
    }
}
```

### ClassDef（クラス定義）
```javascript
{
    [className]: {
        fill: string,
        stroke: string,
        // ...スタイルプロパティ
    }
}
```

## エラーハンドリング

### パースエラー
- 不正なMermaid構文の場合、エラーメッセージを表示

### バリデーションエラー
- サイクルが解決できない場合、エラーHTMLを生成
- ルートノードが存在しない場合、エラー

### ファイルエラー
- 読み込み失敗時、使用方法を表示して終了

## 設計思想

### 1. 自己完結性
- 生成されたHTMLは外部依存なしで動作
- ブラウザだけで完全に機能

### 2. DAG構造の保証
- サイクルを含む入力も、点線ノードを使ってDAGとして表現
- レイアウトアルゴリズムが常に動作可能

### 3. 段階的処理
- 各プロセスが独立し、テスト・デバッグが容易
- パイプライン的なデータフロー

### 4. 拡張性
- 新しいノード形状やスタイルの追加が容易
- レンダリングロジックが独立
