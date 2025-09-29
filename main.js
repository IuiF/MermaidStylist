const { parseMermaidNodes, parseMermaidConnections } = require('./src/parsers/mermaid');
const { generateHTML } = require('./src/generators/html');
const { readMermaidFile, writeHtmlFile } = require('./src/utils/file');

// Main function - simplified after code refactoring
function main() {
    try {
        // Read the sample Mermaid file using the new utility
        const mermaidContent = readMermaidFile('sample_mermaid.mmd');

        // Parse nodes and connections using the new parsers
        const nodes = parseMermaidNodes(mermaidContent);
        const connections = parseMermaidConnections(mermaidContent);

        console.log(`Parsed ${nodes.length} nodes and ${connections.length} connections`);

        // Generate HTML using the new generator
        const html = generateHTML(nodes, connections);

        // Write to output file using the new utility
        writeHtmlFile('output.html', html);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();