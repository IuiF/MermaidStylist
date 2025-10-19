# MermaidStylist

Mermaid木構造図をインタラクティブなHTMLに変換するツール

## 機能

- 木構造のMermaid図を視覚化
- 縦方向・横方向レイアウト切り替え
- ノードの折りたたみ・展開
- パン・ズーム操作
- 同名ノードの一括操作・強調表示
- 右クリックコンテキストメニュー

## Webアプリの使い方

1. ブラウザで`webapp.html`を開く
2. テキストエリアにMermaidコードを入力
3. 「HTMLをダウンロード」ボタンでインタラクティブなHTMLを生成

## CLIの使い方

```bash
node cli/main.js <input.mmd> [output.html]
```

指定した出力ファイル（省略時は`output.html`）が生成されます。

### 例

```bash
# tests/fixtures/sample.mmdをtests/outputs/result.htmlに変換
node cli/main.js tests/fixtures/sample.mmd tests/outputs/result.html
```

## Webアプリのビルド

```bash
node scripts/build-webapp.js
```

`tests/outputs/webapp-template.html`からすべてのソースコードを埋め込んだ`tests/outputs/webapp.html`を生成します。

## プロジェクト構造

```
cli/                 # CLIツール
├── main.js
└── utils/
scripts/             # ビルド・デバッグスクリプト
├── build-webapp.js
└── debug/
src/
├── core/            # ビルド時実行 (Node.js)
│   ├── parsers/     # Mermaidパーサー
│   ├── generators/  # HTML生成
│   ├── layout/      # レイアウトシステム (新)
│   ├── layouts/     # レイアウトアルゴリズム (旧)
│   └── validators/  # 木構造バリデーション
├── runtime/         # ブラウザ実行
│   ├── core/        # レンダリング制御
│   ├── interaction/ # ユーザー操作
│   ├── rendering/   # 描画エンジン
│   │   ├── connections/  # 接続線描画 (旧)
│   │   ├── effects/      # 視覚効果
│   │   └── v2/           # 描画システム (新)
│   ├── state/       # 状態管理
│   └── ui/          # UIコントロール
├── shared/          # 共通ユーティリティ
└── templates/       # HTMLテンプレート
tests/
├── fixtures/        # .mmdファイル
├── outputs/         # 生成HTMLファイル
└── scripts/         # テストスクリプト
```
