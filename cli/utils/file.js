const fs = require('fs');

function readMermaidFile(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
}

function writeHtmlFile(filePath, content) {
    try {
        fs.writeFileSync(filePath, content);
        console.log(`HTML output generated: ${filePath}`);
    } catch (error) {
        throw new Error(`Failed to write file ${filePath}: ${error.message}`);
    }
}

module.exports = {
    readMermaidFile,
    writeHtmlFile
};