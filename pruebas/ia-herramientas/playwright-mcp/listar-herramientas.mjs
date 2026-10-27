import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const transport = new StdioClientTransport({ command: process.execPath, args: ['node_modules/@playwright/mcp/cli.js', '--headless', '--browser', 'chrome'] });
const client = new Client({ name: 'listar', version: '1.0.0' });
await client.connect(transport);
const { tools } = await client.listTools();
for (const t of tools) console.log(t.name, '::', JSON.stringify(t.inputSchema.properties ?? {}).slice(0, 220));
await client.close();
