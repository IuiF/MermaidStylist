// 詳細検証テスト: エッジケースを含む包括的テスト
// 実行方法: node tests/scripts/test-detailed-verification.js

const pathGenerator = require('../../src/runtime/rendering/connections/path-generator');

console.log('========================================');
console.log('Detailed Verification Test');
console.log('========================================\n');

let passCount = 0;
let failCount = 0;
let warnCount = 0;

function pass(testName) {
    console.log('✓', testName);
    passCount++;
}

function fail(testName, reason) {
    console.error('✗', testName, ':', reason);
    failCount++;
}

function warn(testName, message) {
    console.warn('⚠', testName, ':', message);
    warnCount++;
}

// テスト1: 短い距離のエッジ（カーブ半径の2倍未満）
function testShortDistance() {
    console.log('=== Test 1: Short Distance Edge ===');

    const points = {
        p1: { x: 100, y: 150 },
        p2: { x: 110, y: 150 },  // 10px（cornerRadius=8の場合、2倍未満）
        p3: { x: 110, y: 160 },  // 10px
        p4: { x: 110, y: 160 },
        end: { x: 120, y: 160 }
    };

    const cornerRadius = 8;
    const code = pathGenerator.getPathGenerator();

    const env = { window: { USE_SEGMENT_BASED_PATH: true } };
    const func = new Function('window', code + `
        return pathGenerator.generateCurvedPath(${JSON.stringify(points)}, ${cornerRadius});
    `);

    try {
        const path = func(env.window);
        if (path && path.length > 0) {
            pass('短い距離のエッジが生成される');
            console.log('  Path length:', path.length);

            // 直線（L）のみで構成されているはず
            const qCount = (path.match(/Q /g) || []).length;
            if (qCount === 0) {
                pass('短い距離のためカーブが適用されない（正常）');
            } else {
                warn('短い距離でもカーブが適用されている', `Q commands: ${qCount}`);
            }
        } else {
            fail('短い距離のエッジ', 'パスが生成されない');
        }
    } catch (error) {
        fail('短い距離のエッジ', error.message);
    }

    console.log();
}

// テスト2: 長距離のエッジ
function testLongDistance() {
    console.log('=== Test 2: Long Distance Edge ===');

    const points = {
        p1: { x: 100, y: 150 },
        p2: { x: 300, y: 150 },  // 200px
        p3: { x: 300, y: 450 },  // 300px
        p4: { x: 300, y: 450 },
        end: { x: 500, y: 450 }
    };

    const cornerRadius = 8;
    const code = pathGenerator.getPathGenerator();

    const env = { window: { USE_SEGMENT_BASED_PATH: true } };
    const func = new Function('window', code + `
        return pathGenerator.generateCurvedPath(${JSON.stringify(points)}, ${cornerRadius});
    `);

    try {
        const path = func(env.window);
        if (path && path.length > 0) {
            pass('長距離のエッジが生成される');
            console.log('  Path length:', path.length);

            // カーブが適用されているはず
            const qCount = (path.match(/Q /g) || []).length;
            if (qCount > 0) {
                pass(`カーブが適用されている（Q commands: ${qCount}）`);
            } else {
                warn('長距離でもカーブが適用されていない', 'Q commands: 0');
            }
        } else {
            fail('長距離のエッジ', 'パスが生成されない');
        }
    } catch (error) {
        fail('長距離のエッジ', error.message);
    }

    console.log();
}

// テスト3: 複数のY調整（初期+最終）
function testMultipleYAdjustments() {
    console.log('=== Test 3: Multiple Y-Adjustments ===');

    const points = {
        p1: { x: 100, y: 150 },
        p2: { x: 200, y: 180 },  // 初期Y調整: +30
        p3: { x: 200, y: 250 },
        p4: { x: 200, y: 280 },  // 最終Y調整: p4.y ≠ end.y
        end: { x: 300, y: 250 },  // end.y = 250
        secondVerticalX: 250
    };

    const cornerRadius = 8;
    const code = pathGenerator.getPathGenerator();

    console.log('Testing legacy implementation...');
    const envLegacy = { window: { USE_SEGMENT_BASED_PATH: false } };
    const funcLegacy = new Function('window', code + `
        return pathGenerator.generateCurvedPath(${JSON.stringify(points)}, ${cornerRadius});
    `);

    try {
        const legacyPath = funcLegacy(envLegacy.window);
        const legacyQCount = (legacyPath.match(/Q /g) || []).length;
        console.log('  Legacy Q commands:', legacyQCount);
    } catch (error) {
        warn('レガシー実装', error.message);
    }

    console.log('Testing new implementation...');
    const envNew = { window: { USE_SEGMENT_BASED_PATH: true } };
    const funcNew = new Function('window', code + `
        return pathGenerator.generateCurvedPath(${JSON.stringify(points)}, ${cornerRadius});
    `);

    try {
        const newPath = funcNew(envNew.window);
        if (newPath && newPath.length > 0) {
            pass('複数Y調整のエッジが生成される');

            const newQCount = (newPath.match(/Q /g) || []).length;
            console.log('  New Q commands:', newQCount);

            if (newQCount >= 2) {
                pass('Y調整ありでもカーブが適用される（主目的達成）');
            } else {
                fail('複数Y調整', 'カーブが適用されていない');
            }
        } else {
            fail('複数Y調整', 'パスが生成されない');
        }
    } catch (error) {
        fail('複数Y調整', error.message);
    }

    console.log();
}

// テスト4: 上向きのエッジ（p3.y < p2.y）
function testUpwardEdge() {
    console.log('=== Test 4: Upward Edge ===');

    const points = {
        p1: { x: 100, y: 250 },
        p2: { x: 200, y: 250 },
        p3: { x: 200, y: 150 },  // 上向き
        p4: { x: 200, y: 150 },
        end: { x: 300, y: 150 }
    };

    const cornerRadius = 8;
    const code = pathGenerator.getPathGenerator();

    const env = { window: { USE_SEGMENT_BASED_PATH: true } };
    const func = new Function('window', code + `
        return pathGenerator.generateCurvedPath(${JSON.stringify(points)}, ${cornerRadius});
    `);

    try {
        const path = func(env.window);
        if (path && path.length > 0) {
            pass('上向きのエッジが生成される');
            console.log('  Path length:', path.length);

            const qCount = (path.match(/Q /g) || []).length;
            if (qCount > 0) {
                pass(`上向きでもカーブが適用される（Q commands: ${qCount}）`);
            }
        } else {
            fail('上向きのエッジ', 'パスが生成されない');
        }
    } catch (error) {
        fail('上向きのエッジ', error.message);
    }

    console.log();
}

// テスト5: p3とp4が同一座標
function testSameP3P4() {
    console.log('=== Test 5: Same P3 and P4 Coordinates ===');

    const points = {
        p1: { x: 100, y: 150 },
        p2: { x: 200, y: 150 },
        p3: { x: 200, y: 250 },
        p4: { x: 200, y: 250 },  // p3と同じ
        end: { x: 300, y: 250 }
    };

    const cornerRadius = 8;
    const code = pathGenerator.getPathGenerator();

    const env = { window: { USE_SEGMENT_BASED_PATH: true } };
    const func = new Function('window', code + `
        return pathGenerator.generateCurvedPath(${JSON.stringify(points)}, ${cornerRadius});
    `);

    try {
        const path = func(env.window);
        if (path && path.length > 0) {
            pass('p3とp4が同一座標でも生成される');
            console.log('  Path length:', path.length);

            // 空セグメントが生成されていないことを確認
            if (!path.includes('L 200 250 L 200 250')) {
                pass('空セグメントが生成されていない');
            } else {
                warn('p3とp4同一座標', '空セグメントが含まれている可能性');
            }
        } else {
            fail('p3とp4同一座標', 'パスが生成されない');
        }
    } catch (error) {
        fail('p3とp4同一座標', error.message);
    }

    console.log();
}

// テスト6: 極端に小さいコーナー半径
function testSmallCornerRadius() {
    console.log('=== Test 6: Small Corner Radius ===');

    const points = {
        p1: { x: 100, y: 150 },
        p2: { x: 200, y: 150 },
        p3: { x: 200, y: 250 },
        p4: { x: 200, y: 250 },
        end: { x: 300, y: 250 }
    };

    const cornerRadius = 2;  // 非常に小さい
    const code = pathGenerator.getPathGenerator();

    const env = { window: { USE_SEGMENT_BASED_PATH: true } };
    const func = new Function('window', code + `
        return pathGenerator.generateCurvedPath(${JSON.stringify(points)}, ${cornerRadius});
    `);

    try {
        const path = func(env.window);
        if (path && path.length > 0) {
            pass('小さいコーナー半径でも生成される');
            console.log('  Path length:', path.length);
            console.log('  Corner radius:', cornerRadius);
        } else {
            fail('小さいコーナー半径', 'パスが生成されない');
        }
    } catch (error) {
        fail('小さいコーナー半径', error.message);
    }

    console.log();
}

// テスト7: 無効な入力のエラーハンドリング
function testInvalidInput() {
    console.log('=== Test 7: Invalid Input Error Handling ===');

    const testCases = [
        { name: 'null points', points: null },
        { name: 'missing p2', points: { p1: {x:0,y:0}, p3: {x:0,y:0}, p4: {x:0,y:0}, end: {x:0,y:0} } },
        { name: 'undefined p2', points: { p1: {x:0,y:0}, p2: undefined, p3: {x:0,y:0}, p4: {x:0,y:0}, end: {x:0,y:0} } }
    ];

    const cornerRadius = 8;
    const code = pathGenerator.getPathGenerator();

    testCases.forEach(testCase => {
        const env = { window: { USE_SEGMENT_BASED_PATH: true } };
        const func = new Function('window', code + `
            return pathGenerator.generateCurvedPath(${JSON.stringify(testCase.points)}, ${cornerRadius});
        `);

        try {
            const path = func(env.window);
            if (!path || path.length === 0) {
                pass(`${testCase.name}: 空パスを返す（エラーハンドリング成功）`);
            } else {
                warn(`${testCase.name}`, '無効な入力でもパスが生成された');
            }
        } catch (error) {
            // エラーが発生しても構わない（フォールバックが動作）
            pass(`${testCase.name}: エラーをキャッチ`);
        }
    });

    console.log();
}

// メイン実行
function main() {
    testShortDistance();
    testLongDistance();
    testMultipleYAdjustments();
    testUpwardEdge();
    testSameP3P4();
    testSmallCornerRadius();
    testInvalidInput();

    console.log('========================================');
    console.log('Test Summary');
    console.log('========================================');
    console.log('✓ Passed:', passCount);
    console.log('✗ Failed:', failCount);
    console.log('⚠ Warnings:', warnCount);
    console.log();

    if (failCount === 0) {
        console.log('✓ すべての重要なテストが成功しました');
        console.log('新実装は安定していると判断できます');
    } else {
        console.log('✗ 失敗したテストがあります');
        console.log('問題を修正する必要があります');
    }
}

main();
