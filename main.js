const { parseMermaidNodes, parseMermaidConnections, parseMermaidStyles, parseMermaidClassDefs } = require('./src/parsers/mermaid');
const { generateHTML, generateErrorHTML } = require('./src/generators/html');
const { readMermaidFile, writeHtmlFile } = require('./src/utils/file');
const { validateTreeStructure } = require('./src/validators/tree-validator');
const path = require('path');

// Main function - simplified after code refactoring
function main() {
    try {
        // コマンドライン引数からファイルパスを取得
        const args = process.argv.slice(2);
        const inputFile = args[0] || 'sample.mmd';
        const outputFile = args[1] || 'output.html';

        console.log(`Reading: ${inputFile}`);

        // Read the Mermaid file using the new utility
        const mermaidContent = readMermaidFile(inputFile);

        // Parse nodes and connections using the new parsers
        const nodes = parseMermaidNodes(mermaidContent);
        const connections = parseMermaidConnections(mermaidContent);
        const styles = parseMermaidStyles(mermaidContent);
        const { classDefs, classAssignments } = parseMermaidClassDefs(mermaidContent);

        console.log(`Parsed ${nodes.length} nodes and ${connections.length} connections`);

        // クラス割り当てをノードにマージ
        nodes.forEach(node => {
            if (classAssignments[node.id]) {
                if (!node.classes) {
                    node.classes = [];
                }
                classAssignments[node.id].forEach(className => {
                    if (!node.classes.includes(className)) {
                        node.classes.push(className);
                    }
                });
            }
        });

        // Validate tree structure
        const validation = validateTreeStructure(nodes, connections);

        let html;
        if (!validation.isValid) {
            console.error('Validation failed: Tree structure is invalid');
            validation.errors.forEach(err => console.error(`  - ${err}`));
            html = generateErrorHTML(validation.errors);
        } else {
            console.log('Validation passed: Valid tree structure');
            // Generate HTML using the new generator
            html = generateHTML(nodes, connections, styles, classDefs);
        }

        // Write to output file using the new utility
        writeHtmlFile(outputFile, html);

        console.log(`Generated: ${outputFile}`);

    } catch (error) {
        console.error('Error:', error.message);
        console.error('\nUsage: node main.js [input.mmd] [output.html]');
        console.error('Example: node main.js sample.mmd output.html');
        process.exit(1);
    }
}

main();