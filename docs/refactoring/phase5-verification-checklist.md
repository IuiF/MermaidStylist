# フェーズ5: 全面移行 - 検証チェックリスト

## 概要

このチェックリストは、新実装（セグメントベースパス生成）を全面的に検証するためのものです。
すべての項目をチェックしてから、フェーズ6（レガシーコード削除）に進みます。

## 事前準備

- [ ] `output.html` をブラウザで開く
- [ ] 開発者コンソールを開く
- [ ] デバッグモードを有効化: `window.DEBUG_CONNECTIONS = true`

---

## タスク5.1: 全エッジタイプでの検証

### 5.1.1 通常エッジ（Regular Edges）

**対象エッジ例**: A1→B1, B1→C1, C1→D1

- [ ] レガシー実装で正常に表示される
- [ ] 新実装で正常に表示される
- [ ] カーブが滑らかに描画される
- [ ] エッジの開始点と終了点が正しい
- [ ] 矢印が正しい位置に表示される

**確認コマンド**:
```javascript
// レガシー実装
window.USE_SEGMENT_BASED_PATH = false;
window.createCSSLines(allConnections, nodePositions);

// 新実装
window.USE_SEGMENT_BASED_PATH = true;
window.createCSSLines(allConnections, nodePositions);
```

### 5.1.2 点線エッジ（Dashed Edges）

**対象エッジ例**: B1→D3, B1→D2 (back edges)

- [ ] レガシー実装で点線として表示される
- [ ] 新実装で点線として表示される
- [ ] 点線のスタイル（strokeDasharray='5,5'）が適用される
- [ ] 透明度（opacity=0.6）が適用される
- [ ] カーブが正しく描画される

**確認コマンド**:
```javascript
// 点線エッジのみ確認
const dashedEdges = allConnections.filter(c => c.isDashed);
console.log('Dashed edges:', dashedEdges.length);
dashedEdges.forEach(e => console.log(`  ${e.from} -> ${e.to}`));
```

### 5.1.3 長距離エッジ（Long-distance Edges）

**対象エッジ例**: A1→D1, B1→E1 (複数レベルをスキップ)

- [ ] レガシー実装で正常に表示される
- [ ] 新実装で正常に表示される
- [ ] 背面に配置される（短いエッジの下）
- [ ] 垂直セグメントが他のエッジと衝突しない
- [ ] カーブが正しく描画される

**確認方法**:
```javascript
// レベル差が2以上のエッジを確認
const longEdges = allConnections.filter(c => {
    const fromLevel = nodePositions[c.from]?.level || 0;
    const toLevel = nodePositions[c.to]?.level || 0;
    return Math.abs(toLevel - fromLevel) >= 2;
});
console.log('Long-distance edges:', longEdges.length);
```

### 5.1.4 バックエッジ（Back Edges）

**対象エッジ例**: G5→B1 (サイクルを形成)

- [ ] レガシー実装で点線ノード経由で表示される
- [ ] 新実装で点線ノード経由で表示される
- [ ] 点線スタイルが適用される
- [ ] カーブが正しく描画される

---

## タスク5.2: エッジケースの確認

### 5.2.1 非常に短い距離のエッジ

**確認内容**:
- [ ] 垂直距離がカーブ半径の2倍未満のエッジ
- [ ] 直線で描画される（カーブなし）
- [ ] エラーが発生しない
- [ ] 視覚的に問題がない

**テストケース**:
```javascript
// 短い距離のテストポイント
const shortPoints = {
    p1: { x: 100, y: 150 },
    p2: { x: 200, y: 150 },
    p3: { x: 200, y: 160 },  // 10px差（cornerRadius=8の2倍未満）
    p4: { x: 200, y: 160 },
    end: { x: 300, y: 160 }
};
```

### 5.2.2 複数のY調整が必要なエッジ

**対象エッジ例**: B2→E3, D2→F2

- [ ] レガシー実装では角張った線になる（問題あり）
- [ ] **新実装ではカーブで描画される**（修正完了）
- [ ] 2本目の垂直セグメントが正しく配置される
- [ ] Y調整後もカーブが適用される

**重点確認ポイント**（これが今回のリファクタリングの主目的）:
```javascript
// Y調整ありエッジの確認
window.USE_SEGMENT_BASED_PATH = false;
window.createCSSLines(allConnections, nodePositions);
// → B2→E3が角張っている

window.USE_SEGMENT_BASED_PATH = true;
window.createCSSLines(allConnections, nodePositions);
// → B2→E3がカーブで描画される ✓
```

### 5.2.3 極端なコーナー角度

**確認内容**:
- [ ] 鋭角コーナー（90度未満）
- [ ] 鈍角コーナー（90度超）
- [ ] カーブが正しく描画される
- [ ] 視覚的に不自然でない

---

## タスク5.3: パフォーマンステスト

### 5.3.1 描画時間の測定

**測定方法**:
```javascript
// レガシー実装
console.time('Legacy rendering');
window.USE_SEGMENT_BASED_PATH = false;
window.createCSSLines(allConnections, nodePositions);
console.timeEnd('Legacy rendering');

// 新実装
console.time('New rendering');
window.USE_SEGMENT_BASED_PATH = true;
window.createCSSLines(allConnections, nodePositions);
console.timeEnd('New rendering');
```

**期待値**:
- [ ] 新実装の描画時間がレガシー実装の **2倍以内**
- [ ] 通常は同等またはそれ以下

### 5.3.2 メモリ使用量の確認

**確認方法**:
1. Chrome DevTools → Performance → Memory
2. レガシー実装で描画
3. ヒープスナップショットを取得
4. 新実装で描画
5. ヒープスナップショットを取得
6. 比較

**期待値**:
- [ ] メモリ使用量の増加が **20%以内**

### 5.3.3 大規模グラフでのテスト

**テスト内容**:
- [ ] 100ノード、200エッジのグラフで動作確認
- [ ] 描画が完了する
- [ ] ブラウザがフリーズしない
- [ ] 視覚的に問題がない

---

## タスク5.4: デグレーションチェック

### 5.4.1 既存テストケースの確認

**対象ファイル**:
- [ ] `tests/fixtures/test-complex-ultimate.mmd`
- [ ] その他のテストファイル

**確認内容**:
- [ ] すべてのノードが表示される
- [ ] すべてのエッジが表示される
- [ ] レイアウトが正しい
- [ ] スタイルが正しく適用される

### 5.4.2 視覚的回帰テストの実施

**手順**:
1. レガシー実装で描画
2. スクリーンショットを撮影
3. 新実装で描画
4. スクリーンショットを撮影
5. 比較

**比較ポイント**:
- [ ] ノードの位置が同じ
- [ ] エッジの始点・終点が同じ
- [ ] カーブの形状が同等以上
- [ ] **Y調整ありエッジがより滑らかになっている**（改善点）

### 5.4.3 機能の正常動作確認

**確認項目**:
- [ ] ノードの折りたたみ機能が動作する
- [ ] レイアウト切り替え機能が動作する
- [ ] ズーム機能が動作する
- [ ] パンニング機能が動作する
- [ ] ハイライト機能が動作する
- [ ] コンテキストメニューが動作する

---

## エラーハンドリングの確認

### フォールバック機能のテスト

**テストケース**:
```javascript
// 意図的にエラーを発生させる
window.USE_SEGMENT_BASED_PATH = true;

// 無効なポイントで描画を試みる
// → コンソールに [Segment-based] Error が表示される
// → 自動的にレガシー実装にフォールバックする
// → エラーで停止しない
```

**確認内容**:
- [ ] エラーメッセージがコンソールに表示される
- [ ] 自動的にレガシー実装にフォールバックする
- [ ] 描画が完了する
- [ ] ユーザー体験が損なわれない

---

## 完了基準

以下のすべての条件を満たすこと:

- [ ] すべてのエッジタイプで新実装が正常に動作する
- [ ] Y調整ありエッジでカーブが描画される（主目的達成）
- [ ] パフォーマンスがレガシー実装と同等以上
- [ ] デグレーションが発生していない
- [ ] エラーハンドリングが正しく動作する
- [ ] 視覚的に問題がない

---

## 問題が発生した場合

### ロールバック手順

```javascript
// 即座にレガシー実装に戻す
window.USE_SEGMENT_BASED_PATH = false;
window.createCSSLines(allConnections, nodePositions);
```

### 問題の報告

発見した問題は以下の形式で記録:

```
【問題】
- エッジタイプ:
- 発生条件:
- 期待される動作:
- 実際の動作:
- エラーメッセージ:

【再現手順】
1.
2.
3.

【スクリーンショット】
（あれば添付）
```

---

## 次のステップ

すべてのチェック項目が完了したら、フェーズ6（レガシーコード削除）に進みます。
