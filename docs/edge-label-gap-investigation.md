# エッジラベル間の空白問題調査結果

調査日: 2025-10-12

## 問題

複数のエッジラベルを持つ子ノードがあり、親ノードが折りたたまれたときに、その位置のエッジラベルのみが非表示になるため、間が空いた感じになってしまう。

### 期待される動作

折りたたみ時に、表示されているエッジラベルが詰めて表示される。

### 実際の動作

折りたたみ時に、非表示のエッジラベルの位置が空白として残る。

## 原因分析

### エッジラベルの配置ロジック

**src/runtime/rendering/connections/labels.js:26-32**
```javascript
// 同じターゲットノードへのラベル数を計算してオフセットを決定
const toNodeId = conn.to;
if (!labelOffsets[toNodeId]) {
    labelOffsets[toNodeId] = 0;
}
const offset = labelOffsets[toNodeId];
labelOffsets[toNodeId]++;
```

**src/runtime/rendering/connections/labels.js:44**
```javascript
y: toTop - labelHeight - 2 - (offset * (labelHeight + labelVerticalSpacing)),
```

ラベルの位置は、同じターゲットノードへのエッジ数に基づいて計算される。
- offset=0の場合: y = toTop - labelHeight - 2
- offset=1の場合: y = toTop - labelHeight - 2 - (labelHeight + spacing)
- offset=2の場合: y = toTop - labelHeight - 2 - 2 * (labelHeight + spacing)

### 折りたたみ時の処理

**src/runtime/state/collapse-manager.js:139-147**
```javascript
const edgeElements = document.querySelectorAll(`.connection-line[data-from="${conn.from}"][data-to="${conn.to}"], .connection-arrow[data-from="${conn.from}"][data-to="${conn.to}"], .connection-label[data-from="${conn.from}"][data-to="${conn.to}"]`);

edgeElements.forEach(element => {
    if (visible) {
        element.classList.remove('hidden');
    } else {
        element.classList.add('hidden');
    }
});
```

折りたたみ時に、エッジラベルに`hidden`クラスが追加されるだけで、位置の再計算は行われない。

### 問題の具体例

ノードEに3つのエッジがある場合:
- エッジA→E: ラベル「uses」, offset=0, 表示
- エッジB→E: ラベル「stores」, offset=1, 非表示（親Bが折りたたまれている）
- エッジC→E: ラベル「queries」, offset=2, 表示

現在の実装:
```
┌────────┐ offset=2
│queries │ ← 表示
└────────┘

(空白)      ← offset=1の位置が空いている

┌────────┐ offset=0
│uses    │ ← 表示
└────────┘
```

期待される表示:
```
┌────────┐ offset=1 (動的に再計算)
│queries │ ← 表示
└────────┘

┌────────┐ offset=0
│uses    │ ← 表示
└────────┘
```

## 根本原因

1. **静的なオフセット計算**: labels.js:26-32で、ラベルのオフセットは描画時に一度だけ計算される
2. **位置の再計算なし**: collapse-manager.js:updateVisibility()では、表示/非表示の切り替えのみで位置は更新されない
3. **全エッジベースのカウント**: renderAllLabels()では、表示/非表示に関係なくすべてのエッジに対してoffsetをインクリメントする

## 関連ファイル

### エッジラベル配置

- `src/runtime/rendering/connections/labels.js:26-32` - オフセット計算ロジック
- `src/runtime/rendering/connections/labels.js:44,56` - Y座標計算
- `src/runtime/rendering/connections/renderer.js:281-292` - renderAllLabels関数

### 折りたたみ管理

- `src/runtime/state/collapse-manager.js:90-104` - isEdgeVisible判定
- `src/runtime/state/collapse-manager.js:106-149` - updateVisibility処理
- `src/runtime/state/collapse-manager.js:62-68` - toggleCollapse処理

### レイアウト再計算

- `src/runtime/state/collapse-manager.js:43-60` - recalculateLayout関数
- `src/runtime/rendering/connections/renderer.js:273-275` - labelOffsetsリセット

## 解決策の候補

### 案1: 表示されるエッジのみでオフセットを計算（推奨）

**変更箇所**: labels.js:26-32

**概要**: isEdgeVisible()を使って、表示されるエッジのみをカウントしてオフセットを計算

**メリット**:
- ロジックがシンプル
- パフォーマンス影響が少ない
- 既存の折りたたみロジックを変更しない

**デメリット**:
- createConnectionLabel関数がcollapseManager.isEdgeVisible()に依存する

**実装イメージ**:
```javascript
const toNodeId = conn.to;
if (!labelOffsets[toNodeId]) {
    labelOffsets[toNodeId] = 0;
}

// 表示されるエッジのみをカウント（isEdgeVisibleが必要）
if (window.collapseManager && !window.collapseManager.isEdgeVisible(conn)) {
    // 非表示エッジはオフセットをインクリメントしない
    return null;
}

const offset = labelOffsets[toNodeId];
labelOffsets[toNodeId]++;
```

### 案2: 折りたたみ時にラベル位置を再計算

**変更箇所**: collapse-manager.js:updateVisibility()

**概要**: updateVisibility()で、表示されているラベルのY座標を動的に再計算

**メリット**:
- ラベル配置ロジックは変更不要
- 折りたたみ時のみ処理が追加される

**デメリット**:
- DOM操作が増える（パフォーマンス影響）
- 複雑性が増す
- アニメーションを追加する場合は実装が複雑

**実装イメージ**:
```javascript
// updateVisibility()内で
const labelsToReposition = {};

allConnections.forEach(conn => {
    if (this.isEdgeVisible(conn)) {
        if (!labelsToReposition[conn.to]) {
            labelsToReposition[conn.to] = [];
        }
        labelsToReposition[conn.to].push(conn);
    }
});

// 各ターゲットノードのラベルを再配置
Object.keys(labelsToReposition).forEach(toNodeId => {
    const labels = labelsToReposition[toNodeId];
    labels.forEach((conn, index) => {
        const labelElement = document.querySelector(`.connection-label[data-from="${conn.from}"][data-to="${conn.to}"]`);
        if (labelElement) {
            const rect = labelElement.querySelector('rect');
            const text = labelElement.querySelector('text');
            // Y座標を再計算
            // ...
        }
    });
});
```

### 案3: ラベル全体を再描画

**変更箇所**: collapse-manager.js:recalculateLayout()

**概要**: recalculateLayout()でエッジとラベルを完全に再描画

**メリット**:
- 確実に正しい位置に配置される
- 既存のロジックを再利用

**デメリット**:
- パフォーマンス影響が大きい
- 不要な再描画が発生

## 推奨解決策

**案1: 表示されるエッジのみでオフセットを計算**を推奨。

理由:
1. シンプルで理解しやすい
2. パフォーマンス影響が最小
3. 既存の折りたたみロジックとの整合性が良い

## 次のステップ

1. 案1の詳細な実装計画を作成
2. labels.jsの変更
3. テストケースの作成と検証
4. ブラウザでの動作確認

## 補足: labelOffsetsのライフサイクル

```
1. renderer.js:273 - labelOffsets = {} でリセット
2. renderer.js:281 - renderAllLabels()呼び出し
3. labels.js:26-32 - 各エッジでoffsetを計算・インクリメント
4. collapse-manager.js:139 - 折りたたみ時に.hiddenクラス追加（位置は変わらない）
5. 次の再描画で1に戻る
```

現在、折りたたみ時には位置が更新されないため、recalculateLayout()が呼ばれるまで空白が残る。
