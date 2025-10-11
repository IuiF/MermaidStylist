# ブラウザ検証準備完了

## 検証状況

**日時**: 2025-10-11 23:40

### 完了した検証

#### 1. Node.jsテスト ✓
- test-segment-builder.js: 全てPASS
- test-integration.js: 全てPASS
- test-detailed-verification.js: 14/14 PASS

#### 2. HTML埋め込み検証 ✓
- 新実装関数: 26箇所確認
- buildSegments関数: 3箇所確認
- 切り替えフラグ: 正常に埋め込み
- ファイルサイズ: 5018行、231KB

#### 3. データ整合性 ✓
- 33ノード処理確認
- 55接続処理確認
- 11バックエッジ検出確認

---

## ブラウザ検証手順

### 前提条件

**必須**:
- output.htmlが生成済み
- ブラウザ（Chrome、Firefox、Edge等）

**任意**:
- 開発者ツールの基本的な使い方の理解

---

## 手順1: HTMLファイルを開く

### ファイルパス
```
/home/iuif/dev/MermaidTreeStylist/output.html
```

### 開き方
1. ブラウザを起動
2. ファイル → 開く（Ctrl+O）
3. output.htmlを選択

または

```bash
# Linuxの場合
xdg-open output.html

# WSLの場合
explorer.exe output.html
```

---

## 手順2: 開発者コンソールを開く

**キーボードショートカット**:
- Chrome/Edge: `F12` または `Ctrl+Shift+I`
- Firefox: `F12` または `Ctrl+Shift+K`

**メニューから**:
- Chrome: メニュー → その他のツール → デベロッパーツール
- Firefox: メニュー → ウェブ開発 → 開発ツール

**コンソールタブを選択**してください。

---

## 手順3: 自動検証スクリプトの実行

### 3-1. スクリプトファイルを開く

```
docs/refactoring/phase5-verification-script.js
```

### 3-2. 内容をコピー

ファイル全体（317行）をコピーしてください。

### 3-3. コンソールに貼り付け

開発者コンソールに貼り付けて Enter キーを押してください。

### 3-4. 実行結果を確認

以下のような出力が表示されます：

```
========================================
Phase 5 Verification Script
========================================

=== Test 1: Environment Check ===
✓ allConnections is defined
  Total connections: 55
✓ nodePositions is defined
  Total nodes: 33
✓ buildSegments function exists
✓ renderSegments function exists

=== Test 2: Legacy Implementation ===
✓ Legacy implementation renders edges
  Edges rendered: 55

=== Test 3: New Implementation ===
✓ New implementation renders edges
  Edges rendered: 55

=== Test 4: Y-Adjusted Edges ===
  Testing edge: B2 → E3
  Legacy: L= 9 Q= 2
  New: L= 7 Q= 4
✓ Y-adjusted edges have curves
  ✓ Curves are applied!

=== Test 5: Dashed Edges ===
✓ Dashed edges are rendered
✓ Dashed style is applied (strokeDasharray)
✓ Dashed opacity is applied

=== Test 6: Performance Comparison ===
  Legacy time: X.XX ms
  New time: Y.YY ms
  Ratio: Z.ZZ x
✓ Performance is acceptable (< 2x)

=== Test 7: Error Handling ===
✓ Normal case works

========================================
Verification Summary
========================================
✓ Passed: XX
✗ Failed: 0
⚠ Warnings: 0

✓ All tests passed!
Ready to proceed to Phase 6 (Legacy code removal)

Current mode: NEW IMPLEMENTATION
```

---

## 期待される結果

### 必須条件（すべて満たすべき）

- [ ] ✓ Test 1 成功（環境確認）
- [ ] ✓ Test 2 成功（レガシー実装動作）
- [ ] ✓ Test 3 成功（新実装動作）
- [ ] ✓ Test 4 成功（**Y調整ありエッジでカーブ描画**）
- [ ] ✓ Test 5 成功（点線エッジ）
- [ ] ✓ Test 6 成功（パフォーマンス2倍以内）
- [ ] ✓ Test 7 成功（エラーハンドリング）
- [ ] ✗ Failed: 0
- [ ] 視覚的に問題なし（グラフが正常に表示される）

### 視覚的確認

**画面を見て確認**:
1. すべてのノードが表示されている
2. すべてのエッジが表示されている
3. エッジがスムーズな曲線で描画されている
4. 点線エッジが点線で表示されている
5. レイアウトが崩れていない

---

## 問題が発生した場合

### エラーメッセージが表示される

**対処法**:
1. コンソールのエラー内容を確認
2. エラーメッセージをコピー
3. 以下の情報と共に報告:
   - ブラウザ名とバージョン
   - エラーメッセージ全文
   - どのテストで失敗したか

### テストが失敗する

**対処法**:
1. どのテストが失敗したかを確認
2. Failed tests: の内容を確認
3. レガシー実装に戻す:

```javascript
window.USE_SEGMENT_BASED_PATH = false;
window.createCSSLines(allConnections, nodePositions);
```

### 視覚的に問題がある

**対処法**:
1. スクリーンショットを撮影
2. 問題箇所を特定（どのエッジ、どのノード）
3. レガシー実装と比較:

```javascript
// レガシー実装で描画
window.USE_SEGMENT_BASED_PATH = false;
window.createCSSLines(allConnections, nodePositions);

// 新実装で描画
window.USE_SEGMENT_BASED_PATH = true;
window.createCSSLines(allConnections, nodePositions);
```

---

## 手動検証（オプション）

自動スクリプトを使わずに手動で確認することもできます。

### 新実装を有効化

```javascript
window.USE_SEGMENT_BASED_PATH = true;
window.DEBUG_CONNECTIONS = true;
window.createCSSLines(allConnections, nodePositions);
```

### 特定のエッジを確認

```javascript
// B2→E3のエッジを探す
const testEdge = allConnections.find(c => c.from === 'B2' && c.to === 'E3');
console.log('Test edge:', testEdge);

// DOM要素を確認
const edgeElement = document.querySelector('[data-from="B2"][data-to="E3"]');
console.log('Edge element:', edgeElement);
console.log('Path:', edgeElement.getAttribute('d'));
```

### レガシー実装に戻す

```javascript
window.USE_SEGMENT_BASED_PATH = false;
window.createCSSLines(allConnections, nodePositions);
```

---

## 検証完了後

### すべてのテストが成功した場合

**次のステップ**: フェーズ6（レガシーコード削除）

**確認事項**:
- [ ] 自動検証スクリプトで全テストPASS
- [ ] 視覚的に問題なし
- [ ] パフォーマンスが許容範囲内
- [ ] エラーが発生していない

**実行するコマンド**:
```bash
# フェーズ6の詳細計画を確認
cat docs/refactoring/phase6-legacy-removal-plan.md
```

### 問題が発見された場合

**報告内容**:
1. どのテストが失敗したか
2. エラーメッセージ（あれば）
3. スクリーンショット（視覚的問題の場合）
4. ブラウザ情報

**一時的な対処**:
```javascript
// レガシー実装に戻す（安全）
window.USE_SEGMENT_BASED_PATH = false;
window.createCSSLines(allConnections, nodePositions);
```

---

## 参考資料

### 詳細な検証手順
- `docs/refactoring/phase5-verification-checklist.md` (361行)

### ブラウザテストガイド
- `docs/refactoring/browser-test-guide.md` (164行)

### 自動検証スクリプト
- `docs/refactoring/phase5-verification-script.js` (317行)

### 最終安全性チェック
- `docs/refactoring/final-safety-check.md` (276行)

---

## 技術的詳細

### 新実装の特徴

**アーキテクチャ**:
```
制御点 → buildSegments → validateSegments → renderSegments → SVGパス
```

**主な改善点**:
- Y調整時もカーブを適用可能
- 8方向のカーブに対応
- エラーハンドリング完備
- デバッグログ完備

**切り替え方法**:
```javascript
// 新実装を有効化
window.USE_SEGMENT_BASED_PATH = true;

// レガシー実装を有効化
window.USE_SEGMENT_BASED_PATH = false;

// 再描画
window.createCSSLines(allConnections, nodePositions);
```

---

## よくある質問

### Q1: 自動スクリプトが長すぎて貼り付けられない

**A**: ファイルの内容をコピー&ペーストしてください。317行ですが、コンソールは長いコードも受け付けます。

### Q2: コンソールにエラーが出ているが、グラフは表示されている

**A**: フォールバック機能が動作しています。エラー内容を確認して報告してください。

### Q3: テストは成功したが、視覚的に違和感がある

**A**: 具体的にどのエッジ・ノードに違和感があるか特定し、スクリーンショットと共に報告してください。

### Q4: パフォーマンステストで2倍以上になった

**A**: グラフのサイズによっては2倍以上になることもあります。実際の体感速度が問題なければ許容範囲です。

---

## 検証済み環境

### Node.js環境
- ✓ Node.js v18+
- ✓ 21個のテストケース全てPASS

### HTMLファイル
- ✓ 5018行、231KB
- ✓ 新実装関数26箇所確認
- ✓ 切り替えフラグ正常

### データ整合性
- ✓ 33ノード
- ✓ 55接続
- ✓ 11バックエッジ

---

## まとめ

**準備完了**: ブラウザ検証を実施できます

**所要時間**: 約10分

**期待される結果**: すべてのテストがPASS

**成功基準**:
- 自動検証スクリプトで全テストPASS
- Y調整ありエッジでカーブが描画される（主目的）
- 視覚的に問題なし
- パフォーマンスが許容範囲内

慎重に丁寧に検証を進めてください。
