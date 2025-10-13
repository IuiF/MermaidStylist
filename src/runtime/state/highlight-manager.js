function getHighlightManager() {
    return `
        const HIGHLIGHT_CONSTANTS = {
            DEFAULT_DURATION: 2000    // ハイライトのデフォルト持続時間(ms)
        };

        const highlightManager = {
            currentHighlightedLabel: null,
            currentHighlightedNodeId: null,
            currentHighlightTimeout: null,
            currentRelationNodeId: null,

            highlightAllByLabel: function(label) {
                this.clearHighlight();

                nodes.forEach(node => {
                    if (node.label === label) {
                        const nodeElement = svgHelpers.getNodeElement(node.id);
                        if (nodeElement) {
                            nodeElement.classList.add('highlighted');

                            if (nodeElement.classList.contains('path-highlighted')) {
                                svgHelpers.addDoubleStroke(nodeElement);
                            }
                        }
                    }
                });

                this.currentHighlightedLabel = label;
            },

            clearHighlight: function() {
                if (this.currentHighlightedLabel) {
                    nodes.forEach(node => {
                        if (node.label === this.currentHighlightedLabel) {
                            const nodeElement = svgHelpers.getNodeElement(node.id);
                            if (nodeElement) {
                                nodeElement.classList.remove('highlighted');
                                svgHelpers.removeDoubleStroke(nodeElement);
                            }
                        }
                    });
                    this.currentHighlightedLabel = null;
                }
            },

            highlightOriginalNode: function(originalNodeId, duration = HIGHLIGHT_CONSTANTS.DEFAULT_DURATION) {
                // 既存のハイライトをクリア
                if (this.currentHighlightTimeout) {
                    clearTimeout(this.currentHighlightTimeout);
                }
                if (this.currentHighlightedNodeId) {
                    const prevNode = svgHelpers.getNodeElement(this.currentHighlightedNodeId);
                    if (prevNode) {
                        prevNode.classList.remove('highlighted');
                        svgHelpers.removeDoubleStroke(prevNode);
                    }
                }

                // 新しいハイライトを設定
                const nodeElement = svgHelpers.getNodeElement(originalNodeId);
                if (!nodeElement) {
                    return;
                }

                nodeElement.classList.add('highlighted');
                svgHelpers.addDoubleStroke(nodeElement);
                this.currentHighlightedNodeId = originalNodeId;

                this.currentHighlightTimeout = setTimeout(() => {
                    nodeElement.classList.remove('highlighted');
                    svgHelpers.removeDoubleStroke(nodeElement);
                    this.currentHighlightedNodeId = null;
                    this.currentHighlightTimeout = null;
                }, duration);
            },

            highlightRelations: function(nodeId) {
                this.currentRelationNodeId = nodeId;

                // 親ノードを特定
                const parents = allConnections.filter(conn => conn.to === nodeId).map(conn => conn.from);
                // 子ノードを特定
                const children = allConnections.filter(conn => conn.from === nodeId).map(conn => conn.to);

                // 対象ノード自身をハイライト
                const targetNode = svgHelpers.getNodeElement(nodeId);
                if (targetNode) {
                    targetNode.classList.add('relation-highlighted', 'relation-target');
                }

                // 親ノードをハイライト
                parents.forEach(parentId => {
                    const parentNode = svgHelpers.getNodeElement(parentId);
                    if (parentNode) {
                        parentNode.classList.add('relation-highlighted', 'relation-parent');
                    }
                });

                // 子ノードをハイライト
                children.forEach(childId => {
                    const childNode = svgHelpers.getNodeElement(childId);
                    if (childNode) {
                        childNode.classList.add('relation-highlighted', 'relation-child');
                    }
                });

                // 関連するエッジをハイライト
                allConnections.forEach(conn => {
                    if (conn.from === nodeId || conn.to === nodeId) {
                        // エッジを最前面に移動（edge-highlighter機能を使用）
                        window.edgeHighlighter.bringToFront(conn.from, conn.to);

                        // CSSクラスを追加
                        const edgeElements = document.querySelectorAll(\`.connection-line[data-from="\${conn.from}"][data-to="\${conn.to}"], .connection-arrow[data-from="\${conn.from}"][data-to="\${conn.to}"]\`);
                        edgeElements.forEach(edgeElement => {
                            if (edgeElement) {
                                edgeElement.classList.add('relation-edge-highlighted');
                            }
                        });
                    }
                });
            },

            clearRelationHighlight: function() {
                // ノードのハイライトを解除
                document.querySelectorAll('.relation-highlighted').forEach(node => {
                    node.classList.remove('relation-highlighted', 'relation-target', 'relation-parent', 'relation-child');
                });

                // エッジのハイライトを解除
                document.querySelectorAll('.relation-edge-highlighted').forEach(edge => {
                    edge.classList.remove('relation-edge-highlighted');
                });

                this.currentRelationNodeId = null;
            },

            reapplyRelationHighlight: function() {
                if (this.currentRelationNodeId) {
                    const nodeId = this.currentRelationNodeId;
                    // 一旦クリア（currentRelationNodeIdは保持）
                    document.querySelectorAll('.relation-highlighted').forEach(node => {
                        node.classList.remove('relation-highlighted', 'relation-target', 'relation-parent', 'relation-child');
                    });
                    document.querySelectorAll('.relation-edge-highlighted').forEach(edge => {
                        edge.classList.remove('relation-edge-highlighted');
                    });

                    // 再適用
                    this.highlightRelations(nodeId);
                }
            }
        };

        window.highlightManager = highlightManager;
    `;
}

module.exports = {
    getHighlightManager
};