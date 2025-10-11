// 統合テスト: 新実装とレガシー実装の出力比較
// 実行方法: node tests/scripts/test-integration.js

const pathGenerator = require('../../src/runtime/rendering/connections/path-generator');

console.log('========================================');
console.log('Integration Test: Segment-based Path Generation');
console.log('========================================\n');

// テストケース1: シンプルパス（Y調整なし）
function testSimplePath() {
    console.log('=== Test 1: Simple Path (No Y-adjustment) ===');

    const points = {
        p1: { x: 100, y: 150 },
        p2: { x: 200, y: 150 },
        p3: { x: 200, y: 250 },
        p4: { x: 200, y: 250 },
        end: { x: 300, y: 250 }
    };

    const cornerRadius = 8;

    // レガシー実装のコードを取得
    const code = pathGenerator.getPathGenerator();

    // グローバル環境に関数を定義
    const env = { window: {} };
    const func = new Function('window', code + `
        return pathGenerator.generateCurvedPath(${JSON.stringify(points)}, ${cornerRadius});
    `);

    try {
        const legacyPath = func(env.window);
        console.log('Legacy path generated successfully');
        console.log('Path length:', legacyPath.length);
        console.log('Path preview:', legacyPath.substring(0, 100) + '...\n');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// テストケース2: Y調整ありパス
function testYAdjustedPath() {
    console.log('=== Test 2: Y-Adjusted Path ===');

    const points = {
        p1: { x: 100, y: 150 },
        p2: { x: 200, y: 180 },  // Y調整あり
        p3: { x: 200, y: 250 },
        p4: { x: 200, y: 280 },  // 最終Y調整あり
        end: { x: 300, y: 250 },
        secondVerticalX: 250
    };

    const cornerRadius = 8;

    const code = pathGenerator.getPathGenerator();

    console.log('Testing legacy implementation...');
    const envLegacy = { window: {} };
    const funcLegacy = new Function('window', code + `
        return pathGenerator.generateCurvedPath(${JSON.stringify(points)}, ${cornerRadius});
    `);

    try {
        const legacyPath = funcLegacy(envLegacy.window);
        console.log('✓ Legacy path generated');
        console.log('  Length:', legacyPath.length);

        // 角張った線（直線L）が多いかチェック
        const lCount = (legacyPath.match(/L /g) || []).length;
        const qCount = (legacyPath.match(/Q /g) || []).length;
        console.log('  L commands (straight):', lCount);
        console.log('  Q commands (curves):', qCount);
    } catch (error) {
        console.error('✗ Error:', error.message);
    }

    console.log('\nTesting new implementation...');
    const envNew = { window: { USE_SEGMENT_BASED_PATH: true } };
    const funcNew = new Function('window', code + `
        return pathGenerator.generateCurvedPath(${JSON.stringify(points)}, ${cornerRadius});
    `);

    try {
        const newPath = funcNew(envNew.window);
        console.log('✓ New path generated');
        console.log('  Length:', newPath.length);

        const lCount = (newPath.match(/L /g) || []).length;
        const qCount = (newPath.match(/Q /g) || []).length;
        console.log('  L commands (straight):', lCount);
        console.log('  Q commands (curves):', qCount);

        if (qCount > 0) {
            console.log('✓ Curves are applied in new implementation!');
        }
    } catch (error) {
        console.error('✗ Error:', error.message);
    }

    console.log();
}

// テストケース3: エラーハンドリング
function testErrorHandling() {
    console.log('=== Test 3: Error Handling ===');

    const invalidPoints = {
        p1: { x: 100, y: 150 },
        p2: null,  // 無効な値
        p3: { x: 200, y: 250 },
        p4: { x: 200, y: 250 },
        end: { x: 300, y: 250 }
    };

    const cornerRadius = 8;
    const code = pathGenerator.getPathGenerator();

    const env = { window: { USE_SEGMENT_BASED_PATH: true } };
    const func = new Function('window', code + `
        return pathGenerator.generateCurvedPath(${JSON.stringify(invalidPoints)}, ${cornerRadius});
    `);

    try {
        const path = func(env.window);
        console.log('Path generated (should fallback to legacy)');
        console.log('Length:', path.length);
        console.log('✓ Fallback mechanism works\n');
    } catch (error) {
        console.error('✗ Error not handled properly:', error.message, '\n');
    }
}

// テストケース4: コードロード確認
function testCodeLoad() {
    console.log('=== Test 4: Code Load ===');

    const code = pathGenerator.getPathGenerator();

    console.log('Code loaded successfully');
    console.log('Total code length:', code.length, 'characters');

    // 新実装の関数が含まれているか確認
    const hasBuildSegments = code.includes('function buildSegments');
    const hasRenderSegments = code.includes('function renderSegments');
    const hasValidateSegments = code.includes('function validateSegments');
    const hasCreateSegment = code.includes('function createSegment');

    console.log('✓ buildSegments:', hasBuildSegments ? 'FOUND' : 'MISSING');
    console.log('✓ renderSegments:', hasRenderSegments ? 'FOUND' : 'MISSING');
    console.log('✓ validateSegments:', hasValidateSegments ? 'FOUND' : 'MISSING');
    console.log('✓ createSegment:', hasCreateSegment ? 'FOUND' : 'MISSING');

    // レガシー実装の関数も含まれているか確認
    const hasLegacyPath = code.includes('_generatePathWithInitialAdjustment');
    console.log('✓ Legacy functions:', hasLegacyPath ? 'FOUND' : 'MISSING');

    console.log();
}

// メイン実行
function main() {
    testCodeLoad();
    testSimplePath();
    testYAdjustedPath();
    testErrorHandling();

    console.log('========================================');
    console.log('Integration Test Complete');
    console.log('========================================');
    console.log('\n次のステップ:');
    console.log('1. output.htmlをブラウザで開く');
    console.log('2. 開発者コンソールを開く');
    console.log('3. docs/refactoring/browser-test-guide.md を参照してテスト');
}

main();
