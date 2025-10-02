const fs = require('fs');

// main.jsが使う関数を全てブラウザ向けに変換
function buildEmbeddedCode() {
    let code = '\n';

    // 1. パーサー (parseMermaidNodes, parseMermaidConnections, parseMermaidStyles, parseMermaidClassDefs)
    const parserContent = fs.readFileSync('./src/core/parsers/mermaid.js', 'utf8');
    const parseMermaidNodesMatch = parserContent.match(/function parseMermaidNodes[\s\S]*?(?=\n\/\/ Parse Mermaid connections|function parse)/);
    const parseMermaidConnectionsMatch = parserContent.match(/function parseMermaidConnections[\s\S]*?(?=\n\/\/ Parse Mermaid style|function parse)/);
    const parseMermaidStylesMatch = parserContent.match(/function parseMermaidStyles[\s\S]*?(?=\n\/\/ Parse Mermaid class|function parse)/);
    const parseMermaidClassDefsMatch = parserContent.match(/function parseMermaidClassDefs[\s\S]*?(?=\nmodule\.exports)/);

    code += '// パーサー\n';
    if (parseMermaidNodesMatch) code += parseMermaidNodesMatch[0] + '\n\n';
    if (parseMermaidConnectionsMatch) code += parseMermaidConnectionsMatch[0] + '\n\n';
    if (parseMermaidStylesMatch) code += parseMermaidStylesMatch[0] + '\n\n';
    if (parseMermaidClassDefsMatch) code += parseMermaidClassDefsMatch[0] + '\n\n';

    // 2. バリデーター (validateTreeStructure)
    const validatorContent = fs.readFileSync('./src/core/validators/tree-validator.js', 'utf8');
    const validateTreeStructureMatch = validatorContent.match(/function validateTreeStructure[\s\S]*?(?=\nmodule\.exports)/);

    code += '// バリデーター\n';
    if (validateTreeStructureMatch) code += validateTreeStructureMatch[0] + '\n\n';

    // 3. 各getterファイルの内容を取得（module.exportsを削除）
    const getBaseTemplate = fs.readFileSync('./src/templates/base.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getLayoutUtils = fs.readFileSync('./src/shared/layout-utils.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getSVGHelpers = fs.readFileSync('./src/shared/svg-helpers.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getTreeStructureAnalyzer = fs.readFileSync('./src/shared/tree-structure.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getVerticalLayout = fs.readFileSync('./src/core/layouts/vertical-layout.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getHorizontalLayout = fs.readFileSync('./src/core/layouts/horizontal-layout.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getConnectionRenderer = fs.readFileSync('./src/runtime/rendering/connections/renderer.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getShadowManager = fs.readFileSync('./src/runtime/rendering/effects/shadow-manager.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getCollapseManager = fs.readFileSync('./src/runtime/state/collapse-manager.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getLayoutSwitcher = fs.readFileSync('./src/runtime/ui/layout-switcher.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getViewportManager = fs.readFileSync('./src/runtime/ui/viewport-manager.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getHighlightManager = fs.readFileSync('./src/runtime/state/highlight-manager.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getPathHighlighter = fs.readFileSync('./src/runtime/state/path-highlighter.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getContextMenu = fs.readFileSync('./src/runtime/ui/context-menu.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');

    code += '// テンプレートとユーティリティ\n';
    code += getBaseTemplate + '\n';
    code += getLayoutUtils + '\n';
    code += getSVGHelpers + '\n';
    code += getTreeStructureAnalyzer + '\n\n';

    code += '// レイアウト\n';
    code += getVerticalLayout + '\n';
    code += getHorizontalLayout + '\n\n';

    code += '// 機能\n';
    code += getConnectionRenderer + '\n';
    code += getShadowManager + '\n';
    code += getCollapseManager + '\n';
    code += getLayoutSwitcher + '\n';
    code += getViewportManager + '\n';
    code += getHighlightManager + '\n';
    code += getPathHighlighter + '\n';
    code += getContextMenu + '\n\n';

    // 4. html.jsのgenerateHTML, getJavaScriptContent, generateErrorHTML
    const htmlContent = fs.readFileSync('./src/core/generators/html.js', 'utf8');

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
const template = fs.readFileSync('./tests/outputs/webapp-template.html', 'utf8');

// ${EMBEDDED_CODE}を埋め込みコードで置換
const embeddedCode = buildEmbeddedCode();
const finalWebapp = template.replace('${EMBEDDED_CODE}', embeddedCode);

// webapp.htmlを出力
fs.writeFileSync('./tests/outputs/webapp.html', finalWebapp, 'utf8');

console.log('webapp.html を生成しました');