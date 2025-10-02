// レイアウト結果をデバッグ出力
const fs = require('fs');
const { parseMermaidNodes, parseMermaidConnections } = require('./src/parsers/mermaid');
const { analyzeTreeStructure } = require('./src/utils/tree-structure');
const { createHorizontalLayout } = require('./src/layouts/horizontal-layout');

const content = fs.readFileSync('test-dag-complex.mmd', 'utf-8');
const nodes = parseMermaidNodes(content);
const connections = parseMermaidConnections(content);
const { levels } = analyzeTreeStructure(nodes, connections);
const layout = createHorizontalLayout(nodes, connections, levels);

console.log('ノード配置:');
layout.nodes.forEach(node => {
    if (node.id === 'H' || node.id === 'J' || node.id === 'L') {
        console.log(`${node.id}: x=${node.x}, y=${node.y}, width=${node.width}, height=${node.height}`);
    }
});

console.log('\nH→L と J→L の接続:');
layout.connections.forEach(conn => {
    if ((conn.from === 'H' || conn.from === 'J') && conn.to === 'L') {
        console.log(`\n${conn.from} → ${conn.to}:`);
        console.log(`  path: ${conn.path}`);
        console.log(`  points:`, conn.points);
    }
});
