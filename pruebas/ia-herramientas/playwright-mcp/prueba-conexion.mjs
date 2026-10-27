// Comprobación sin modelo: arranca el servidor MCP con las mismas opciones que cliente.mjs, navega y toma snapshot.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { existsSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const args = ['node_modules/@playwright/mcp/cli.js', '--headless', '--viewport-size', '1280x720', '--isolated'];
if (existsSync(CHROME)) args.push('--executable-path', CHROME); else args.push('--browser', 'chrome');
const client = new Client({ name: 'conexion', version: '1.0.0' });
await client.connect(new StdioClientTransport({ command: process.execPath, args }));
const t0 = Date.now();
await client.callTool({ name: 'browser_navigate', arguments: { url: 'http://localhost:5173/login' } });
const s = await client.callTool({ name: 'browser_snapshot', arguments: {} });
const texto = s.content.filter(c => c.type === 'text').map(c => c.text).join('\n');
console.log(texto.slice(0, 1200)); console.log('... longitud snapshot:', texto.length, 'ms:', Date.now() - t0);
await client.close();
