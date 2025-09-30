// Parse Mermaid nodes from content
function parseMermaidNodes(content) {
    const nodes = [];
    const nodeMap = new Map();
    const lines = content.split('\n');

    // ノード定義パターン（様々な形状に対応）
    // より複雑なパターンを先に、シンプルなパターンを後に配置
    const nodePatterns = [
        // 引用符付き複雑な形状（長いパターンを先に）
        /([a-zA-Z0-9_-]+)\s*\(\[\s*"([^"]+)"\s*\]\)/,  // Stadium
        /([a-zA-Z0-9_-]+)\s*\[\[\s*"([^"]+)"\s*\]\]/,  // Subroutine
        /([a-zA-Z0-9_-]+)\s*\[\(\s*"([^"]+)"\s*\)\]/,  // Cylinder
        /([a-zA-Z0-9_-]+)\s*\(\(\s*"([^"]+)"\s*\)\)/,  // Circle
        /([a-zA-Z0-9_-]+)\s*\{\{\s*"([^"]+)"\s*\}\}/,  // Hexagon
        /([a-zA-Z0-9_-]+)\s*\[\/\s*"([^"]+)"\s*\/\]/,  // Trapezoid
        /([a-zA-Z0-9_-]+)\s*\[\\\s*"([^"]+)"\s*\\\]/,  // Reverse Trapezoid
        /([a-zA-Z0-9_-]+)\s*\[\/\s*"([^"]+)"\s*\\\]/,  // Parallelogram
        /([a-zA-Z0-9_-]+)\s*\[\\\s*"([^"]+)"\s*\/\]/,  // Reverse Parallelogram
        /([a-zA-Z0-9_-]+)\s*>\s*"([^"]+)"\s*\]/,        // Asymmetric

        // 引用符付きシンプルな形状
        /([a-zA-Z0-9_-]+)\s*\[\s*"([^"]+)"\s*\]/,  // Square
        /([a-zA-Z0-9_-]+)\s*\(\s*"([^"]+)"\s*\)/,  // Round
        /([a-zA-Z0-9_-]+)\s*\{\s*"([^"]+)"\s*\}/,  // Diamond

        // 引用符なし複雑な形状（長いパターンを先に）
        /([a-zA-Z0-9_-]+)\s*\(\[\s*([^\]]+)\s*\]\)/,  // Stadium
        /([a-zA-Z0-9_-]+)\s*\[\[\s*([^\]]+)\s*\]\]/,  // Subroutine
        /([a-zA-Z0-9_-]+)\s*\[\(\s*([^\)]+)\s*\)\]/,  // Cylinder
        /([a-zA-Z0-9_-]+)\s*\(\(\s*([^\)]+)\s*\)\)/,  // Circle
        /([a-zA-Z0-9_-]+)\s*\{\{\s*([^\}]+)\s*\}\}/,  // Hexagon
        /([a-zA-Z0-9_-]+)\s*\[\/\s*([^\/\]]+)\s*\/\]/,  // Trapezoid
        /([a-zA-Z0-9_-]+)\s*\[\\\s*([^\\\]]+)\s*\\\]/,  // Reverse Trapezoid
        /([a-zA-Z0-9_-]+)\s*\[\/\s*([^\\\]]+)\s*\\\]/,  // Parallelogram
        /([a-zA-Z0-9_-]+)\s*\[\\\s*([^\/\]]+)\s*\/\]/,  // Reverse Parallelogram
        /([a-zA-Z0-9_-]+)\s*>\s*([^\]]+)\s*\]/,        // Asymmetric

        // 引用符なしシンプルな形状（最後に）
        /([a-zA-Z0-9_-]+)\s*\[\s*([^\]]+)\s*\]/,  // Square
        /([a-zA-Z0-9_-]+)\s*\(\s*([^\)]+)\s*\)/,  // Round
        /([a-zA-Z0-9_-]+)\s*\{\s*([^\}]+)\s*\}/   // Diamond
    ];

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('%%') || trimmedLine.startsWith('graph') || trimmedLine.startsWith('flowchart')) {
            continue;
        }

        // パターンマッチング
        for (const pattern of nodePatterns) {
            const match = trimmedLine.match(pattern);
            if (match) {
                const id = match[1];
                const label = match[2].trim();
                if (!nodeMap.has(id)) {
                    nodeMap.set(id, { id, label });
                }
                break;  // 最初にマッチしたパターンで終了
            }
        }
    }

    // 接続からもノードを抽出
    const connectionPattern = /([a-zA-Z0-9_-]+)\s*(?:-->|---|==>|===|\.->|\.-|~~~)\s*([a-zA-Z0-9_-]+)/;
    for (const line of lines) {
        const trimmedLine = line.trim();
        const match = trimmedLine.match(connectionPattern);
        if (match) {
            const fromId = match[1];
            const toId = match[2];

            // ノードが定義されていない場合、IDをラベルとして使用
            if (!nodeMap.has(fromId)) {
                nodeMap.set(fromId, { id: fromId, label: fromId });
            }
            if (!nodeMap.has(toId)) {
                nodeMap.set(toId, { id: toId, label: toId });
            }
        }
    }

    return Array.from(nodeMap.values());
}

// Parse Mermaid connections from content
function parseMermaidConnections(content) {
    const connections = [];
    const lines = content.split('\n');

    // 接続パターン（様々なタイプに対応）
    const connectionPatterns = [
        // テキスト付き接続
        /([a-zA-Z0-9_-]+)\s*--\s*([^-]+)\s*-->\s*([a-zA-Z0-9_-]+)/,
        /([a-zA-Z0-9_-]+)\s*--\s*([^-]+)\s*---\s*([a-zA-Z0-9_-]+)/,
        /([a-zA-Z0-9_-]+)\s*-\.\s*([^\.]+)\s*\.->\s*([a-zA-Z0-9_-]+)/,
        /([a-zA-Z0-9_-]+)\s*-\.\s*([^\.]+)\s*\.-\s*([a-zA-Z0-9_-]+)/,
        /([a-zA-Z0-9_-]+)\s*==\s*([^=]+)\s*==>\s*([a-zA-Z0-9_-]+)/,
        /([a-zA-Z0-9_-]+)\s*==\s*([^=]+)\s*===\s*([a-zA-Z0-9_-]+)/,

        // シンプルな接続
        /([a-zA-Z0-9_-]+)\s*-->\s*([a-zA-Z0-9_-]+)/,
        /([a-zA-Z0-9_-]+)\s*---\s*([a-zA-Z0-9_-]+)/,
        /([a-zA-Z0-9_-]+)\s*\.->\\s*([a-zA-Z0-9_-]+)/,
        /([a-zA-Z0-9_-]+)\s*\.-\s*([a-zA-Z0-9_-]+)/,
        /([a-zA-Z0-9_-]+)\s*==>\s*([a-zA-Z0-9_-]+)/,
        /([a-zA-Z0-9_-]+)\s*===\s*([a-zA-Z0-9_-]+)/,
        /([a-zA-Z0-9_-]+)\s*~~~\s*([a-zA-Z0-9_-]+)/
    ];

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('%%') || trimmedLine.startsWith('graph') || trimmedLine.startsWith('flowchart')) {
            continue;
        }

        for (const pattern of connectionPatterns) {
            const match = trimmedLine.match(pattern);
            if (match) {
                const from = match[1];
                const to = match[match.length - 1];
                connections.push({ from, to });
                break;
            }
        }
    }

    return connections;
}

module.exports = {
    parseMermaidNodes,
    parseMermaidConnections
};