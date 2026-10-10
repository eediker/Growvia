import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const allowed = new Set(['index.html', 'styles.css', 'app.js', 'model.mjs', 'config.js']);
const types = { html: 'text/html', css: 'text/css', js: 'text/javascript', mjs: 'text/javascript' };
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname.slice(1) || 'index.html';
  if (!allowed.has(path)) { res.writeHead(404).end(); return; }
  try {
    if (path === 'config.js') {
      const settings = JSON.parse(await readFile(new URL('../apps/mobile/appsettings.json', import.meta.url), 'utf8'));
      const { url, publishableKey } = settings.supabase;
      if (!url.startsWith('https://') || !publishableKey.startsWith('sb_publishable_')) throw new Error('Public Supabase configuration missing');
      const config = { supabaseUrl: url, supabasePublishableKey: publishableKey };
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' })
        .end(`window.KIDS_GUIDE_ADMIN_CONFIG = ${JSON.stringify(config)};`);
      return;
    }
    const content = await readFile(new URL(`../apps/admin/${path}`, import.meta.url));
    res.writeHead(200, { 'Content-Type': `${types[path.split('.').at(-1)]}; charset=utf-8`, 'Cache-Control': 'no-store' }).end(content);
  } catch { res.writeHead(404).end(); }
});
server.listen(4174, '127.0.0.1', () => console.log('Kids Guide Admin: http://127.0.0.1:4174'));
