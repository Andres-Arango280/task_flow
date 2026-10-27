import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const transport = new StdioClientTransport({ command: process.execPath, args: ['node_modules/@playwright/mcp/cli.js', '--headless', '--browser', 'chrome'] });
const client = new Client({ name: 'esquemas', version: '1.0.0' });
await client.connect(transport);
const { tools } = await client.listTools();
for (const n of ['browser_click','browser_type','browser_fill_form','browser_take_screenshot','browser_snapshot','browser_wait_for','browser_navigate']) {
  const t = tools.find(x => x.name === n); console.log('###', n, '-', t.description); console.log(JSON.stringify(t.inputSchema, null, 0)); }
await client.close();
