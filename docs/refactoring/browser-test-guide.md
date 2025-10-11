# ブラウザでの動作確認ガイド

## 目的

フェーズ4で統合した新実装（セグメントベースパス生成）をブラウザで確認する手順を説明します。

## 前提条件

- `output.html` が生成されている
- ブラウザ（Chrome、Firefox、Edgeなど）が利用可能

## 確認手順

### 1. HTMLファイルを開く

```bash
# ファイルパス
/home/iuif/dev/MermaidTreeStylist/output.html
```

ブラウザで開きます。デフォルトではレガシー実装（既存のコード）が使用されています。

### 2. 開発者コンソールを開く

- **Chrome/Edge**: `F12` または `Ctrl+Shift+I`
- **Firefox**: `F12` または `Ctrl+Shift+K`

### 3. レガシー実装の動作確認

開発者コンソールで以下を確認：

```javascript
// 現在の実装モードを確認
console.log('USE_SEGMENT_BASED_PATH:', window.USE_SEGMENT_BASED_PATH || false);
// → false（デフォルトはレガシー実装）
```

現在の描画を確認します。B2→E3のエッジが角張った折れ線になっているはずです。

### 4. 新実装への切り替え

開発者コンソールで以下を実行：

```javascript
// 新実装を有効化
window.USE_SEGMENT_BASED_PATH = true;

// デバッグモードを有効化（推奨）
window.DEBUG_CONNECTIONS = true;

// 再描画
window.createCSSLines(allConnections, nodePositions);
```

### 5. 新実装の動作確認

コンソールに以下のようなログが表示されるはずです：

```
[Segment-based] Using new path generation
[0] H right len=100.0 from=(100.0,150.0) to=(200.0,150.0)
[1] V down len=30.0 from=(200.0,150.0) to=(200.0,180.0)
...
[Segment-based] Generated path: M 100 150 L 200 150 ...
```

### 6. Y調整ありエッジの確認

特に以下のエッジを確認します：

- **B2 → E3**: Y調整が必要なエッジ
- **確認ポイント**: カーブが描画されているか（角張っていないか）

### 7. レガシー実装に戻す

問題がある場合は、すぐにレガシー実装に戻すことができます：

```javascript
// レガシー実装に戻す
window.USE_SEGMENT_BASED_PATH = false;

// 再描画
window.createCSSLines(allConnections, nodePositions);
```

## 期待される結果

### レガシー実装（デフォルト）

- ほとんどのエッジは正常にカーブで描画される
- **B2 → E3のようなY調整が必要なエッジは角張った折れ線になる**（これが修正対象）

### 新実装（セグメントベース）

- すべてのエッジがカーブで描画される
- **Y調整が必要なエッジもカーブで描画される**（修正完了）

## トラブルシューティング

### エラーが発生する場合

コンソールにエラーメッセージが表示されます：

```
[Segment-based] Error in new implementation: ...
[Segment-based] Falling back to legacy implementation
```

この場合、自動的にレガシー実装にフォールバックします。エラー内容を確認してください。

### セグメント検証エラー

```
[validateSegments] Discontinuity at index 2
```

セグメントの連続性に問題があります。`debugSegments` の出力を確認してください。

### 再描画が必要な場合

```javascript
// 現在のレイアウトで再描画
window.createCSSLines(allConnections, nodePositions);
```

## 詳細なデバッグ

より詳細な情報が必要な場合：

```javascript
// デバッグフラグを有効化
window.DEBUG_CONNECTIONS = true;

// 特定のエッジの制御点を確認
const testPoints = {
    p1: { x: 100, y: 150 },
    p2: { x: 200, y: 180 },
    p3: { x: 200, y: 250 },
    p4: { x: 200, y: 280 },
    end: { x: 300, y: 250 },
    secondVerticalX: 250
};

// セグメントを生成
const segments = buildSegments(testPoints);
console.log('Segments:', segments);
console.log('Validation:', validateSegments(segments));
console.log('Debug:', debugSegments(segments));

// パスを生成
const path = renderSegments(segments, 8);
console.log('SVG Path:', path);
```

## 次のステップ

ブラウザでの確認が完了したら、以下のタスクに進みます：

- [ ] タスク4.3: シンプルケースでの動作確認（1:1水平エッジ）
- [ ] タスク4.4: Y調整なしケースでの動作確認（通常のカーブエッジ）
- [ ] タスク4.5: Y調整ありケースでの動作確認（B2→E3など）

すべてのテストが成功したら、フェーズ5（全面移行）に進みます。
