# セグメントベースパス生成 実装ガイド

## 概要

このドキュメントは、segment-based-path-generator-plan.mdの各タスクを実装する際の具体的なコード例と注意点をまとめています。

---

## フェーズ1: 基盤整備

### タスク1.1: セグメントデータ構造の定義

**ファイル**: `src/runtime/rendering/connections/segment-types.js`

```javascript
function getSegmentTypes() {
    return `
        // セグメントタイプの定義
        const SegmentType = {
            HORIZONTAL: 'H',
            VERTICAL: 'V'
        };

        // 座標型
        // Point { x: number, y: number }

        // セグメント型
        // Segment {
        //   type: SegmentType,
        //   from: Point,
        //   to: Point
        // }

        // セグメントを作成するヘルパー関数
        function createSegment(type, from, to) {
            return {
                type: type,
                from: { x: from.x, y: from.y },
                to: { x: to.x, y: to.y }
            };
        }

        // セグメントの長さを計算
        function getSegmentLength(segment) {
            if (segment.type === SegmentType.HORIZONTAL) {
                return Math.abs(segment.to.x - segment.from.x);
            } else {
                return Math.abs(segment.to.y - segment.from.y);
            }
        }

        // セグメントの方向を判定
        function getSegmentDirection(segment) {
            if (segment.type === SegmentType.HORIZONTAL) {
                return segment.to.x > segment.from.x ? 'right' : 'left';
            } else {
                return segment.to.y > segment.from.y ? 'down' : 'up';
            }
        }
    `;
}

module.exports = {
    getSegmentTypes
};
```

**チェックポイント**:
- [ ] SegmentTypeのenumが定義されている
- [ ] createSegment関数が座標をコピーしている（参照を避ける）
- [ ] getSegmentLength関数が正しく動作する
- [ ] getSegmentDirection関数が正しく動作する

---

### タスク2.1: 基本セグメント構築ロジック

**ファイル**: `src/runtime/rendering/connections/segment-builder.js`

```javascript
function getSegmentBuilder() {
    return `
        // 制御点からセグメントリストを構築
        function buildSegments(points) {
            // 入力検証
            if (!points || !points.p1 || !points.p2 || !points.p3 || !points.p4 || !points.end) {
                console.error('Invalid points object');
                return [];
            }

            const { p1, p2, p3, p4, end, secondVerticalX } = points;
            const segments = [];

            // 初期Y調整の有無を判定
            const hasInitialYAdjustment = Math.abs(p2.y - p1.y) > 1;

            // 最終Y調整の有無を判定
            const needsFinalYAdjustment = Math.abs(p4.y - end.y) > 0.1;

            // セグメント1: p1から垂直セグメントX位置への水平線
            if (hasInitialYAdjustment) {
                // Y調整がある場合は短い水平線でp2.xまで移動
                segments.push(createSegment(SegmentType.HORIZONTAL, p1, { x: p2.x, y: p1.y }));
                // Y調整用の垂直線でp2.yまで移動
                segments.push(createSegment(SegmentType.VERTICAL, { x: p2.x, y: p1.y }, p2));
            } else {
                // Y調整なしの場合はp1からp2への水平線
                segments.push(createSegment(SegmentType.HORIZONTAL, p1, { x: p2.x, y: p1.y }));
            }

            // セグメント2: 垂直セグメント（p2からp3へ）
            const verticalStart = hasInitialYAdjustment ? p2 : { x: p2.x, y: p1.y };
            segments.push(createSegment(SegmentType.VERTICAL, verticalStart, p3));

            // セグメント3: p3から最終垂直セグメント位置への水平線
            const needsFinalVertical = Math.abs(p3.y - p4.y) > 1;
            if (needsFinalVertical) {
                segments.push(createSegment(SegmentType.HORIZONTAL, p3, { x: p4.x, y: p3.y }));
                segments.push(createSegment(SegmentType.VERTICAL, { x: p4.x, y: p3.y }, p4));
            } else {
                // 最終垂直が不要な場合
                segments.push(createSegment(SegmentType.HORIZONTAL, p3, { x: p4.x, y: p4.y }));
            }

            // 最終セグメント: p4からendへ
            if (needsFinalYAdjustment && secondVerticalX !== undefined) {
                // 2本目の垂直セグメントが必要
                segments.push(createSegment(SegmentType.HORIZONTAL, { x: p4.x, y: p4.y }, { x: secondVerticalX, y: p4.y }));
                segments.push(createSegment(SegmentType.VERTICAL, { x: secondVerticalX, y: p4.y }, { x: secondVerticalX, y: end.y }));
                segments.push(createSegment(SegmentType.HORIZONTAL, { x: secondVerticalX, y: end.y }, end));
            } else {
                // Y調整不要な場合は直接endへ
                segments.push(createSegment(SegmentType.HORIZONTAL, { x: p4.x, y: p4.y }, end));
            }

            return segments;
        }

        // セグメントリストの検証
        function validateSegments(segments) {
            for (let i = 0; i < segments.length - 1; i++) {
                const current = segments[i];
                const next = segments[i + 1];

                // 連続性チェック
                if (Math.abs(current.to.x - next.from.x) > 0.1 ||
                    Math.abs(current.to.y - next.from.y) > 0.1) {
                    console.error('Segment discontinuity detected at index', i);
                    console.error('  Current end:', current.to);
                    console.error('  Next start:', next.from);
                    return false;
                }

                // 空セグメント検出
                if (getSegmentLength(current) < 0.1) {
                    console.warn('Empty segment detected at index', i);
                }
            }
            return true;
        }

        // デバッグ用: セグメントリストを文字列化
        function debugSegments(segments) {
            return segments.map((seg, i) => {
                const dir = getSegmentDirection(seg);
                const len = getSegmentLength(seg).toFixed(1);
                return \`[\${i}] \${seg.type} \${dir} len=\${len} from=(\${seg.from.x.toFixed(1)},\${seg.from.y.toFixed(1)}) to=(\${seg.to.x.toFixed(1)},\${seg.to.y.toFixed(1)})\`;
            }).join('\\n');
        }
    `;
}

module.exports = {
    getSegmentBuilder
};
```

**チェックポイント**:
- [ ] buildSegments関数が全ての制御点を処理している
- [ ] hasInitialYAdjustmentの判定が正しい
- [ ] needsFinalYAdjustmentの判定が正しい
- [ ] validateSegments関数で連続性が確認できる
- [ ] debugSegments関数で可視化できる

---

### タスク3.4: カーブセグメント描画

**ファイル**: `src/runtime/rendering/connections/segment-renderer.js`

```javascript
function getSegmentRenderer() {
    return `
        // セグメントリストからSVGパスを生成
        function renderSegments(segments, cornerRadius) {
            if (!segments || segments.length === 0) {
                return '';
            }

            // 開始点
            let path = \`M \${segments[0].from.x} \${segments[0].from.y}\`;

            for (let i = 0; i < segments.length; i++) {
                const current = segments[i];
                const next = segments[i + 1];

                if (next && canApplyCurve(current, next, cornerRadius)) {
                    // カーブ付きで次のセグメントへ遷移
                    path += renderCurvedTransition(current, next, cornerRadius);
                } else if (next) {
                    // 直線で次のセグメントへ遷移
                    path += renderStraightTransition(current, next);
                } else {
                    // 最終セグメント
                    path += renderFinalSegment(current);
                }
            }

            return path;
        }

        // カーブ適用可否を判定
        function canApplyCurve(seg1, seg2, r) {
            // 同じタイプのセグメント間ではカーブ不要
            if (seg1.type === seg2.type) {
                return false;
            }

            // 十分な距離があるかチェック
            const seg1Length = getSegmentLength(seg1);
            const seg2Length = getSegmentLength(seg2);

            // 両方のセグメントがカーブ半径の2倍以上の長さが必要
            return seg1Length > r * 2 && seg2Length > r * 2;
        }

        // カーブ付き遷移を描画
        function renderCurvedTransition(seg1, seg2, r) {
            const corner = seg1.to; // 折り返し点
            let path = '';

            const dir1 = getSegmentDirection(seg1);
            const dir2 = getSegmentDirection(seg2);

            // seg1の終点手前までを直線で描画
            if (seg1.type === SegmentType.HORIZONTAL) {
                const beforeCornerX = dir1 === 'right' ? corner.x - r : corner.x + r;
                path += \` L \${beforeCornerX} \${corner.y}\`;
            } else {
                const beforeCornerY = dir1 === 'down' ? corner.y - r : corner.y + r;
                path += \` L \${corner.x} \${beforeCornerY}\`;
            }

            // コーナーでカーブを描画（Q: 2次ベジェ曲線）
            path += \` Q \${corner.x} \${corner.y}\`;

            // seg2の開始点からr分進んだ位置へ
            if (seg2.type === SegmentType.HORIZONTAL) {
                const afterCornerX = dir2 === 'right' ? corner.x + r : corner.x - r;
                path += \` \${afterCornerX} \${corner.y}\`;
            } else {
                const afterCornerY = dir2 === 'down' ? corner.y + r : corner.y - r;
                path += \` \${corner.x} \${afterCornerY}\`;
            }

            return path;
        }

        // 直線遷移を描画
        function renderStraightTransition(seg1, seg2) {
            // seg1の終点（= seg2の開始点）まで直線
            return \` L \${seg1.to.x} \${seg1.to.y}\`;
        }

        // 最終セグメントを描画
        function renderFinalSegment(seg) {
            return \` L \${seg.to.x} \${seg.to.y}\`;
        }
    `;
}

module.exports = {
    getSegmentRenderer
};
```

**チェックポイント**:
- [ ] renderSegments関数が空セグメントを処理できる
- [ ] canApplyCurve関数が正しく判定している
- [ ] renderCurvedTransition関数が8方向全てに対応している
  - [ ] 右→下のカーブ
  - [ ] 右→上のカーブ
  - [ ] 左→下のカーブ
  - [ ] 左→上のカーブ
  - [ ] 下→右のカーブ
  - [ ] 下→左のカーブ
  - [ ] 上→右のカーブ
  - [ ] 上→左のカーブ
- [ ] Qコマンドの座標が正しい
- [ ] カーブ半径が適切に適用されている

---

## フェーズ4: 統合ポイント

### タスク4.1: 切り替えフラグの追加

**ファイル**: `src/runtime/rendering/connections/path-generator.js`

既存のgenerateCurvedPath関数を修正：

```javascript
// generateCurvedPath関数の先頭に追加
generateCurvedPath: function(points, cornerRadius) {
    // 新実装への切り替えフラグ
    const USE_SEGMENT_BASED = window.USE_SEGMENT_BASED_PATH || false;

    if (USE_SEGMENT_BASED) {
        // 新実装を使用
        const segments = buildSegments(points);

        if (window.DEBUG_CONNECTIONS) {
            console.log('Using segment-based path generation');
            console.log(debugSegments(segments));
        }

        // 検証
        if (validateSegments(segments)) {
            return renderSegments(segments, cornerRadius);
        } else {
            console.error('Segment validation failed, falling back to legacy');
            // バリデーション失敗時は下のレガシー実装にフォールスルー
        }
    }

    // 既存の実装（レガシー）
    const { p1, p2, p3, p4, end, secondVerticalX } = points;
    // ... 既存のコード（ここに従来の処理が続く）...
}
```

**切り替え方法**:

ブラウザコンソールで：
```javascript
// 新実装を有効化
window.USE_SEGMENT_BASED_PATH = true;
// 再描画
window.createCSSLines(connections, nodePositions);

// 旧実装に戻す
window.USE_SEGMENT_BASED_PATH = false;
window.createCSSLines(connections, nodePositions);
```

**チェックポイント**:
- [ ] フラグがfalseの場合、従来通り動作する
- [ ] フラグがtrueの場合、新実装が使われる
- [ ] エラー時に自動的にフォールバックする
- [ ] デバッグモードで詳細ログが出力される

---

## テストケース例

### 基本的なテストケース

**ファイル**: `tests/unit/segment-builder.test.js`

```javascript
// シンプルな2点間パス
function testSimplePath() {
    const points = {
        p1: { x: 100, y: 150 },
        p2: { x: 200, y: 150 },
        p3: { x: 200, y: 250 },
        p4: { x: 200, y: 250 },
        end: { x: 300, y: 250 }
    };

    const segments = buildSegments(points);

    console.assert(segments.length === 3, 'Should have 3 segments');
    console.assert(segments[0].type === 'H', 'First segment should be horizontal');
    console.assert(segments[1].type === 'V', 'Second segment should be vertical');
    console.assert(segments[2].type === 'H', 'Third segment should be horizontal');
    console.assert(validateSegments(segments), 'Segments should be continuous');
}

// Y調整ありのパス
function testYAdjustedPath() {
    const points = {
        p1: { x: 100, y: 150 },
        p2: { x: 200, y: 180 }, // Y調整あり
        p3: { x: 200, y: 250 },
        p4: { x: 200, y: 280 }, // 最終Y調整あり
        end: { x: 300, y: 250 },
        secondVerticalX: 250
    };

    const segments = buildSegments(points);

    console.assert(segments.length > 3, 'Should have more segments due to adjustments');
    console.assert(validateSegments(segments), 'Segments should be continuous');

    // デバッグ出力
    console.log(debugSegments(segments));
}
```

---

## 注意事項とベストプラクティス

### 座標の精度

- 浮動小数点誤差を考慮し、0.1以下の差は同一とみなす
- `Math.abs(a - b) < 0.1` で比較する

### カーブ半径の選択

- 現在のCORNER_RADIUSは8
- セグメント長さが`radius * 2`未満の場合はカーブを適用しない
- 極端に小さい/大きい値は避ける

### デバッグ方法

1. `window.DEBUG_CONNECTIONS = true` でデバッグモードを有効化
2. `debugSegments(segments)` でセグメント情報を出力
3. `validateSegments(segments)` で整合性をチェック
4. ブラウザの開発者ツールで生成されたSVGパスを確認

### パフォーマンス

- セグメント数は通常5-10個程度
- 1000エッジでも十分高速に処理できる
- メモリ使用量は従来実装と同等

---

## トラブルシューティング

### 問題: セグメントが不連続

**原因**: buildSegments関数での座標計算ミス

**解決**:
```javascript
// validateSegmentsの結果を確認
if (!validateSegments(segments)) {
    console.log(debugSegments(segments));
    // 不連続な箇所を特定
}
```

### 問題: カーブが描画されない

**原因**: canApplyCurveの条件が厳しすぎる

**解決**:
```javascript
// デバッグ出力を追加
function canApplyCurve(seg1, seg2, r) {
    const result = seg1.type !== seg2.type &&
                   getSegmentLength(seg1) > r * 2 &&
                   getSegmentLength(seg2) > r * 2;

    if (window.DEBUG_CONNECTIONS) {
        console.log('canApplyCurve:', result,
                    'len1:', getSegmentLength(seg1),
                    'len2:', getSegmentLength(seg2));
    }

    return result;
}
```

### 問題: 特定方向でカーブの向きが逆

**原因**: getSegmentDirection関数の判定ミス

**解決**:
```javascript
// 各方向でのテストケースを追加
testCurveDirection('right-down');
testCurveDirection('right-up');
testCurveDirection('down-right');
testCurveDirection('up-right');
```

---

## 次のステップ

1. このガイドを参照しながらフェーズ1から実装を開始
2. 各チェックポイントで動作確認
3. 問題が発生したらトラブルシューティングセクションを参照
4. plan.mdのチェックリストを更新しながら進める
