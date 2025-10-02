const { validateTreeStructure } = require('./src/validators/tree-validator');

const nodes = [
    {id: "A", label: "A"},
    {id: "B", label: "B"},
    {id: "C", label: "C"}
];

const connections = [
    {from: "A", to: "B"},
    {from: "B", to: "C"},
    {from: "C", to: "A"}
];

const result = validateTreeStructure(nodes, connections);

console.log('単純な循環 A → B → C → A:');
console.log('検出されたバックエッジ:');
result.backEdges.forEach((edge, index) => {
    console.log(`  ${index + 1}. ${edge.from} --> ${edge.to}`);
});
console.log('');
console.log('期待されるバックエッジ: C --> A');
