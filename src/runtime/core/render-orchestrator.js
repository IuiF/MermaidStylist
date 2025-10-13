/**
 * 描画プロセスのメインオーケストレーター
 *
 * 描画フロー:
 * 1. ノード作成フェーズ - SVGノード要素の生成
 * 2. 初期化フェーズ - 各マネージャーの初期化
 * 3. レイアウト計算フェーズ - ノード位置の計算
 * 4. 描画フェーズ - エッジとラベルの描画
 * 5. 最終調整フェーズ - Z-order調整、ビューポート調整
 */

function getRenderOrchestrator() {
    return `
        const NODE_RENDER_CONSTANTS = {
            PADDING: 12,
            COLLAPSE_BUTTON_WIDTH: 15,
            COLLAPSE_BUTTON_OFFSET: 5,
            BASE_HEIGHT: 28,
            BORDER_RADIUS: 5,
            FONT_SIZE: 12,
            FONT_FAMILY: 'Arial, sans-serif',
            DASHED_STROKE: '5,5',
            DASHED_OPACITY: '0.6'
        };

        /**
         * 描画プロセスのメイン関数
         * すべての描画処理をこの関数から順序立てて実行する
         */
        function initializeAndRender() {
            console.log('[Render] Starting render process...');

            // フェーズ1: ノード作成
            console.log('[Render] Phase 1: Creating SVG nodes');
            createSVGNodes();

            // フェーズ2: マネージャー初期化
            console.log('[Render] Phase 2: Initializing managers');
            initializeManagers();

            // フェーズ3-5: レイアウト計算と描画（非同期）
            // DOMの準備が完了してから実行
            requestAnimationFrame(() => {
                console.log('[Render] Phase 3: Computing layout');
                const nodePositions = computeLayout();

                console.log('[Render] Phase 4: Rendering connections and labels');
                renderConnections(nodePositions);

                console.log('[Render] Phase 5: Final adjustments');
                applyFinalAdjustments();

                console.log('[Render] Render process completed');
            });
        }

        /**
         * フェーズ1: SVGノード要素を作成
         */
        function createSVGNodes() {
            const svgLayer = svgHelpers.getSVGLayer();

            // 通常のノードを作成
            nodes.forEach(node => {
                createSingleNode(node, false);
            });

            // 点線ノードを作成
            dashedNodes.forEach(node => {
                createSingleNode(node, true);
            });
        }

        /**
         * 単一ノードの作成
         */
        function createSingleNode(node, isDashed) {
            // 点線ノードの場合は元ノードの接続を確認
            const nodeIdToCheck = isDashed ? node.originalId : node.id;
            const hasChildren = allConnections.some(conn => conn.from === nodeIdToCheck);

            // グループ要素を作成
            const g = svgHelpers.createGroup({
                id: node.id,
                class: isDashed ? 'node dashed-node' : 'node',
                'data-label': node.label,
                'data-has-children': hasChildren,
                'data-is-dashed': isDashed
            });

            // テキストサイズを測定（HTMLタグ対応）
            const textSize = svgHelpers.measureRichText(node.label, NODE_RENDER_CONSTANTS.FONT_SIZE);

            const padding = NODE_RENDER_CONSTANTS.PADDING;
            const buttonWidth = hasChildren ? NODE_RENDER_CONSTANTS.COLLAPSE_BUTTON_WIDTH : 0;
            const boxWidth = textSize.width + padding * 2 + buttonWidth;
            const baseHeight = NODE_RENDER_CONSTANTS.BASE_HEIGHT;
            const boxHeight = Math.max(baseHeight, textSize.height + padding);

            // 背景矩形
            const rect = svgHelpers.createRect({
                class: isDashed ? 'node-rect dashed-rect' : 'node-rect',
                width: boxWidth,
                height: boxHeight,
                rx: NODE_RENDER_CONSTANTS.BORDER_RADIUS,
                ry: NODE_RENDER_CONSTANTS.BORDER_RADIUS
            });

            // 点線ノードの場合はスタイルを追加
            if (isDashed) {
                rect.style.strokeDasharray = NODE_RENDER_CONSTANTS.DASHED_STROKE;
                rect.style.opacity = NODE_RENDER_CONSTANTS.DASHED_OPACITY;
            }

            // テキスト（HTMLタグ対応）
            const text = svgHelpers.createRichText(node.label, {
                class: 'node-text',
                x: padding,
                y: boxHeight / 2,
                'dominant-baseline': 'central',
                'font-size': NODE_RENDER_CONSTANTS.FONT_SIZE.toString(),
                'font-family': NODE_RENDER_CONSTANTS.FONT_FAMILY
            });

            if (isDashed) {
                text.style.opacity = NODE_RENDER_CONSTANTS.DASHED_OPACITY;
            }

            g.appendChild(rect);
            g.appendChild(text);

            // スタイルを適用
            applyNodeStyle(rect, isDashed ? node.originalId : node.id, node.classes);

            // 折りたたみボタン
            if (hasChildren) {
                const button = svgHelpers.createText('▼', {
                    class: 'collapse-button',
                    x: boxWidth - padding - NODE_RENDER_CONSTANTS.COLLAPSE_BUTTON_OFFSET,
                    y: boxHeight / 2,
                    'dominant-baseline': 'central'
                });
                g.appendChild(button);
            }

            // データ属性を保存
            g.setAttribute('data-width', boxWidth);
            g.setAttribute('data-height', boxHeight);

            // 初期位置を(0,0)に設定
            g.setAttribute('transform', 'translate(0,0)');

            // イベントリスナーを追加
            attachNodeEventListeners(g, node, isDashed, hasChildren);

            const svgLayer = svgHelpers.getSVGLayer();
            svgLayer.appendChild(g);
        }

        /**
         * ノードにイベントリスナーを追加
         */
        function attachNodeEventListeners(element, node, isDashed, hasChildren) {
            if (hasChildren) {
                // 子を持つ場合：折りたたみ（点線ノードの場合は元ノードを折りたたむ）
                element.addEventListener('click', function() {
                    const targetNodeId = isDashed ? node.originalId : node.id;
                    toggleNodeCollapse(targetNodeId);
                });
            } else if (isDashed) {
                // 点線ノードで子を持たない場合：元ノードを強調表示
                element.addEventListener('click', function(e) {
                    e.stopPropagation();
                    highlightManager.highlightOriginalNode(node.originalId);
                });
                element.style.cursor = 'pointer';
            } else {
                // 通常ノードで子を持たない場合：同名ノードを強調表示
                element.addEventListener('click', function(e) {
                    e.stopPropagation();
                    highlightManager.highlightAllByLabel(node.label);
                });
                element.style.cursor = 'pointer';
            }
        }

        /**
         * フェーズ2: 各マネージャーの初期化
         */
        function initializeManagers() {
            collapseManager.init();
            viewportManager.init();
            contextMenu.init();
        }

        /**
         * フェーズ3: レイアウト計算
         * ノード位置を計算して配置
         */
        function computeLayout() {
            const nodePositions = redrawHelpers.recalculateLayout('horizontal');

            return nodePositions;
        }

        /**
         * フェーズ4: エッジとラベルの描画
         */
        function renderConnections(nodePositions) {
            currentNodePositions = nodePositions;
            createCSSLines(allConnections, currentNodePositions);
        }

        /**
         * フェーズ5: 最終調整
         * - ルートノードをZ-orderで最前面に移動
         * - ビューポートを初期位置に調整
         */
        function applyFinalAdjustments() {
            // ルートノードを最前面に移動
            bringRootNodesToFront();

            // コンテンツ全体が見えるように初期位置を調整
            redrawHelpers.updateViewport({ fitToContent: true });
        }

        /**
         * ルートノードを最前面に移動
         */
        function bringRootNodesToFront() {
            const svgLayer = svgHelpers.getNodeLayer();
            nodes.forEach(node => {
                const isRoot = !connections.some(conn => conn.to === node.id);
                if (isRoot) {
                    const element = document.getElementById(node.id);
                    if (element && element.parentNode === svgLayer) {
                        svgLayer.appendChild(element);
                    }
                }
            });
        }
    `;
}

module.exports = {
    getRenderOrchestrator
};
