# MermaidTreeStylist

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
node main.js <input.mmd>
```

`output.html`が生成されます。

## Webアプリのビルド

```bash
node build-webapp.js
```

`webapp-template.html`からすべてのソースコードを埋め込んだ`webapp.html`を生成します。

## プロジェクト構造

```
src/
├── parsers/         # Mermaidパーサー
├── generators/      # HTML生成
├── validators/      # 木構造バリデーション
├── templates/       # HTMLテンプレート
├── layouts/         # レイアウトアルゴリズム
├── features/        # 機能（折りたたみ、ビューポート等）
└── utils/           # ユーティリティ
```
