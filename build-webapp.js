const fs = require('fs');

// main.jsが使う関数を全てブラウザ向けに変換
function buildEmbeddedCode() {
    let code = '\n';

    // 1. パーサー (parseMermaidNodes, parseMermaidConnections)
    const parserContent = fs.readFileSync('./src/parsers/mermaid.js', 'utf8');
    const parseMermaidNodesMatch = parserContent.match(/function parseMermaidNodes[\s\S]*?(?=\nfunction|module\.exports)/);
    const parseMermaidConnectionsMatch = parserContent.match(/function parseMermaidConnections[\s\S]*?(?=\nmodule\.exports)/);

    code += '// パーサー\n';
    if (parseMermaidNodesMatch) code += parseMermaidNodesMatch[0] + '\n\n';
    if (parseMermaidConnectionsMatch) code += parseMermaidConnectionsMatch[0] + '\n\n';

    // 2. バリデーター (validateTreeStructure)
    const validatorContent = fs.readFileSync('./src/validators/tree-validator.js', 'utf8');
    const validateTreeStructureMatch = validatorContent.match(/function validateTreeStructure[\s\S]*?(?=\nmodule\.exports)/);

    code += '// バリデーター\n';
    if (validateTreeStructureMatch) code += validateTreeStructureMatch[0] + '\n\n';

    // 3. 各getterファイルの内容を取得（module.exportsを削除）
    const getBaseTemplate = fs.readFileSync('./src/templates/base.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getLayoutUtils = fs.readFileSync('./src/utils/layout-utils.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getTreeStructureAnalyzer = fs.readFileSync('./src/utils/tree-structure.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getVerticalLayout = fs.readFileSync('./src/layouts/vertical-layout.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getHorizontalLayout = fs.readFileSync('./src/layouts/horizontal-layout.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getConnectionRenderer = fs.readFileSync('./src/features/connection-renderer.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getCollapseManager = fs.readFileSync('./src/features/collapse-manager.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getLayoutSwitcher = fs.readFileSync('./src/features/layout-switcher.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getViewportManager = fs.readFileSync('./src/features/viewport-manager.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getHighlightManager = fs.readFileSync('./src/features/highlight-manager.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getPathHighlighter = fs.readFileSync('./src/features/path-highlighter.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getContextMenu = fs.readFileSync('./src/features/context-menu.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');

    code += '// テンプレートとユーティリティ\n';
    code += getBaseTemplate + '\n';
    code += getLayoutUtils + '\n';
    code += getTreeStructureAnalyzer + '\n\n';

    code += '// レイアウト\n';
    code += getVerticalLayout + '\n';
    code += getHorizontalLayout + '\n\n';

    code += '// 機能\n';
    code += getConnectionRenderer + '\n';
    code += getCollapseManager + '\n';
    code += getLayoutSwitcher + '\n';
    code += getViewportManager + '\n';
    code += getHighlightManager + '\n';
    code += getPathHighlighter + '\n';
    code += getContextMenu + '\n\n';

    // 4. html.jsのgenerateHTML, getJavaScriptContent, generateErrorHTML
    const htmlContent = fs.readFileSync('./src/generators/html.js', 'utf8');

    // 関数を抽出（次の関数定義またはmodule.exportsまで）
    function extractFunction(content, functionName) {
        const startPattern = new RegExp(`function ${functionName}\\([^)]*\\)\\s*\\{`);
        const match = content.match(startPattern);
        if (!match) return null;

        const startIndex = match.index;

        // 次の関数定義またはmodule.exportsを探す
        const nextFunctionPattern = /\n(?:function |module\.exports)/g;
        nextFunctionPattern.lastIndex = startIndex + match[0].length;
        const nextMatch = nextFunctionPattern.exec(content);

        let endIndex;
        if (nextMatch) {
            // 次の関数の直前までを取得（空行を1つ残す）
            endIndex = nextMatch.index;
        } else {
            // 最後の関数の場合はファイル末尾まで
            endIndex = content.length;
        }

        return content.substring(startIndex, endIndex).trim();
    }

    const generateHTMLCode = extractFunction(htmlContent, 'generateHTML');
    const getJavaScriptContentCode = extractFunction(htmlContent, 'getJavaScriptContent');
    const generateErrorHTMLCode = extractFunction(htmlContent, 'generateErrorHTML');

    code += '// ジェネレーター（html.jsから）\n';
    if (generateHTMLCode) code += generateHTMLCode + '\n\n';
    if (getJavaScriptContentCode) {
        // </script>をエスケープしてブラウザでscriptタグが閉じられないようにする
        code += getJavaScriptContentCode.replace(/<\/script>/g, '<\\/script>') + '\n\n';
    }
    if (generateErrorHTMLCode) code += generateErrorHTMLCode + '\n\n';

    return code;
}

// webappテンプレートを読み込み
const template = fs.readFileSync('./webapp-template.html', 'utf8');

// ${EMBEDDED_CODE}を埋め込みコードで置換
const embeddedCode = buildEmbeddedCode();
const finalWebapp = template.replace('${EMBEDDED_CODE}', embeddedCode);

// webapp.htmlを出力
fs.writeFileSync('./webapp.html', finalWebapp, 'utf8');

console.log('webapp.html を生成しました');