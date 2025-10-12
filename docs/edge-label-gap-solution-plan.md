# エッジラベル間の空白問題 - 長期的解決策

## 問題の本質

### 現在のアーキテクチャ

```
描画フロー:
1. toggleCollapse()
2. setNodeState() - 折りたたみ状態設定
3. updateVisibility() - .hiddenクラス設定
4. recalculateLayout()
   └─ redrawConnectionsWithHighlights()
      └─ createCurvedLines()
         └─ renderAllLabels(allConnections)
            └─ areNodesVisible() でチェック
            └─ createConnectionLabel()
               └─ labelOffsets[toNodeId]++ でオフセット計算
```

### 根本的な問題

**renderer.js:281-292のrenderAllLabels()**:
```javascript
connections.forEach(conn => {
    const fromElement = svgHelpers.getNodeElement(conn.from);
    const toElement = svgHelpers.getNodeElement(conn.to);
    if (areNodesVisible(fromElement, toElement)) {
        const labelGroup = createConnectionLabel(conn, toElement);
        if (labelGroup) {
            svgLayer.appendChild(labelGroup);
        }
    }
});
```

**問題点**:
1. `areNodesVisible()`は両端ノードの`.hidden`クラスしかチェックしない
2. エッジの可視性判定（`isEdgeVisible()`）を使っていない
3. 折りたたまれた親からのエッジも処理される

### 具体例

```
状況:
- ノードEに3つのエッジ
  - A→E: 親Aは表示中
  - B→E: 親Bは折りたたまれている
  - C→E: 親Cは表示中

現在の処理:
1. renderAllLabels()が全エッジを処理
2. A→E: areNodesVisible() = true → offset=0で描画
3. B→E: areNodesVisible() = true → offset=1で描画 ← 問題！
4. C→E: areNodesVisible() = true → offset=2で描画
5. updateVisibility()でB→Eラベルに.hiddenを追加

結果:
- offset=0のラベル表示
- offset=1のラベル非表示（空白）← 問題！
- offset=2のラベル表示
```

**なぜareNodesVisible()だけでは不十分か**:
- ノードBは表示されている（折りたたまれているだけ）
- ノードEも表示されている
- しかし、B→Eエッジは非表示にすべき（親Bが折りたたまれているから）
- `isEdgeVisible()`が必要

---

## 解決策の比較

### 案1: renderAllLabels()でエッジの可視性を考慮（推奨）

**概要**: 表示されるエッジのみをフィルタリングしてからラベルを描画

**変更箇所**: renderer.js:281-292

**実装**:
```javascript
function renderAllLabels(connections, svgLayer) {
    // 表示されるエッジのみをフィルタリング
    const visibleConnections = connections.filter(conn => {
        const fromElement = svgHelpers.getNodeElement(conn.from);
        const toElement = svgHelpers.getNodeElement(conn.to);
        if (!areNodesVisible(fromElement, toElement)) return false;

        // collapseManagerのisEdgeVisibleを使用
        if (window.collapseManager && !window.collapseManager.isEdgeVisible(conn)) {
            return false;
        }
        return true;
    });

    // 表示されるエッジのみでラベルを描画
    visibleConnections.forEach(conn => {
        const toElement = svgHelpers.getNodeElement(conn.to);
        const labelGroup = createConnectionLabel(conn, toElement);
        if (labelGroup) {
            svgLayer.appendChild(labelGroup);
        }
    });
}
```

**メリット**:
- ✓ 根本原因を解決
- ✓ シンプルで理解しやすい
- ✓ パフォーマンス影響が最小
- ✓ 既存のラベル配置ロジックを変更しない
- ✓ 既存の折りたたみロジックを変更しない
- ✓ 将来の拡張に対応しやすい

**デメリット**:
- △ collapseManagerへの依存が増える（ただし既にグローバルに存在）

**影響範囲**:
- renderer.js:281-292のみ（約10行の変更）

---

### 案2: createConnectionLabel()内で可視性チェック

**概要**: labels.js:26-32で、非表示エッジはnullを返す

**実装**:
```javascript
function createConnectionLabel(conn, toElement) {
    if (!conn.label) return null;

    // 非表示エッジはラベルを作らない
    if (window.collapseManager && !window.collapseManager.isEdgeVisible(conn)) {
        return null;
    }

    // ... 既存のロジック
}
```

**メリット**:
- ✓ labels.js内で完結

**デメリット**:
- ✗ createConnectionLabel()が折りたたみ状態に依存（関心の分離違反）
- ✗ renderAllLabels()が全エッジを処理（無駄な処理）
- ✗ 将来的にラベル配置を独立させる際に問題

---

### 案3: 動的なラベル再配置

**概要**: updateVisibility()でラベルの位置を動的に再計算

**実装**:
```javascript
// updateVisibility()内で
const visibleLabelsByTarget = {};

allConnections.forEach(conn => {
    if (this.isEdgeVisible(conn) && conn.label) {
        if (!visibleLabelsByTarget[conn.to]) {
            visibleLabelsByTarget[conn.to] = [];
        }
        visibleLabelsByTarget[conn.to].push(conn);
    }
});

// 各ターゲットノードのラベルを再配置
Object.keys(visibleLabelsByTarget).forEach(toNodeId => {
    const labels = visibleLabelsByTarget[toNodeId];
    labels.forEach((conn, index) => {
        const labelElement = document.querySelector(`.connection-label[data-from="${conn.from}"][data-to="${conn.to}"]`);
        if (labelElement) {
            // Y座標を再計算してDOM更新
            // ...
        }
    });
});
```

**メリット**:
- ✓ renderAllLabels()は変更不要

**デメリット**:
- ✗ DOM操作が増える（パフォーマンス影響）
- ✗ 複雑性が増す
- ✗ 既にrecalculateLayout()で再描画しているのに、さらに位置調整が必要
- ✗ 2つの配置ロジックが存在する（保守性低下）

---

## 推奨解決策: 案1（表示エッジのフィルタリング）

### 理由

1. **根本原因を解決**: 表示されないエッジがlabelOffsetsに影響しない
2. **シンプル**: フィルタリングを追加するだけ
3. **関心の分離**:
   - renderAllLabels()は「どのエッジのラベルを描画するか」を決定
   - createConnectionLabel()は「ラベルをどう描画するか」を実装
4. **パフォーマンス**: フィルタリングのコストは無視できる
5. **保守性**: 既存のロジックを変更しない
6. **拡張性**: 将来の機能追加に対応しやすい

### 実装方針

**ステップ1: renderAllLabels()の修正**
- 表示されるエッジのみをフィルタリング
- isEdgeVisible()を使用

**ステップ2: テスト**
- 折りたたみ時にラベルが詰まることを確認
- 複数の親を持つノードでの動作確認
- 点線エッジとの組み合わせ確認

**ステップ3: 将来の拡張**
- アニメーション対応（CSS transition）
- ラベルのカスタマイズ機能
- ラベルの位置調整機能

---

## 将来的な改善（オプション）

### 改善1: ラベル配置ロジックの独立

**現状**: labels.jsとrenderer.jsが密結合

**改善案**:
```javascript
// label-layout.js (新規)
class LabelLayoutManager {
    constructor() {
        this.offsets = {};
    }

    reset() {
        this.offsets = {};
    }

    calculatePosition(conn, toElement) {
        const toNodeId = conn.to;
        if (!this.offsets[toNodeId]) {
            this.offsets[toNodeId] = 0;
        }
        const offset = this.offsets[toNodeId];
        this.offsets[toNodeId]++;

        // Y座標計算
        // ...
        return { x, y, offset };
    }
}
```

**メリット**:
- テストが容易
- 再利用可能
- 拡張しやすい

---

### 改善2: アニメーション対応

**現状**: ラベルは即座に移動

**改善案**:
```css
.connection-label {
    transition: transform 0.3s ease-out;
}
```

```javascript
// ラベルの位置を変更する際にtransformを使用
labelElement.style.transform = `translateY(${newY}px)`;
```

**メリット**:
- ユーザー体験の向上
- 滑らかな移動

**注意**:
- パフォーマンスへの影響を考慮
- 大規模グラフでは無効化するオプション

---

### 改善3: ラベルの衝突回避

**現状**: 固定間隔で配置

**改善案**:
- ラベルの幅を考慮した配置
- 長いラベルが重なる場合は自動調整

---

## 実装計画

### フェーズ1: 基本実装（最優先）

**タスク**:
1. renderer.js:renderAllLabels()の修正
2. 折りたたみ動作の検証
3. コミット

**期待される効果**:
- エッジラベルが詰めて表示される
- 空白がなくなる

**リスク**: 低（既存ロジックを変更しない）

---

### フェーズ2: テストと検証

**タスク**:
1. 複数の親を持つノードのテスト
2. 点線エッジとの組み合わせテスト
3. 大規模グラフでのパフォーマンステスト

**期待される効果**:
- 安定性の確認
- パフォーマンスの確認

---

### フェーズ3: ドキュメント更新（オプション）

**タスク**:
1. 調査ドキュメントの更新
2. コードコメントの追加

---

## 成功基準

### 必須条件

- ✓ 折りたたみ時にエッジラベルが詰めて表示される
- ✓ 空白が発生しない
- ✓ 既存の機能が正常に動作する
- ✓ テストが全てPASS

### 推奨条件

- ✓ コードが読みやすく保守しやすい
- ✓ パフォーマンスへの影響が最小
- ✓ 将来の拡張に対応しやすい

---

## まとめ

**推奨**: 案1（表示エッジのフィルタリング）

**理由**:
- 根本原因を解決
- シンプルで保守しやすい
- パフォーマンス影響が最小
- 将来の拡張に対応

**次のアクション**: ユーザーの承認後、実装を開始
