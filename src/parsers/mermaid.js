// Parse Mermaid nodes from content
function parseMermaidNodes(content) {
    const nodes = [];
    const lines = content.split('\n');

    for (const line of lines) {
        const nodeMatch = line.trim().match(/^\s*(id_\d+)\["([^"]+)"\]/);
        if (nodeMatch) {
            nodes.push({
                id: nodeMatch[1],
                label: nodeMatch[2]
            });
        }
    }

    return nodes;
}

// Parse Mermaid connections from content
function parseMermaidConnections(content) {
    const connections = [];
    const lines = content.split('\n');

    for (const line of lines) {
        const connectionMatch = line.trim().match(/^\s*(id_\d+)\s+-->\s+(id_\d+)/);
        if (connectionMatch) {
            connections.push({
                from: connectionMatch[1],
                to: connectionMatch[2]
            });
        }
    }

    return connections;
}

module.exports = {
    parseMermaidNodes,
    parseMermaidConnections
};