function measureTextWidth(text, font) {
    // キャンバスを使用して正確な文字幅を測定
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = font;
    return context.measureText(text).width;
}

function calculateAllNodeWidths(nodes) {
    const padding = 24; // ボックスのパディング（左右12pxずつ）
    const nodeWidthMap = new Map();
    const font = '12px Arial, sans-serif'; // CSSで指定されているフォント

    // 全ノードのラベルから幅を計算
    nodes.forEach(node => {
        if (!nodeWidthMap.has(node.label)) {
            const textWidth = measureTextWidth(node.label, font);
            const calculatedWidth = Math.ceil(textWidth) + padding;
            nodeWidthMap.set(node.label, calculatedWidth);

            // デバッグ：長いラベルの幅計算を出力
            if (node.label.length > 8) {
                console.log("Debug: label=" + node.label + ", measured width=" + Math.ceil(textWidth) + "px, total width=" + calculatedWidth + "px");
            }
        }
    });

    return nodeWidthMap;
}

function calculateDynamicSpacing(nodes, containerWidth = 800, nodeWidthMap) {
    const fixedSpacing = 60; // 固定間隔（ノード端から端まで）
    const leftMargin = 50; // 左端マージン

    // 各ノードの幅を事前計算されたマップから取得
    const nodeWidths = nodes.map(node => {
        return nodeWidthMap.get(node.label);
    });

    if (nodes.length <= 1) {
        const singleNodeX = Math.max(leftMargin, (containerWidth - nodeWidths[0]) / 2);
        return {
            fixedSpacing,
            positions: [singleNodeX],
            nodeWidths,
            totalWidth: nodeWidths[0] || 0,
            uniformSpacing: fixedSpacing
        };
    }

    // 固定間隔での総幅を計算
    const totalNodeWidth = nodeWidths.reduce((sum, width) => sum + width, 0);
    const totalSpacingWidth = fixedSpacing * (nodes.length - 1);
    const totalLayoutWidth = totalNodeWidth + totalSpacingWidth;

    // 中央寄せの開始位置を計算（左マージンを下回らないよう調整）
    const idealStartX = (containerWidth - totalLayoutWidth) / 2;
    const startX = Math.max(leftMargin, idealStartX);

    // デバッグ：レイアウト情報を出力
    if (nodes.length > 3) {
        console.log("Layout debug: containerWidth=" + containerWidth + "px, totalLayoutWidth=" + totalLayoutWidth + "px, startX=" + startX + "px");
    }

    const positions = [];
    let currentX = startX;

    for (let i = 0; i < nodes.length; i++) {
        positions.push(currentX);
        currentX += nodeWidths[i] + fixedSpacing;
    }

    return {
        fixedSpacing,
        positions,
        nodeWidths,
        totalWidth: totalLayoutWidth,
        uniformSpacing: fixedSpacing,
        actualStartX: startX
    };
}

function debugActualWidths(nodes) {
    const nodeWidthMap = calculateAllNodeWidths(nodes);

    nodes.forEach(node => {
        const element = document.getElementById(node.id);
        if (element && node.label.length > 10) {
            const actualWidth = element.offsetWidth;
            const calculatedWidth = nodeWidthMap.get(node.label);
            const difference = actualWidth - calculatedWidth;

            console.log("Width comparison: " + node.label);
            console.log("  Calculated: " + calculatedWidth + "px, Actual: " + actualWidth + "px, Difference: " + difference + "px");
        }
    });
}