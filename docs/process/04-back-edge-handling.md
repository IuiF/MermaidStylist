# プロセス4: バックエッジ処理

## 目的

バリデーションで検出されたバックエッジを点線ノードと点線エッジに変換し、サイクルを含むグラフをDAG構造として表現可能にする。

## 実装場所

- `cli/main.js` の `createDashedNodesAndEdges()` 関数

## 問題: なぜバックエッジ処理が必要か

### サイクルがある場合の問題

通常のレイアウトアルゴリズムはDAGを前提としている。サイクルがあると:

1. **無限ループ** - 階層計算が終わらない
2. **レイアウト不能** - どちらが上位か決定できない

**例: サイクル**
```mermaid
A --> B
B --> C
C --> A    # バックエッジ（サイクル）
```

このまでは「A, B, C のどれが最上位か」が決定できない。

### 解決策: 点線ノード

バックエッジ `C --> A` を以下のように変換:

```mermaid
A --> B
B --> C
C -.-> A_dashed    # 点線エッジ
```

`A_dashed` は `A` のコピーで、Cの下層に配置される。

**メリット:**
- DAG構造を保持
- 元の関係性は点線で表現
- レイアウトアルゴリズムが正常動作

---

## 処理の流れ

### 1. バックエッジの分離

通常のエッジとバックエッジを分離する。

**実装:**
```javascript
const regularConnections = connections.filter(conn => {
    return !validation.backEdges.some(
        be => be.from === conn.from && be.to === conn.to
    );
});
```

**結果:**
- `regularConnections`: 通常のDAGエッジ
- `validation.backEdges`: バックエッジのリスト

---

### 2. 各バックエッジの処理

各バックエッジに対して:
1. **点線ノード**を作成
2. **点線エッジ**を作成

#### 2-1. 点線ノードの作成

**ベースデータ:**
```javascript
const targetNode = nodes.find(n => n.id === backEdge.to);
```

バックエッジのターゲット（`to`）ノードのコピーを作成。

**点線ノードID:**
```javascript
const dashedNodeId = `${backEdge.to}_dashed_${backEdge.from}`;
```

**例:**
- バックエッジ: `C --> A`
- 点線ノードID: `A_dashed_C`

**点線ノードオブジェクト:**
```javascript
{
    id: "A_dashed_C",
    label: "ルートノード",  // 元ノードと同じラベル
    originalId: "A",        // 元ノードへの参照
    isDashed: true          // 点線フラグ
}
```

#### 2-2. 点線ノードの配置深度計算

点線ノードは以下の条件を満たす深度に配置:

1. **元ノードの全子孫より後**
2. **親ノード（バックエッジの`from`）より後**

**理由:**
DAG構造を保つため、点線ノードは元ノードの影響範囲の外に配置する必要がある。

**計算方法:**

##### (1) 元ノードの子孫の最大深度を計算

```javascript
function calculateMaxDescendantDepth(nodeId, connections, currentDepth = 0) {
    // 再帰的に子孫を探索
    const children = connections.filter(c => c.from === nodeId);

    if (children.length === 0) {
        return currentDepth;  // 葉ノード
    }

    let maxDepth = currentDepth;
    for (const child of children) {
        const childDepth = calculateMaxDescendantDepth(
            child.to,
            connections,
            currentDepth + 1
        );
        maxDepth = Math.max(maxDepth, childDepth);
    }

    return maxDepth;
}
```

**例:**
```
A (depth 0)
└→ B (depth 1)
   └→ C (depth 2)

calculateMaxDescendantDepth(A) = 2
```

##### (2) 親ノードの深度を計算

```javascript
function calculateNodeDepth(nodeId, connections) {
    // BFSでルートからの距離を計算
    const nodeDepths = new Map();
    const rootNodes = [/* ルートノード */];

    // ルートノードはdepth 0
    rootNodes.forEach(root => nodeDepths.set(root.id, 0));

    // BFSで各ノードのdepthを計算
    // ...

    return nodeDepths.get(nodeId) || 0;
}
```

##### (3) 最小深度の決定

```javascript
const targetDescendantDepth = calculateMaxDescendantDepth(backEdge.to, regularConnections);
const parentDepth = calculateNodeDepth(backEdge.from, regularConnections);

dashedNode.minDepth = Math.max(
    targetDescendantDepth + 1,  // 元ノードの子孫より後
    parentDepth + 1             // 親ノードより後
);
```

#### 2-3. 点線エッジの作成

点線ノードへのエッジを作成:

```javascript
{
    from: backEdge.from,   // バックエッジの開始ノード
    to: dashedNodeId,      // 点線ノードのID
    originalTo: backEdge.to,  // 元々のターゲット（参照用）
    isDashed: true         // 点線フラグ
}
```

---

## 具体例

### 入力グラフ

```mermaid
graph TD
    A[ルート]
    B[子1]
    C[子2]
    D[孫]

    A --> B
    B --> C
    C --> D
    D --> B    # バックエッジ
```

**バリデーション結果:**
```javascript
backEdges: [
    { from: "D", to: "B" }
]
```

### 処理

#### 1. 通常エッジとバックエッジの分離

**regularConnections:**
```javascript
[
    { from: "A", to: "B" },
    { from: "B", to: "C" },
    { from: "C", to: "D" }
]
```

**backEdges:**
```javascript
[
    { from: "D", to: "B" }
]
```

#### 2. 点線ノードの作成

**計算:**
- 元ノード `B` の子孫最大深度: `depth 2` (D)
- 親ノード `D` の深度: `depth 3`
- 点線ノードの最小深度: `Math.max(2 + 1, 3 + 1) = 4`

**点線ノード:**
```javascript
{
    id: "B_dashed_D",
    label: "子1",         // Bと同じラベル
    originalId: "B",
    isDashed: true,
    minDepth: 4
}
```

#### 3. 点線エッジの作成

```javascript
{
    from: "D",
    to: "B_dashed_D",
    originalTo: "B",
    isDashed: true
}
```

### 最終グラフ構造

**通常ノード:** A, B, C, D
**点線ノード:** B_dashed_D
**通常エッジ:** A→B, B→C, C→D
**点線エッジ:** D→B_dashed_D

**レイアウト結果（概念図）:**
```
Depth 0:  A
Depth 1:  B
Depth 2:  C
Depth 3:  D
Depth 4:  B_dashed_D  (点線、Bのコピー)
          ↑
          点線エッジ（Dから）
```

---

## 複数バックエッジの処理

複数のバックエッジがある場合、それぞれ独立して処理される。

**例:**
```mermaid
A --> B
B --> C
C --> A    # バックエッジ1
C --> B    # バックエッジ2
```

**生成される点線ノード:**
1. `A_dashed_C` (バックエッジ1用)
2. `B_dashed_C` (バックエッジ2用)

---

## 出力データ

### dashedNodes配列

```javascript
[
    {
        id: "B_dashed_D",
        label: "子1",
        originalId: "B",
        isDashed: true,
        minDepth: 4
    }
]
```

### dashedEdges配列

```javascript
[
    {
        from: "D",
        to: "B_dashed_D",
        originalTo: "B",
        isDashed: true
    }
]
```

---

## コンソール出力

```
Created 1 dashed node(s) and 1 dashed edge(s)
```

---

## データの引き渡し

処理後、以下のデータがHTML生成に渡される:

- `nodes` - 元のノード配列（変更なし）
- `regularConnections` - バックエッジを除いた通常エッジ
- `dashedNodes` - 生成された点線ノード配列
- `dashedEdges` - 生成された点線エッジ配列
- `styles` - スタイル定義
- `classDefs` - クラス定義

---

## 次のプロセス

これらのデータは、HTML生成（05-html-generation.md）に渡される。

---

## 関連ファイル

- `cli/main.js` - バックエッジ処理の実装
- `src/core/generators/html.js` - 点線ノード・エッジの受け取り
