// セグメントビルダーのテストスクリプト
// 実行方法: node tests/scripts/test-segment-builder.js

const segmentTypes = require('../../src/runtime/rendering/connections/segment-types');
const segmentBuilder = require('../../src/runtime/rendering/connections/segment-builder');

// ブラウザ環境をエミュレート
function setupTestEnvironment() {
    const code = segmentTypes.getSegmentTypes() + segmentBuilder.getSegmentBuilder();

    // グローバルスコープに変数を定義
    const env = {};
    const func = new Function('env', code + `
        env.createSegment = createSegment;
        env.getSegmentLength = getSegmentLength;
        env.getSegmentDirection = getSegmentDirection;
        env.SegmentType = SegmentType;
        env.buildSegments = buildSegments;
        env.validateSegments = validateSegments;
        env.debugSegments = debugSegments;
    `);

    func(env);
    return env;
}

// シンプルな2点間パス
function testSimplePath(env) {
    console.log('\n=== Test: Simple Path ===');

    const points = {
        p1: { x: 100, y: 150 },
        p2: { x: 200, y: 150 },
        p3: { x: 200, y: 250 },
        p4: { x: 200, y: 250 },
        end: { x: 300, y: 250 }
    };

    const segments = env.buildSegments(points);

    console.log('Segments count:', segments.length);
    console.log('Expected: 3 segments (H, V, H)');

    if (segments.length > 0) {
        console.log('\nSegment details:');
        console.log(env.debugSegments(segments));

        const isValid = env.validateSegments(segments);
        console.log('\nValidation:', isValid ? 'PASS' : 'FAIL');
    } else {
        console.log('Note: buildSegments not yet implemented (expected in Phase 2)');
    }
}

// Y調整なしの3制御点パス
function testNoYAdjustmentPath(env) {
    console.log('\n=== Test: No Y-Adjustment Path ===');

    const points = {
        p1: { x: 100, y: 150 },
        p2: { x: 200, y: 150 },
        p3: { x: 200, y: 250 },
        p4: { x: 200, y: 250 },
        end: { x: 300, y: 250 }
    };

    const segments = env.buildSegments(points);

    console.log('Segments count:', segments.length);

    if (segments.length > 0) {
        console.log('\nSegment details:');
        console.log(env.debugSegments(segments));

        const isValid = env.validateSegments(segments);
        console.log('\nValidation:', isValid ? 'PASS' : 'FAIL');
    } else {
        console.log('Note: buildSegments not yet implemented (expected in Phase 2)');
    }
}

// Y調整ありのパス
function testYAdjustedPath(env) {
    console.log('\n=== Test: Y-Adjusted Path ===');

    const points = {
        p1: { x: 100, y: 150 },
        p2: { x: 200, y: 180 }, // Y調整あり
        p3: { x: 200, y: 250 },
        p4: { x: 200, y: 280 }, // 最終Y調整あり
        end: { x: 300, y: 250 },
        secondVerticalX: 250
    };

    const segments = env.buildSegments(points);

    console.log('Segments count:', segments.length);
    console.log('Expected: more than 3 segments (due to Y adjustments)');

    if (segments.length > 0) {
        console.log('\nSegment details:');
        console.log(env.debugSegments(segments));

        const isValid = env.validateSegments(segments);
        console.log('\nValidation:', isValid ? 'PASS' : 'FAIL');
    } else {
        console.log('Note: buildSegments not yet implemented (expected in Phase 2)');
    }
}

// ヘルパー関数のテスト
function testHelperFunctions(env) {
    console.log('\n=== Test: Helper Functions ===');

    // createSegment
    const hSegment = env.createSegment(env.SegmentType.HORIZONTAL, { x: 100, y: 150 }, { x: 200, y: 150 });
    console.log('Horizontal segment created:', hSegment);

    // getSegmentLength
    const hLength = env.getSegmentLength(hSegment);
    console.log('Horizontal segment length:', hLength, '(expected: 100)');

    // getSegmentDirection
    const hDir = env.getSegmentDirection(hSegment);
    console.log('Horizontal segment direction:', hDir, '(expected: right)');

    const vSegment = env.createSegment(env.SegmentType.VERTICAL, { x: 200, y: 150 }, { x: 200, y: 250 });
    console.log('\nVertical segment created:', vSegment);

    const vLength = env.getSegmentLength(vSegment);
    console.log('Vertical segment length:', vLength, '(expected: 100)');

    const vDir = env.getSegmentDirection(vSegment);
    console.log('Vertical segment direction:', vDir, '(expected: down)');
}

// メイン実行
function main() {
    console.log('========================================');
    console.log('Segment Builder Test Suite');
    console.log('========================================');

    const env = setupTestEnvironment();

    testHelperFunctions(env);
    testSimplePath(env);
    testNoYAdjustmentPath(env);
    testYAdjustedPath(env);

    console.log('\n========================================');
    console.log('Test Suite Complete');
    console.log('========================================');
}

main();
