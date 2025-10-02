function getSVGHelpers() {
    return `
        const svgHelpers = {
            createElement: function(type, attributes = {}) {
                const element = document.createElementNS('http://www.w3.org/2000/svg', type);
                for (const [key, value] of Object.entries(attributes)) {
                    if (value !== null && value !== undefined) {
                        element.setAttribute(key, value);
                    }
                }
                return element;
            },

            createRect: function(attributes = {}) {
                return this.createElement('rect', attributes);
            },

            createText: function(content, attributes = {}) {
                const element = this.createElement('text', attributes);
                element.textContent = content;
                return element;
            },

            createGroup: function(attributes = {}) {
                return this.createElement('g', attributes);
            },

            createLine: function(attributes = {}) {
                return this.createElement('line', attributes);
            },

            createPolygon: function(points, attributes = {}) {
                return this.createElement('polygon', { ...attributes, points });
            },

            createPath: function(d, attributes = {}) {
                return this.createElement('path', { ...attributes, d });
            },

            getSVGLayer: function() {
                // 後方互換性のためnodeLayerを返す
                return document.getElementById('nodeLayer');
            },

            getNodeLayer: function() {
                return document.getElementById('nodeLayer');
            },

            getEdgeLayer: function() {
                return document.getElementById('edgeLayer');
            },

            getNodeElement: function(nodeId) {
                return document.getElementById(nodeId);
            },

            parseTransform: function(transformAttr) {
                let x = 0, y = 0;
                if (transformAttr) {
                    const match = transformAttr.match(/translate\\(([^,\\s]+)\\s*,\\s*([^)]+)\\)/);
                    if (match) {
                        x = parseFloat(match[1]);
                        y = parseFloat(match[2]);
                    }
                }
                return { x, y };
            },

            // HTMLタグをパースしてテキスト要素を作成
            createRichText: function(htmlContent, attributes = {}) {
                const textElement = this.createElement('text', attributes);
                const fontSize = parseFloat(attributes['font-size'] || 12);
                const lineHeight = fontSize * 1.2;

                // <br>で分割
                const lines = htmlContent.split(/<br\\s*\\/?>/i);

                // 複数行の場合、最初の行のy座標を調整して中央揃えにする
                const totalHeight = lines.length * lineHeight;
                const startY = (attributes.y || 0) - (totalHeight / 2) + (lineHeight / 2);

                lines.forEach((line, lineIndex) => {
                    const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
                    tspan.setAttribute('x', attributes.x || 0);

                    if (lineIndex === 0) {
                        tspan.setAttribute('y', startY);
                    } else {
                        tspan.setAttribute('dy', lineHeight);
                    }

                    // <b>, <i>, <small>タグをパース
                    const parts = line.split(/(<b>|<\\/b>|<i>|<\\/i>|<small>|<\\/small>)/i);
                    let isBold = false;
                    let isItalic = false;
                    let isSmall = false;

                    parts.forEach(part => {
                        if (part.match(/<b>/i)) {
                            isBold = true;
                        } else if (part.match(/<\\/b>/i)) {
                            isBold = false;
                        } else if (part.match(/<i>/i)) {
                            isItalic = true;
                        } else if (part.match(/<\\/i>/i)) {
                            isItalic = false;
                        } else if (part.match(/<small>/i)) {
                            isSmall = true;
                        } else if (part.match(/<\\/small>/i)) {
                            isSmall = false;
                        } else if (part) {
                            if (isBold || isItalic || isSmall) {
                                const styledTspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
                                if (isBold) styledTspan.style.fontWeight = 'bold';
                                if (isItalic) styledTspan.style.fontStyle = 'italic';
                                if (isSmall) styledTspan.style.fontSize = (fontSize * 0.8) + 'px';
                                styledTspan.textContent = part;
                                tspan.appendChild(styledTspan);
                            } else {
                                const textNode = document.createTextNode(part);
                                tspan.appendChild(textNode);
                            }
                        }
                    });

                    textElement.appendChild(tspan);
                });

                return textElement;
            },

            // HTMLタグを含むテキストのサイズを計算
            measureRichText: function(htmlContent, fontSize = 12) {
                // HTMLタグを除去してプレーンテキストを取得
                const lines = htmlContent.split(/<br\\s*\\/?>/i);
                let maxWidth = 0;
                const lineHeight = fontSize * 1.2;

                // 一時的なテキスト要素で各行の幅を測定
                const svgLayer = this.getSVGLayer();

                lines.forEach(line => {
                    // 全てのタグを除去してプレーンテキストを取得
                    const plainText = line.replace(/<\\/?(?:b|i|small)>/gi, '');
                    const hasBold = /<b>/i.test(line);
                    const hasItalic = /<i>/i.test(line);
                    const hasSmall = /<small>/i.test(line);

                    const tempText = this.createText(plainText, {
                        'font-size': hasSmall ? fontSize * 0.8 : fontSize,
                        'font-family': 'Arial, sans-serif',
                        'font-weight': hasBold ? 'bold' : 'normal',
                        'font-style': hasItalic ? 'italic' : 'normal'
                    });
                    svgLayer.appendChild(tempText);
                    const width = tempText.getBBox().width;
                    svgLayer.removeChild(tempText);

                    maxWidth = Math.max(maxWidth, width);
                });

                const height = lines.length * lineHeight;
                return { width: maxWidth, height: height, lineCount: lines.length };
            }
        };
    `;
}

module.exports = {
    getSVGHelpers
};