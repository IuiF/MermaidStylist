# フェーズ6: レガシーコード削除 - 実行計画

## 前提条件

- フェーズ5のすべての検証が完了している
- ブラウザテストで新実装の正常動作を確認済み
- パフォーマンスがレガシー実装の2倍以内
- デグレーションが発生していない

## 概要

フェーズ0-4で統合した新実装を正式採用し、レガシー実装のコードを削除します。

**見積もり時間**: 3時間

## タスク6.1: 切り替えフラグの削除（30分）

### 目的

`window.USE_SEGMENT_BASED_PATH` フラグと関連する条件分岐を削除し、新実装を唯一の実装とします。

### 対象ファイル

**src/runtime/rendering/connections/path-generator.js**

### 削除するコード

```javascript
// 削除対象: フラグによる切り替えロジック
const USE_SEGMENT_BASED = window.USE_SEGMENT_BASED_PATH || false;

if (USE_SEGMENT_BASED) {
    try {
        const segments = buildSegments(points);
        if (validateSegments(segments)) {
            return renderSegments(segments, cornerRadius);
        } else {
            console.error('[Segment-based] Validation failed, falling back to legacy');
        }
    } catch (error) {
        console.error('[Segment-based] Error:', error);
    }
}

// 以下のレガシー実装コード
```

### 置き換え後のコード

```javascript
// 新実装を直接使用
const segments = buildSegments(points);

if (!validateSegments(segments)) {
    console.error('[Path Generator] Segment validation failed');
    return '';
}

return renderSegments(segments, cornerRadius);
```

### 確認項目

- [ ] フラグ変数の削除
- [ ] try-catchによるフォールバックの削除
- [ ] デバッグログの整理（"[Segment-based]"プレフィックスの削除）
- [ ] エラーハンドリングの簡素化

---

## タスク6.2: レガシー関数の削除（90分）

### 目的

フェーズ4で残していた旧実装の関数をすべて削除します。

### 対象ファイル

**src/runtime/rendering/connections/path-generator.js**

### 削除する関数リスト

以下の8つのレガシー関数を削除：

1. **_generatePathWithInitialAdjustment**（50行程度）
   - 初期Y調整を含むパス生成
   - 削除理由: buildSegments + renderSegmentsに置き換え済み

2. **_generatePathWithFinalAdjustment**（45行程度）
   - 最終Y調整を含むパス生成
   - 削除理由: buildSegments + renderSegmentsに置き換え済み

3. **_generatePathWithBothAdjustments**（60行程度）
   - 両方のY調整を含むパス生成
   - 削除理由: buildSegments + renderSegmentsに置き換え済み

4. **_generateSimpleCurvedPath**（25行程度）
   - Y調整なしの単純なカーブパス
   - 削除理由: buildSegments + renderSegmentsに置き換え済み

5. **_calculateCurvePoints**（20行程度）
   - カーブ制御点の計算
   - 削除理由: renderCurvedTransitionに統合済み

6. **_buildHorizontalSegment**（15行程度）
   - 水平セグメント構築
   - 削除理由: createSegmentに置き換え済み

7. **_buildVerticalSegment**（15行程度）
   - 垂直セグメント構築
   - 削除理由: createSegmentに置き換え済み

8. **_applyCornerRadius**（20行程度）
   - コーナー半径の適用
   - 削除理由: canApplyCurveとrenderCurvedTransitionに置き換え済み

### 削除手順

1. 各関数の参照がないことを確認
   ```bash
   grep -n "_generatePathWithInitialAdjustment" src/runtime/rendering/connections/path-generator.js
   grep -n "_generatePathWithFinalAdjustment" src/runtime/rendering/connections/path-generator.js
   # ... 他の関数も同様
   ```

2. 関数定義を1つずつ削除
   - 関数全体を削除（コメントを含む）
   - 削除後、構文エラーがないことを確認

3. 統合テストを実行
   ```bash
   node tests/scripts/test-integration.js
   ```

### 確認項目

- [ ] すべてのレガシー関数を削除
- [ ] 関数の参照がないことを確認
- [ ] 統合テストが成功
- [ ] 構文エラーがない

---

## タスク6.3: ファイル構成の整理（45分）

### 目的

path-generator.jsの構造を整理し、可読性を向上させます。

### 整理内容

#### 3.1 関数の並び順を整理

**推奨順序**:

1. セグメント型定義（segment-types.jsからインポート）
2. buildSegments関数
3. validateSegments関数
4. debugSegments関数
5. renderSegments関数
6. canApplyCurve関数
7. renderCurvedTransition関数
8. renderStraightTransition関数
9. renderFinalSegment関数
10. generateCurvedPath関数（エントリポイント）

#### 3.2 コメントの整理

削除するコメント：
- レガシー実装に関するコメント
- フォールバック機能に関するコメント
- フラグに関するコメント

追加するコメント：
- ファイルヘッダーに新実装の概要
- 各関数の簡潔な説明

#### 3.3 コード量の確認

**期待される結果**:
- 削除前: 約414行
- 削除後: 約200行（約50%削減）

### 確認項目

- [ ] 関数の並び順が整理されている
- [ ] コメントが適切に整理されている
- [ ] コード量が約50%削減されている
- [ ] 可読性が向上している

---

## タスク6.4: ドキュメント更新（45分）

### 目的

ドキュメントを最新の状態に更新します。

### 更新対象ファイル

#### 4.1 progress-summary.md

**更新内容**:
- フェーズ6の完了を記録
- コミット履歴の追加
- 最終的なコードメトリクスの更新

#### 4.2 README.md（存在する場合）

**更新内容**:
- 新実装の採用を記録
- アーキテクチャの説明を更新

#### 4.3 browser-test-guide.md

**更新内容**:
- フラグに関する記述を削除
- 新実装が標準であることを明記

#### 4.4 phase5-verification-script.js

**更新内容**:
- レガシー実装との比較テストを削除
- 新実装のみのテストに変更

### 確認項目

- [ ] すべてのドキュメントが更新されている
- [ ] フラグに関する記述が削除されている
- [ ] 新実装が標準であることが明記されている

---

## コミット計画

### コミット1: 切り替えフラグの削除

```bash
git add src/runtime/rendering/connections/path-generator.js
git commit -m "セグメントベース実装を正式採用: フラグ削除"
```

### コミット2: レガシー関数の削除

```bash
git add src/runtime/rendering/connections/path-generator.js
git commit -m "レガシーパス生成関数を削除"
```

### コミット3: ファイル構成の整理

```bash
git add src/runtime/rendering/connections/path-generator.js
git commit -m "path-generator.js構造を整理"
```

### コミット4: ドキュメント更新

```bash
git add docs/refactoring/*.md
git commit -m "ドキュメント更新: フェーズ6完了記録"
```

---

## リスク管理

### リスク1: 予期しない参照の残存

**対策**:
- 削除前に全ファイルを検索
- `grep -r "_generatePath" src/` で参照を確認

### リスク2: 統合テストの失敗

**対策**:
- 各タスク完了後に統合テストを実行
- 失敗時はコミットを戻す

### リスク3: ドキュメントの不整合

**対策**:
- すべてのドキュメントを一括レビュー
- フラグに関する記述を検索して確認

---

## 完了基準

以下のすべての条件を満たすこと:

- [ ] 切り替えフラグが完全に削除されている
- [ ] すべてのレガシー関数が削除されている
- [ ] ファイル構成が整理されている
- [ ] ドキュメントが更新されている
- [ ] 統合テストが成功している
- [ ] HTMLが正常に生成される
- [ ] コミット履歴が整理されている

---

## 次のステップ

フェーズ6完了後、フェーズ7（拡張性の検証）に進みます。

**フェーズ7のタスク**:
- 新機能の追加テスト
- 複雑なY調整パターンの追加
- メンテナンス性の評価
