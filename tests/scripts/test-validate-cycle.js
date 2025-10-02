const { validateTreeStructure } = require('../../src/core/validators/tree-validator');

const nodes = [
    {id: "A", label: "A: Root1"},
    {id: "B", label: "B: Root2"},
    {id: "C", label: "C: 親A"},
    {id: "D", label: "D: 親A"},
    {id: "E", label: "E: 親B"},
    {id: "F", label: "F: 親B"},
    {id: "G", label: "G: 親C,D"},
    {id: "H", label: "H: 親D,E"},
    {id: "I", label: "I: 親E"},
    {id: "J", label: "J: 親F,I"},
    {id: "K", label: "K: 親G,H"},
    {id: "L", label: "L: 親H,J"},
    {id: "M", label: "M: 親K,L"}
];

const connections = [
    {from: "A", to: "C"},
    {from: "A", to: "D"},
    {from: "B", to: "E"},
    {from: "B", to: "F"},
    {from: "C", to: "G"},
    {from: "D", to: "G"},
    {from: "D", to: "H"},
    {from: "E", to: "H"},
    {from: "E", to: "I"},
    {from: "F", to: "J"},
    {from: "I", to: "J"},
    {from: "G", to: "K"},
    {from: "H", to: "K"},
    {from: "H", to: "L"},
    {from: "J", to: "L"},
    {from: "K", to: "M"},
    {from: "L", to: "M"},
    {from: "M", to: "H"},  // 循環エッジ1
    {from: "L", to: "D"}   // 循環エッジ2
];

const result = validateTreeStructure(nodes, connections);

console.log('バリデーション結果:');
console.log('isValid:', result.isValid);
console.log('エラー数:', result.errors.length);
console.log('');

console.log('検出されたバックエッジ:');
result.backEdges.forEach((edge, index) => {
    console.log(`  ${index + 1}. ${edge.from} --> ${edge.to}`);
});
console.log('');

console.log('期待されるバックエッジ:');
console.log('  1. M --> H');
console.log('  2. L --> D');
