# フェーズ0: 事前準備 - 分析結果

## タスク0.1: テスト環境の確認

### 結論
- **テストランナー**: 未導入（Jest、Mocha等なし）
- **テスト方針**: Node.jsスクリプト + ブラウザコンソール手動テスト

### 詳細

#### tests/ディレクトリ構成
```
tests/
├── fixtures/      # テストファイル（.mmd）
├── outputs/       # 出力結果
└── scripts/       # Node.jsテストスクリプト
    ├── test.js    # メインテストスクリプト
    ├── test-complex-trace.js
    ├── test-hierarchy.js
    ├── test-layout-trace.js
    └── test-validate-cycle.js
```

#### tests/scripts/test.js
- assertモジュールを使用
- パーサー、HTML生成、ツリー構造分析のテスト
- ブラウザ専用関数はコメントアウト

#### セグメントベース実装のテスト方針
1. **Node.jsテスト**: buildSegments、validateSegments、debugSegments
2. **ブラウザコンソールテスト**: renderSegments、カーブ描画

#### テストファイル作成場所
- `tests/scripts/test-segment-builder.js`（Node.js実行）
- ブラウザコンソールで手動実行

---

## タスク0.2: 依存関係の事前調査

### renderer.jsとpath-generator.jsの統合ポイント

#### 呼び出しフロー
```
renderer.js:416 renderCurvedEdge()
  ↓
renderer.js:78 createCurvedPath(pathParams)
  ↓
renderer.js:130 pathGenerator.generateCurvedPath(points, cornerRadius)
```

#### 引数（points）の構造
```javascript
points = {
    p1: { x: x1, y: y1 },              // 開始ノード右端中央
    p2: { x: verticalSegmentX, y: y1 }, // 垂直セグメント開始（Y調整後）
    p3: { x: verticalSegmentX, y: y2 }, // 垂直セグメント終点（Y調整後）
    p4: { x: finalVerticalX, y: y2 },  // 最終垂直セグメント位置
    end: { x: x2, y: y2 },              // 終了ノード左端中央
    secondVerticalX: number | undefined // 2本目の垂直セグメントX座標（任意）
}
```

#### cornerRadius
- 値: `CONNECTION_CONSTANTS.CORNER_RADIUS`（= 8）
- 定義場所: `src/runtime/rendering/connections/constants.js`

#### 戻り値
- 型: `string`
- 内容: SVGパス文字列（例: `M 100 150 L 200 150 Q 200 160 ...`）

---

## タスク0.3: 既存コードの徹底分析

### path-generator.jsの全関数

#### 1. generateCurvedPath(points, cornerRadius)
**入力**:
- points: 制御点オブジェクト（上記参照）
- cornerRadius: コーナー半径（数値）

**出力**:
- SVGパス文字列

**処理**:
1. 初期Y調整有無を判定
2. 最終垂直セグメント有無を判定
3. カーブ可否を判定
4. 適切な内部関数を呼び出し

---

#### 2. _generatePathWithInitialAdjustment(p1, p2, p3, p4, end, cornerRadius, needsFinalVertical, canCurveFinalVertical, secondVerticalX)
**用途**: 初期Y調整ありのパス生成

**処理**:
1. shortHorizontal（p2.x）を取得
2. 垂直距離がカーブ半径の2倍以上か判定
3. カーブ可能 → `_generateInitialCurvedSegment`
4. カーブ不可 → `_generateInitialStraightSegment`
5. `_appendFinalSegment`で最終セグメント追加

---

#### 3. _generateNormalPath(p1, p2, p3, p4, end, cornerRadius, needsFinalVertical, canCurveFinalVertical, secondVerticalX)
**用途**: 初期Y調整なしのパス生成

**処理**:
1. 垂直距離がカーブ半径の2倍以上か判定
2. カーブ可能 → `_generateNormalCurvedSegment`
3. カーブ不可 → `_generateNormalStraightSegment`
4. `_appendFinalSegment`で最終セグメント追加

---

#### 4. _generateInitialCurvedSegment(p1, p2, p3, r)
**用途**: 初期Y調整あり + カーブあり

**出力例**:
```
下向き:
M p1.x p1.y L shortHorizontal p1.y L shortHorizontal p2.y L p2.x-r p2.y Q p2.x p2.y p2.x p2.y+r L p3.x p3.y-r Q p3.x p3.y p3.x+r p3.y

上向き:
M p1.x p1.y L shortHorizontal p1.y L shortHorizontal p2.y L p2.x-r p2.y Q p2.x p2.y p2.x p2.y-r L p3.x p3.y+r Q p3.x p3.y p3.x+r p3.y
```

---

#### 5. _generateNormalCurvedSegment(p1, p2, p3, r)
**用途**: 初期Y調整なし + カーブあり

**出力例**:
```
下向き:
M p1.x p1.y L p2.x-r p2.y Q p2.x p2.y p2.x p2.y+r L p3.x p3.y-r Q p3.x p3.y p3.x+r p3.y

上向き:
M p1.x p1.y L p2.x-r p2.y Q p2.x p2.y p2.x p2.y-r L p3.x p3.y+r Q p3.x p3.y p3.x+r p3.y
```

---

#### 6. _appendFinalSegment(basePath, p3, p4, end, r, needsFinalVertical, canCurveFinalVertical, secondVerticalX)
**用途**: 最終セグメントを既存パスに追加

**処理**:
1. 最終Y調整が必要か判定（`Math.abs(p4.y - end.y) > 0.1`）
2. Y調整必要な場合:
   - intermediateX を計算
   - **直線で描画**（カーブなし）← これが問題の原因
   - 出力: `basePath L p4.x p3.y L p4.x p4.y L intermediateX p4.y L intermediateX end.y L end.x end.y`
3. Y調整不要な場合:
   - カーブ可能なら `Q`コマンドでカーブ
   - カーブ不可なら `L`コマンドで直線

**問題箇所**: 115行目
```javascript
// カーブを無効化（Y調整時は直線で処理）
return `${basePath} L ${p4.x} ${p3.y} L ${p4.x} ${p4.y} ${finalHorizontal}`;
```

---

#### 7. _generateInitialStraightSegment(p1, p2, p3, p4, end, shortHorizontal, needsFinalVertical, secondVerticalX)
**用途**: 初期Y調整あり + カーブなし（垂直距離短い）

**出力例**:
```
M p1.x p1.y L shortHorizontal p1.y L shortHorizontal p2.y L p2.x p2.y L p3.x p3.y L p4.x p3.y L p4.x p4.y ...
```

---

#### 8. _generateNormalStraightSegment(p1, p2, p3, p4, end, needsFinalVertical, secondVerticalX)
**用途**: 初期Y調整なし + カーブなし（垂直距離短い）

**出力例**:
```
M p1.x p1.y L p2.x p2.y L p3.x p3.y L p4.x p3.y L p4.x p4.y ...
```

---

### 制御点の意味

#### 座標系
- 左上が原点
- X軸: 右方向が正
- Y軸: 下方向が正

#### 各制御点の役割

**p1 (x1, y1)**
- 開始ノードの右端中央
- エッジの始点

**p2 (verticalSegmentX, y1調整後)**
- 垂直セグメントの開始点
- X座標は計算される（ノード・ラベルとの衝突回避）
- Y座標は初期調整が適用される可能性あり

**p3 (verticalSegmentX, y2調整後)**
- 垂直セグメントの終点
- p2と同じX座標
- Y座標は最終調整が適用される可能性あり

**p4 (finalVerticalX, y2調整後)**
- 最終水平セグメント前の位置
- 通常はp3と同じX座標
- ノード衝突回避で異なる場合あり

**end (x2, y2)**
- 終了ノードの左端中央
- エッジの終点

**secondVerticalX（任意）**
- 2本目の垂直セグメントのX座標
- Y調整が必要な場合のみ使用
- p4.xとend.xの中間、または計算された値

---

### エッジケース

#### 1. 1:1水平エッジ
- 同じレベルの隣接ノード間
- 直線で描画（renderer.js:374）

#### 2. Y調整ありエッジ（B2→E3など）
- 水平セグメントがノードと衝突
- Y座標を調整して回避
- **現在はカーブなしで描画される**（これが問題）

#### 3. 非常に短い垂直距離
- カーブ半径の2倍未満
- 直線で描画される

#### 4. 点線エッジ
- isDashed=true
- style.strokeDasharray='5,5'を適用
- 特殊なノードフィルタリング

#### 5. 長距離エッジ
- 複数レベルをスキップ
- 特殊な描画順序（背面に配置）

---

## まとめ

### テスト環境
- Node.jsスクリプト: 基本機能のテスト
- ブラウザコンソール: 描画関連のテスト

### 統合ポイント
- renderer.js → path-generator.js
- 入力: points（6つの制御点） + cornerRadius
- 出力: SVGパス文字列

### 既存コードの問題
- `_appendFinalSegment`:115行で、Y調整時にカーブを無効化
- 条件分岐が複雑（8関数）
- 新機能追加が困難

### セグメントベース設計の利点
- 条件分岐を排除
- Y調整時もカーブ適用可能
- テストが容易
- 拡張性が高い

---

## 次のステップ

フェーズ0完了。フェーズ1（基盤整備）に進む。

**コミットメッセージ案**:
```
フェーズ0完了: テスト環境・依存関係・既存コード分析
```
