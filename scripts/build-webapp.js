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
    const getConnectionConstants = fs.readFileSync('./src/runtime/rendering/connections/constants.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getConnectionUtils = fs.readFileSync('./src/runtime/rendering/connections/utils.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getCollectors = fs.readFileSync('./src/runtime/rendering/connections/collectors.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getDepthUtils = fs.readFileSync('./src/runtime/rendering/connections/depth-utils.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getCollisionUtils = fs.readFileSync('./src/runtime/rendering/connections/collision-utils.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getPathYAdjuster = fs.readFileSync('./src/runtime/rendering/connections/path-y-adjuster.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getPathGenerator = fs.readFileSync('./src/runtime/rendering/connections/path-generator.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getEdgeSpacingCalculator = fs.readFileSync('./src/runtime/rendering/connections/edge-spacing-calculator.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getConnectionLabels = fs.readFileSync('./src/runtime/rendering/connections/labels.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getVerticalSegmentCalculator = fs.readFileSync('./src/runtime/rendering/connections/vertical-segment-calculator.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getEdgeCrossingDetector = fs.readFileSync('./src/runtime/rendering/connections/edge-crossing-detector.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    let getConnectionRenderer = fs.readFileSync('./src/runtime/rendering/connections/renderer.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    // renderer.jsのrequire文を削除
    getConnectionRenderer = getConnectionRenderer
        .replace(/\s*const connectionLabels = require\('\.\/labels'\)\.getConnectionLabels\(\);\s*/g, '\n')
        .replace(/\s*const verticalSegmentCalculator = require\('\.\/vertical-segment-calculator'\)\.getVerticalSegmentCalculator\(\);\s*/g, '\n')
        .replace(/\s*const edgeCrossingDetector = require\('\.\/edge-crossing-detector'\)\.getEdgeCrossingDetector\(\);\s*/g, '\n')
        .replace(/return connectionLabels \+ verticalSegmentCalculator \+ edgeCrossingDetector \+ `/g, 'return `');
    const getRedrawHelpers = fs.readFileSync('./src/runtime/rendering/redraw-helpers.js', 'utf8')
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
    const getEdgeHighlighter = fs.readFileSync('./src/runtime/state/edge-highlighter.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getContextMenu = fs.readFileSync('./src/runtime/ui/context-menu.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getRenderOrchestrator = fs.readFileSync('./src/runtime/core/render-orchestrator.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getTypes = fs.readFileSync('./src/core/layout/types.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getNodePlacer = fs.readFileSync('./src/core/layout/node-placer.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getCollisionResolver = fs.readFileSync('./src/core/layout/collision-resolver.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    const getEdgeRouter = fs.readFileSync('./src/core/layout/edge-router.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    let getLayoutEngine = fs.readFileSync('./src/core/layout/layout-engine.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};?/g, '');
    // layout-engine.jsのrequire文を削除
    getLayoutEngine = getLayoutEngine
        .replace(/\s*const types = require\('\.\/types'\)\.getTypes\(\);\s*/g, '\n')
        .replace(/\s*const nodePlacer = require\('\.\/node-placer'\)\.getNodePlacer\(\);\s*/g, '\n')
        .replace(/\s*const collisionResolver = require\('\.\/collision-resolver'\)\.getCollisionResolver\(\);\s*/g, '\n')
        .replace(/\s*const edgeRouter = require\('\.\/edge-router'\)\.getEdgeRouter\(\);\s*/g, '\n')
        .replace(/return types \+ nodePlacer \+ collisionResolver \+ edgeRouter \+ `/g, 'return `');

    code += '// テンプレートとユーティリティ\n';
    code += getBaseTemplate + '\n';
    code += getLayoutUtils + '\n';
    code += getSVGHelpers + '\n';
    code += getTreeStructureAnalyzer + '\n\n';

    code += '// レイアウト\n';
    code += getVerticalLayout + '\n\n';

    code += '// 接続描画機能\n';
    code += getConnectionConstants + '\n';
    code += getConnectionUtils + '\n';
    code += getCollectors + '\n';
    code += getDepthUtils + '\n';
    code += getCollisionUtils + '\n';
    code += getPathYAdjuster + '\n';
    code += getPathGenerator + '\n';
    code += getEdgeSpacingCalculator + '\n';
    code += getConnectionLabels + '\n';
    code += getVerticalSegmentCalculator + '\n';
    code += getEdgeCrossingDetector + '\n';
    code += getConnectionRenderer + '\n\n';

    code += '// レンダリング機能\n';
    code += getRedrawHelpers + '\n';
    code += getShadowManager + '\n\n';

    code += '// 状態管理\n';
    code += getCollapseManager + '\n';
    code += getHighlightManager + '\n';
    code += getPathHighlighter + '\n';
    code += getEdgeHighlighter + '\n\n';

    code += '// UI機能\n';
    code += getLayoutSwitcher + '\n';
    code += getViewportManager + '\n';
    code += getContextMenu + '\n\n';

    code += '// コアシステム\n';
    code += getRenderOrchestrator + '\n\n';

    code += '// V2レイアウトエンジン\n';
    code += getTypes + '\n';
    code += getNodePlacer + '\n';
    code += getCollisionResolver + '\n';
    code += getEdgeRouter + '\n';
    code += getLayoutEngine + '\n\n';

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