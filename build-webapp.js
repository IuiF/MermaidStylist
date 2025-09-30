const fs = require('fs');
const path = require('path');

// 各モジュールの読み込み
const { parseMermaidNodes, parseMermaidConnections } = require('./src/parsers/mermaid');
const { generateHTML, generateErrorHTML } = require('./src/generators/html');
const { validateTreeStructure } = require('./src/validators/tree-validator');

// ブラウザ向けのコードを生成
function getEmbeddedCode() {
    // パーサーのコード
    const parserCode = '\n        ' +
        parseMermaidNodes.toString() + '\n        ' +
        parseMermaidConnections.toString() + '\n    ';

    // バリデーターのコード
    const validatorCode = '\n        ' +
        validateTreeStructure.toString() + '\n    ';

    // ジェネレーターのコードは使用しない（ブラウザ向けに別途定義）

    // その他の必要なモジュール
    const baseTemplate = fs.readFileSync('./src/templates/base.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};/g, '');

    const layoutUtils = fs.readFileSync('./src/utils/layout-utils.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};/g, '');

    const treeStructure = fs.readFileSync('./src/utils/tree-structure.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};/g, '');

    const verticalLayout = fs.readFileSync('./src/layouts/vertical-layout.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};/g, '');

    const horizontalLayout = fs.readFileSync('./src/layouts/horizontal-layout.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};/g, '');

    const connectionRenderer = fs.readFileSync('./src/features/connection-renderer.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};/g, '');

    const collapseManager = fs.readFileSync('./src/features/collapse-manager.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};/g, '');

    const layoutSwitcher = fs.readFileSync('./src/features/layout-switcher.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};/g, '');

    const viewportManager = fs.readFileSync('./src/features/viewport-manager.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};/g, '');

    const highlightManager = fs.readFileSync('./src/features/highlight-manager.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};/g, '');

    const pathHighlighter = fs.readFileSync('./src/features/path-highlighter.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};/g, '');

    const contextMenu = fs.readFileSync('./src/features/context-menu.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};/g, '');

    const treeValidator = fs.readFileSync('./src/validators/tree-validator.js', 'utf8')
        .replace(/module\.exports = \{[^}]+\};/g, '');

    return '\n        // パーサー\n        ' +
        parserCode + '\n\n' +
        '        // バリデーター\n' +
        treeValidator + '\n\n' +
        '        // テンプレート\n' +
        baseTemplate + '\n\n' +
        '        // ユーティリティ\n' +
        layoutUtils + '\n' +
        treeStructure + '\n\n' +
        '        // レイアウト\n' +
        verticalLayout + '\n' +
        horizontalLayout + '\n\n' +
        '        // 機能\n' +
        connectionRenderer + '\n' +
        collapseManager + '\n' +
        layoutSwitcher + '\n' +
        viewportManager + '\n' +
        highlightManager + '\n' +
        pathHighlighter + '\n' +
        contextMenu + '\n    ';
}

// webappテンプレートを読み込み
const webappTemplate = fs.readFileSync('./webapp-template.html', 'utf8');

// ${getEmbeddedCode()}を実際のコードで置換
const finalWebapp = webappTemplate.replace('${getEmbeddedCode()}', getEmbeddedCode());

// 最終的なwebapp.htmlを出力
fs.writeFileSync('./webapp.html', finalWebapp, 'utf8');

console.log('webapp.html を生成しました');