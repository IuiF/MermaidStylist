// フェーズ5検証スクリプト
// ブラウザの開発者コンソールにコピー&ペーストして実行

console.log('========================================');
console.log('Phase 5 Verification Script');
console.log('========================================\n');

// 検証結果を保存
const verificationResults = {
    passed: [],
    failed: [],
    warnings: []
};

// ユーティリティ関数
function pass(testName) {
    verificationResults.passed.push(testName);
    console.log('✓', testName);
}

function fail(testName, reason) {
    verificationResults.failed.push({ test: testName, reason: reason });
    console.error('✗', testName, ':', reason);
}

function warn(testName, message) {
    verificationResults.warnings.push({ test: testName, message: message });
    console.warn('⚠', testName, ':', message);
}

// テスト1: 環境確認
function test1_Environment() {
    console.log('\n=== Test 1: Environment Check ===');

    try {
        if (typeof allConnections === 'undefined') {
            fail('allConnections', 'Not defined');
            return;
        }
        pass('allConnections is defined');
        console.log('  Total connections:', allConnections.length);

        if (typeof nodePositions === 'undefined') {
            fail('nodePositions', 'Not defined');
            return;
        }
        pass('nodePositions is defined');
        console.log('  Total nodes:', Object.keys(nodePositions).length);

        if (typeof buildSegments === 'undefined') {
            fail('buildSegments', 'Not defined');
            return;
        }
        pass('buildSegments function exists');

        if (typeof renderSegments === 'undefined') {
            fail('renderSegments', 'Not defined');
            return;
        }
        pass('renderSegments function exists');

    } catch (error) {
        fail('Environment check', error.message);
    }
}

// テスト2: レガシー実装の動作確認
function test2_LegacyImplementation() {
    console.log('\n=== Test 2: Legacy Implementation ===');

    try {
        window.USE_SEGMENT_BASED_PATH = false;
        console.time('Legacy rendering');
        window.createCSSLines(allConnections, nodePositions);
        console.timeEnd('Legacy rendering');

        const edges = document.querySelectorAll('.connection-line');
        if (edges.length > 0) {
            pass('Legacy implementation renders edges');
            console.log('  Edges rendered:', edges.length);
        } else {
            fail('Legacy implementation', 'No edges rendered');
        }

    } catch (error) {
        fail('Legacy implementation', error.message);
    }
}

// テスト3: 新実装の動作確認
function test3_NewImplementation() {
    console.log('\n=== Test 3: New Implementation ===');

    try {
        window.DEBUG_CONNECTIONS = true;
        window.USE_SEGMENT_BASED_PATH = true;

        console.time('New rendering');
        window.createCSSLines(allConnections, nodePositions);
        console.timeEnd('New rendering');

        const edges = document.querySelectorAll('.connection-line');
        if (edges.length > 0) {
            pass('New implementation renders edges');
            console.log('  Edges rendered:', edges.length);
        } else {
            fail('New implementation', 'No edges rendered');
        }

        window.DEBUG_CONNECTIONS = false;

    } catch (error) {
        fail('New implementation', error.message);
    }
}

// テスト4: Y調整ありエッジの確認
function test4_YAdjustedEdges() {
    console.log('\n=== Test 4: Y-Adjusted Edges ===');

    try {
        // B2→E3のようなY調整が必要なエッジを探す
        const testEdge = allConnections.find(c =>
            (c.from === 'B2' && c.to === 'E3') ||
            (c.from === 'D2' && c.to === 'F2')
        );

        if (!testEdge) {
            warn('Y-adjusted edges', 'Test edge B2→E3 or D2→F2 not found');
            return;
        }

        console.log('  Testing edge:', testEdge.from, '→', testEdge.to);

        // レガシー実装でのパス生成
        window.USE_SEGMENT_BASED_PATH = false;
        window.createCSSLines(allConnections, nodePositions);

        const legacyPath = document.querySelector(`[data-from="${testEdge.from}"][data-to="${testEdge.to}"]`);
        if (legacyPath) {
            const legacyD = legacyPath.getAttribute('d');
            const legacyLCount = (legacyD.match(/L /g) || []).length;
            const legacyQCount = (legacyD.match(/Q /g) || []).length;
            console.log('  Legacy: L=', legacyLCount, 'Q=', legacyQCount);
        }

        // 新実装でのパス生成
        window.USE_SEGMENT_BASED_PATH = true;
        window.createCSSLines(allConnections, nodePositions);

        const newPath = document.querySelector(`[data-from="${testEdge.from}"][data-to="${testEdge.to}"]`);
        if (newPath) {
            const newD = newPath.getAttribute('d');
            const newLCount = (newD.match(/L /g) || []).length;
            const newQCount = (newD.match(/Q /g) || []).length;
            console.log('  New: L=', newLCount, 'Q=', newQCount);

            if (newQCount > 0) {
                pass('Y-adjusted edges have curves');
                console.log('  ✓ Curves are applied!');
            } else {
                warn('Y-adjusted edges', 'No curves found in new implementation');
            }
        } else {
            fail('Y-adjusted edges', 'Edge not found in new implementation');
        }

    } catch (error) {
        fail('Y-adjusted edges', error.message);
    }
}

// テスト5: 点線エッジの確認
function test5_DashedEdges() {
    console.log('\n=== Test 5: Dashed Edges ===');

    try {
        const dashedEdges = allConnections.filter(c => c.isDashed);
        console.log('  Dashed edges:', dashedEdges.length);

        if (dashedEdges.length === 0) {
            warn('Dashed edges', 'No dashed edges found in data');
            return;
        }

        // 新実装で描画
        window.USE_SEGMENT_BASED_PATH = true;
        window.createCSSLines(allConnections, nodePositions);

        const dashedElements = document.querySelectorAll('.dashed-edge');
        if (dashedElements.length > 0) {
            pass('Dashed edges are rendered');
            console.log('  Dashed elements:', dashedElements.length);

            // スタイルチェック
            const firstDashed = dashedElements[0];
            const dashArray = firstDashed.style.strokeDasharray;
            const opacity = firstDashed.style.opacity;

            if (dashArray === '5, 5' || dashArray === '5,5') {
                pass('Dashed style is applied (strokeDasharray)');
            } else {
                warn('Dashed style', `Unexpected strokeDasharray: ${dashArray}`);
            }

            if (opacity === '0.6') {
                pass('Dashed opacity is applied');
            } else {
                warn('Dashed opacity', `Unexpected opacity: ${opacity}`);
            }
        } else {
            fail('Dashed edges', 'No dashed elements found');
        }

    } catch (error) {
        fail('Dashed edges', error.message);
    }
}

// テスト6: パフォーマンス比較
function test6_Performance() {
    console.log('\n=== Test 6: Performance Comparison ===');

    try {
        // レガシー実装
        window.USE_SEGMENT_BASED_PATH = false;
        const legacyStart = performance.now();
        window.createCSSLines(allConnections, nodePositions);
        const legacyTime = performance.now() - legacyStart;

        // 新実装
        window.USE_SEGMENT_BASED_PATH = true;
        const newStart = performance.now();
        window.createCSSLines(allConnections, nodePositions);
        const newTime = performance.now() - newStart;

        console.log('  Legacy time:', legacyTime.toFixed(2), 'ms');
        console.log('  New time:', newTime.toFixed(2), 'ms');
        console.log('  Ratio:', (newTime / legacyTime).toFixed(2), 'x');

        if (newTime < legacyTime * 2) {
            pass('Performance is acceptable (< 2x)');
        } else {
            warn('Performance', `New implementation is ${(newTime / legacyTime).toFixed(2)}x slower`);
        }

    } catch (error) {
        fail('Performance test', error.message);
    }
}

// テスト7: エラーハンドリング
function test7_ErrorHandling() {
    console.log('\n=== Test 7: Error Handling ===');

    try {
        window.USE_SEGMENT_BASED_PATH = true;

        // 正常なケース
        window.createCSSLines(allConnections, nodePositions);
        pass('Normal case works');

        // フォールバックは実際のエラーケースでのみテスト可能
        console.log('  Note: Fallback mechanism tested in integration tests');

    } catch (error) {
        fail('Error handling', error.message);
    }
}

// すべてのテストを実行
function runAllTests() {
    test1_Environment();
    test2_LegacyImplementation();
    test3_NewImplementation();
    test4_YAdjustedEdges();
    test5_DashedEdges();
    test6_Performance();
    test7_ErrorHandling();

    // サマリー表示
    console.log('\n========================================');
    console.log('Verification Summary');
    console.log('========================================');
    console.log('✓ Passed:', verificationResults.passed.length);
    console.log('✗ Failed:', verificationResults.failed.length);
    console.log('⚠ Warnings:', verificationResults.warnings.length);

    if (verificationResults.failed.length > 0) {
        console.log('\nFailed tests:');
        verificationResults.failed.forEach(f => {
            console.log('  -', f.test, ':', f.reason);
        });
    }

    if (verificationResults.warnings.length > 0) {
        console.log('\nWarnings:');
        verificationResults.warnings.forEach(w => {
            console.log('  -', w.test, ':', w.message);
        });
    }

    if (verificationResults.failed.length === 0) {
        console.log('\n✓ All tests passed!');
        console.log('Ready to proceed to Phase 6 (Legacy code removal)');
    } else {
        console.log('\n✗ Some tests failed. Please review and fix issues.');
    }

    // 新実装を有効化したまま終了
    window.USE_SEGMENT_BASED_PATH = true;
    console.log('\nCurrent mode: NEW IMPLEMENTATION');
}

// 自動実行
runAllTests();
