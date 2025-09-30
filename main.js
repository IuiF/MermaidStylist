const { parseMermaidNodes, parseMermaidConnections } = require('./src/parsers/mermaid');
const { generateHTML } = require('./src/generators/html');
const { readMermaidFile, writeHtmlFile } = require('./src/utils/file');
const path = require('path');

// Main function - simplified after code refactoring
function main() {
    try {
        // コマンドライン引数からファイルパスを取得
        const args = process.argv.slice(2);
        const inputFile = args[0] || 'sample_mermaid.mmd';
        const outputFile = args[1] || 'output.html';

        console.log(`Reading: ${inputFile}`);

        // Read the Mermaid file using the new utility
        const mermaidContent = readMermaidFile(inputFile);

        // Parse nodes and connections using the new parsers
        const nodes = parseMermaidNodes(mermaidContent);
        const connections = parseMermaidConnections(mermaidContent);

        console.log(`Parsed ${nodes.length} nodes and ${connections.length} connections`);

        // Generate HTML using the new generator
        const html = generateHTML(nodes, connections);

        // Write to output file using the new utility
        writeHtmlFile(outputFile, html);

        console.log(`Generated: ${outputFile}`);

    } catch (error) {
        console.error('Error:', error.message);
        console.error('\nUsage: node main.js [input.mmd] [output.html]');
        console.error('Example: node main.js sample_mermaid.mmd output.html');
        process.exit(1);
    }
}

main();