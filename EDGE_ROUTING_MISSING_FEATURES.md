# エッジルーティング移行 - 欠損機能リスト

## 移行失敗の原因

edge-router.jsに移植したのは基本的な3セグメント（H-V-H）ルーティングのみ。
既存システムの高度な機能の多くが欠損している。

## 主要な欠損機能

### 1. 2本目の垂直セグメント計算（最重要）
**ファイル**: collision-utils.js (153-238行目)
**関数**: calculateSecondVerticalSegmentX

- 衝突回避が必要なエッジに5-7セグメント（H-V-H-V-H）ルーティングを生成
- Y調整が必要なエッジのsecondVerticalX座標を計算
- SECOND_VERTICAL_DISTANCE_RATIO (0.6)を使用した配置
- 階層ごとの衝突回避エッジ数をカウント
- スペース確保の計算

**現状**: 完全に未実装

### 2. 垂直線のノード/ラベル回避
**ファイル**: collision-utils.js (88-150行目)
**関数**:
- calculateVerticalAvoidanceOffset
- calculateNodeAvoidanceOffset
- calculateLabelAvoidanceOffset
- findVerticalLineIntersections

- 垂直線と交差するノード/ラベルを検出
- 衝突回避のためのX座標オフセットを計算
- デバッグログ出力

**現状**: 完全に未実装

### 3. 複雑なセグメント構築ロジック
**ファイル**: path-generator.js (48-121行目)
**関数**: buildSegments

- 制御点（p1, p2, p3, p4, end, secondVerticalX）からセグメントリストを構築
- hasInitialYAdjustmentの判定
- needsFinalYAdjustmentの判定
- needsFinalVerticalの判定
- secondVerticalXパラメータの処理（89-113行目）
- 最終垂直セグメントの中間X座標計算

**現状**: generateSVGPath関数は既存のセグメント配列から単純にSVGを生成するのみ。制御点からのセグメント構築は未実装。

### 4. エッジ情報収集
**ファイル**: collectors.js
**機能**: edgeInfoCollector

- エッジ情報の収集とフィルタリング
- is1to1Horizontalの判定
- parentX, depth, 座標情報の収集

**現状**: 完全に未実装

### 5. ラベル配置計算
**ファイル**: labels.js
**機能**:
- ラベル位置計算
- ラベルバウンディングボックス取得
- ラベルオフセット管理

**現状**: 完全に未実装（labelPositions = new Map()のみ）

### 6. Y座標調整の高度な処理
**ファイル**: path-y-adjuster.js (56-122行目)
**関数**:
- adjustInitialSegmentY (初期セグメントY調整)
- adjustFinalSegmentY (最終セグメントY調整)

**既存実装との差異**:
- adjustInitialSegmentY: fromNodeLeft パラメータ、ソースノードの除外フィルタリング
- adjustFinalSegmentY: 点線ノードの扱い、ターゲットノードの条件付き除外

**現状**: 基本的な_adjustHorizontalSegmentYのみ実装。高度なフィルタリングロジックは未実装。

### 7. 垂直セグメント計算の統合フロー
**ファイル**: renderer.js (337-414行目)
**機能**: calculateEdgeLayout

- Phase 2のレイアウト計算全体
- 2段階計算（初回 → 衝突判定 → 再計算）
- edgeToYAdjustmentの生成と使用
- edgeToFinalVerticalXの管理
- edgeToSecondVerticalXの計算
- edgeCrossingsの生成

**現状**: routeEdges関数は単純な1段階計算のみ。2段階計算、衝突回避エッジの特別扱いは未実装。

## 実装済み機能

1. ✓ ノード階層計算（BFSベース）
2. ✓ 垂直セグメントX座標の基本計算（クラスタリング）
3. ✓ 基本的なY座標調整（水平セグメント）
4. ✓ エッジ交差検出（水平vs垂直）
5. ✓ ジャンプアーク生成（arcセグメント）
6. ✓ SVGパス文字列生成（基本）

## 移行の実態

- **想定**: 約60KB、10ファイル → 830行の統合
- **実態**: 基本的な3セグメントルーティングのみ実装
- **削減率**: 機能ベースでは約40-50%の機能が欠損

## 必要な対応

### オプション1: 完全移植
全ての欠損機能を実装する。推定工数: 5-7日

### オプション2: 移行計画の見直し
現在のedge-router.jsを「基本版」として位置づけ、EDGE_ROUTING_MIGRATION.mdを修正する。

### オプション3: 既存システムの継続使用
V2レイアウトエンジンは完成しているが、エッジ描画は既存システムを継続使用する。
