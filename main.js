const { parseMermaidNodes, parseMermaidConnections, parseMermaidStyles, parseMermaidClassDefs } = require('./src/parsers/mermaid');
const { generateHTML, generateErrorHTML } = require('./src/generators/html');
const { readMermaidFile, writeHtmlFile } = require('./src/utils/file');
const { validateTreeStructure } = require('./src/validators/tree-validator');
const path = require('path');

// バックエッジ用の点線ノードと点線エッジを作成
function createDashedNodesAndEdges(nodes, regularConnections, backEdges) {
    if (backEdges.length === 0) {
        return { dashedNodes: [], dashedEdges: [] };
    }

    const dashedNodes = [];
    const dashedEdges = [];

    // 各ノードの子孫の最大深度を計算（DAG構造で）
    function calculateMaxDescendantDepth(nodeId, connections, currentDepth = 0, visited = new Set()) {
        if (visited.has(nodeId)) {
            return currentDepth - 1;
        }
        visited.add(nodeId);

        const children = connections.filter(c => c.from === nodeId).map(c => c.to);
        if (children.length === 0) {
            return currentDepth;
        }

        let maxDepth = currentDepth;
        for (const childId of children) {
            const childDepth = calculateMaxDescendantDepth(childId, connections, currentDepth + 1, visited);
            maxDepth = Math.max(maxDepth, childDepth);
        }
        return maxDepth;
    }

    // 各バックエッジについて点線ノードと点線エッジを作成
    backEdges.forEach(backEdge => {
        const targetNode = nodes.find(n => n.id === backEdge.to);
        if (!targetNode) return;

        // 点線ノードを作成（元ノードのコピー）
        const dashedNodeId = `${backEdge.to}_dashed_${backEdge.from}`;
        const dashedNode = {
            id: dashedNodeId,
            label: targetNode.label,
            originalId: backEdge.to,
            isDashed: true
        };

        // 元ノードの子孫の最大深度を計算
        const maxDepth = calculateMaxDescendantDepth(backEdge.to, regularConnections);
        dashedNode.minDepth = maxDepth + 1;

        dashedNodes.push(dashedNode);

        // 点線エッジを作成
        dashedEdges.push({
            from: backEdge.from,
            to: dashedNodeId,
            originalTo: backEdge.to,
            isDashed: true
        });
    });

    return { dashedNodes, dashedEdges };
}

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
            if (validation.backEdges.length > 0) {
                console.log(`Validation passed: Found ${validation.backEdges.length} back edge(s) (will be rendered as dashed)`);
                validation.backEdges.forEach(edge => {
                    console.log(`  - ${edge.from} --> ${edge.to} (back edge)`);
                });
            } else {
                console.log('Validation passed: Valid DAG structure');
            }

            // バックエッジを除いた通常のエッジ
            const regularConnections = connections.filter(conn => {
                return !validation.backEdges.some(be => be.from === conn.from && be.to === conn.to);
            });

            // バックエッジ用の点線エッジと点線ノードを作成
            const { dashedNodes, dashedEdges } = createDashedNodesAndEdges(
                nodes,
                regularConnections,
                validation.backEdges
            );

            // Generate HTML using the new generator
            html = generateHTML(
                nodes,
                regularConnections,
                styles,
                classDefs,
                dashedNodes,
                dashedEdges
            );
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