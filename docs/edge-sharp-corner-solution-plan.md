# 角張りエッジ問題の長期的解決策

## 問題の本質

現在の実装には2つの閾値が存在し、その間にギャップがあります:

1. **セグメント生成閾値**: 0.1px (buildSegments内)
2. **カーブ適用閾値**: 16px (cornerRadius × 2)

この0.1px～16pxの範囲でセグメントが生成されると、カーブ適用条件を満たさず角張ります。

## 解決策の比較

### 案1: セグメント統合アプローチ
**概要**: buildSegments後に短いセグメントを隣接セグメントと統合

```javascript
function mergeShortSegments(segments, minLength) {
    // 短いセグメントを検出して統合
}
```

**評価**:
- ✓ buildSegmentsのロジックを保持
- ✓ 段階的な改善が可能
- ✗ 座標のジャンプが発生する可能性
- ✗ 処理が増える

### 案2: 閾値ベースアプローチ（推奨）
**概要**: buildSegments内で最小セグメント長を考慮

```javascript
const MIN_SEGMENT_LENGTH = 16; // cornerRadius * 2

// buildSegments内で
if (Math.abs(p4.y - end.y) > MIN_SEGMENT_LENGTH) {
    // Y調整セグメントを生成
} else {
    // Y差が小さいので直接水平線を引く
}
```

**評価**:
- ✓ 根本原因を解決
- ✓ コードがシンプル
- ✓ 座標の一貫性を維持
- ✓ パフォーマンス影響なし
- ✗ buildSegmentsが若干複雑になる

### 案3: アダプティブカーブ半径
**概要**: セグメント長に応じてカーブ半径を動的に調整

```javascript
function canApplyCurve(seg1, seg2, r) {
    const minLength = Math.min(getSegmentLength(seg1), getSegmentLength(seg2));
    const adaptiveR = Math.min(r, minLength / 2);
    return adaptiveR >= MIN_CURVE_RADIUS; // 例: 2px
}
```

**評価**:
- ✓ 柔軟性が高い
- ✗ 視覚的な一貫性が損なわれる
- ✗ 非常に小さいカーブが生成される可能性
- ✗ 複雑性が増す

## 推奨解決策: 案2（閾値ベースアプローチ）

### 実装方針

1. **定数定義**
   ```javascript
   const MIN_SEGMENT_LENGTH = 16; // cornerRadius * 2を想定
   ```

2. **buildSegments関数の修正**
   - 4箇所の閾値チェック（> 0.1）を改善
   - 短いセグメントを生成しない判定ロジックを追加

3. **修正箇所**
   - 51行目: `hasInitialYAdjustment` 判定
   - 52行目: `needsFinalYAdjustment` 判定
   - 67行目: `needsFinalVertical` 判定
   - 83-101行目: 最終セグメント生成ロジック

### 具体的な変更内容

#### 変更1: 初期Y調整の閾値変更
```javascript
// 変更前
const hasInitialYAdjustment = Math.abs(p2.y - p1.y) > 1;

// 変更後
const hasInitialYAdjustment = Math.abs(p2.y - p1.y) > MIN_SEGMENT_LENGTH;
```

#### 変更2: 最終Y調整の閾値変更
```javascript
// 変更前
const needsFinalYAdjustment = Math.abs(p4.y - end.y) > 0.1;

// 変更後
const needsFinalYAdjustment = Math.abs(p4.y - end.y) > MIN_SEGMENT_LENGTH;
```

#### 変更3: 最終垂直セグメントの閾値変更
```javascript
// 変更前
const needsFinalVertical = Math.abs(p3.y - p4.y) > 1;

// 変更後
const needsFinalVertical = Math.abs(p3.y - p4.y) > MIN_SEGMENT_LENGTH;
```

#### 変更4: セグメント生成時の閾値変更（複数箇所）
```javascript
// 変更前: if (Math.abs(...) > 0.1)
// 変更後: if (Math.abs(...) > MIN_SEGMENT_LENGTH)
```

### 期待される効果

1. **角張りエッジの解消**: 16px以下のY調整は水平線に統合され、滑らかなカーブが適用される
2. **視覚的な改善**: 微小なY調整（< 16px）を無視することで、よりクリーンな描画
3. **一貫性の向上**: 全てのエッジで同じ基準が適用される

### 懸念事項と対策

#### 懸念1: Y座標の精度低下
**影響**: 16px以下のY調整が無視される
**評価**: ノード間の接続線において16pxの誤差は視覚的に許容範囲
**対策**: 必要に応じてMIN_SEGMENT_LENGTHを調整可能（定数化）

#### 懸念2: 既存のエッジへの影響
**影響**: 他のエッジの描画が変わる可能性
**評価**: 短いセグメントが統合されるため、むしろ改善される
**対策**: テストで全エッジを検証

#### 懸念3: cornerRadiusが変更された場合
**影響**: MIN_SEGMENT_LENGTH = 16 が適切でなくなる
**評価**: 現在cornerRadius = 8で固定されている
**対策**: 将来的にはcornerRadiusを動的に取得する設計に変更

## 実装ステップ

1. **定数定義の追加**: MIN_SEGMENT_LENGTH = 16
2. **buildSegments関数の修正**: 4箇所の閾値を変更
3. **テストの実行**: 既存の14テストが全てPASS
4. **ブラウザ検証**: B2→E3エッジのカーブ確認
5. **視覚的検証**: 他のエッジへの影響確認
6. **コミット**: 段階的に変更を記録

## 代替案（将来的な拡張）

### 拡張1: 動的な閾値
```javascript
function buildSegments(points, cornerRadius = 8) {
    const MIN_SEGMENT_LENGTH = cornerRadius * 2;
    // ...
}
```

### 拡張2: セグメント統合フォールバック
```javascript
function buildSegments(points) {
    const segments = buildRawSegments(points);
    return mergeShortSegments(segments, MIN_SEGMENT_LENGTH);
}
```

## まとめ

**推奨**: 案2（閾値ベースアプローチ）を実装

**理由**:
- 根本原因を解決
- コードがシンプルで保守しやすい
- パフォーマンス影響なし
- 視覚的な一貫性を維持
- 将来の拡張性を保持

**次のアクション**: ユーザーの承認後、実装を開始
