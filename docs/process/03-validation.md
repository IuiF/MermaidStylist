# プロセス3: バリデーション

## 目的

パースされたグラフ構造が有効なDAG（有向非巡環グラフ）であるか検証し、サイクルが存在する場合はバックエッジを識別する。

## 実装場所

- `src/core/validators/tree-validator.js`

## DAGの条件

このツールが受け入れるグラフ構造:

1. **ルートノードが存在する** - 親を持たないノードが1つ以上
2. **サイクルがないか、バックエッジとして処理できる**
3. **複数の親を持つノードを許容** - DAGとして有効

## 処理の流れ

### 1. ルートノードの検出

**定義:**
ルートノード = どの接続でも `to` として登場しないノード

**実装:**
```javascript
const childNodes = new Set(connections.map(c => c.to));
const rootNodes = nodes.filter(n => !childNodes.has(n.id));
```

**バリデーション:**
- ルートノードが1つも存在しない → エラー

**エラーメッセージ:**
```
グラフにはルートノード（親を持たないノード）が必要です
```

---

### 2. サイクル検出とバックエッジ識別

#### アルゴリズム: DFS（深さ優先探索）+ バックエッジ検出

グラフ理論におけるバックエッジとは、DFS木において祖先ノードへ戻る辺のこと。

#### ノードの状態管理

各ノードは以下の3つの状態を持つ:

1. **WHITE（未訪問）** - まだ訪問していない
2. **GRAY（訪問中）** - 現在のDFSパスで訪問中
3. **BLACK（訪問済み）** - すべての子孫を探索済み

#### バックエッジの定義

**GRAY（訪問中）のノードへのエッジ = バックエッジ**

これは「自分の祖先に戻るエッジ」を意味し、サイクルを形成する。

#### 処理手順

1. **初期化**
   - すべてのノードをWHITEに設定
   - 各ルートノードからDFSを開始

2. **DFS探索**
   ```
   function visit(nodeId):
       状態をGRAYに変更（訪問中）

       for each 子ノード in nodeIdの子:
           if 子ノードがGRAY:
               → バックエッジ発見！
               backEdges.add(nodeId → 子ノード)
           else if 子ノードがWHITE:
               → 通常の探索
               visit(子ノード)

       状態をBLACKに変更（訪問済み）
   ```

3. **結果判定**
   - バックエッジが0個 → 有効なDAG
   - バックエッジが存在 → サイクルあり（バックエッジとして処理可能）
   - 訪問できないノードが存在 → 孤立した部分グラフ（エラー）

---

### 3. 孤立ノードのチェック

DFS後、すべてのノードがBLACKになっているか確認。

**WHITEのままのノード = ルートから到達不可能**

**エラーメッセージ:**
```
以下のノードはルートから到達できません: [ノードID...]
```

---

## 出力データ構造

### 成功時（バックエッジなし）

```javascript
{
    isValid: true,
    errors: [],
    backEdges: []
}
```

### 成功時（バックエッジあり）

```javascript
{
    isValid: true,
    errors: [],
    backEdges: [
        { from: "C", to: "A" },
        { from: "D", to: "B" }
    ]
}
```

### エラー時

```javascript
{
    isValid: false,
    errors: [
        "グラフにはルートノード（親を持たないノード）が必要です",
        "以下のノードはルートから到達できません: X, Y"
    ],
    backEdges: []
}
```

---

## バリデーション例

### 例1: 有効なDAG（サイクルなし）

**入力:**
```mermaid
A --> B
A --> C
B --> D
C --> D
```

**構造:**
```
A (ルート)
├→ B
│  └→ D
└→ C
   └→ D
```

**結果:**
```javascript
{
    isValid: true,
    backEdges: []
}
```

**コンソール:**
```
Validation passed: Valid DAG structure
```

---

### 例2: サイクルあり（バックエッジで解決）

**入力:**
```mermaid
A --> B
B --> C
C --> A    # バックエッジ
```

**DFS探索:**
```
1. A を訪問 (GRAY)
2. B を訪問 (GRAY)
3. C を訪問 (GRAY)
4. C→A を発見: A は GRAY → バックエッジ！
5. C を完了 (BLACK)
6. B を完了 (BLACK)
7. A を完了 (BLACK)
```

**結果:**
```javascript
{
    isValid: true,
    backEdges: [
        { from: "C", to: "A" }
    ]
}
```

**コンソール:**
```
Validation passed: Found 1 back edge(s) (will be rendered as dashed)
  - C --> A (back edge)
```

---

### 例3: ルートノードなし（エラー）

**入力:**
```mermaid
A --> B
B --> A
```

全てのノードが `to` として登場 → ルートノードが存在しない

**結果:**
```javascript
{
    isValid: false,
    errors: [
        "グラフにはルートノード（親を持たないノード）が必要です"
    ],
    backEdges: []
}
```

**処理:**
- エラーHTMLを生成
- 処理を終了

---

### 例4: 孤立ノード（エラー）

**入力:**
```mermaid
A --> B
C --> D    # 孤立した部分グラフ
```

**DFS結果:**
- A, B は訪問済み (BLACK)
- C, D は未訪問のまま (WHITE)

**結果:**
```javascript
{
    isValid: false,
    errors: [
        "以下のノードはルートから到達できません: C, D"
    ],
    backEdges: []
}
```

---

## バックエッジの意味

バックエッジは「サイクルを形成するが、削除すればDAGになるエッジ」。

このツールでは:
- バックエッジを**点線**として描画
- 点線ノードを追加してDAG構造を保持
- レイアウトアルゴリズムが正常に動作

---

## 複数ルートの処理

複数のルートノードが存在する場合も有効:

**入力:**
```mermaid
A --> C
B --> C
```

**ルートノード:** A, B
**結果:** 有効なDAG

各ルートから個別にDFSを実行し、すべてのノードを訪問する。

---

## コンソール出力パターン

### パターン1: 正常（バックエッジなし）
```
Validation passed: Valid DAG structure
```

### パターン2: 正常（バックエッジあり）
```
Validation passed: Found 2 back edge(s) (will be rendered as dashed)
  - C --> A (back edge)
  - D --> B (back edge)
```

### パターン3: エラー
```
Validation failed: Tree structure is invalid
  - グラフにはルートノード（親を持たないノード）が必要です
  - 以下のノードはルートから到達できません: X, Y
```

---

## 次のプロセス

### バリデーション成功時
バックエッジ情報と共に、バックエッジ処理（04-back-edge-handling.md）に進む。

### バリデーションエラー時
エラーHTMLを生成し、処理を終了。

---

## 関連ファイル

- `src/core/validators/tree-validator.js` - バリデーター実装
- `cli/main.js` - バリデーション結果の処理
