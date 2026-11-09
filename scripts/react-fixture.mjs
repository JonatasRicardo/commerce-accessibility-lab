import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

export async function startReactFixture() {
  const entry = fileURLToPath(new URL('../examples/react-storefront/Storefront.tsx', import.meta.url));
  const built = await build({ entryPoints: [entry], bundle: true, write: false, platform: 'browser', format: 'iife', target: 'es2022', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' } });
  const bundle = built.outputFiles[0].contents;
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Demonstração React — seleção de produto</title><meta name="description" content="Loja fictícia para verificar práticas de acessibilidade React"><style>
    body{font:18px/1.5 system-ui,sans-serif;margin:0;background:#fff;color:#18313f}header,main{max-width:880px;margin:auto;padding:24px}article{border:1px solid #637982;border-radius:12px;padding:24px}label{display:block;font-weight:600}select,button{font:inherit;min-height:48px;min-width:48px;margin:8px 12px 8px 0;padding:10px 16px}button{background:#173e55;color:white;border:2px solid #173e55;border-radius:6px;cursor:pointer}select{background:white;color:#18313f;border:2px solid #173e55}button:focus-visible,select:focus-visible{outline:3px solid #a44a00;outline-offset:4px}.overlay{position:fixed;inset:0;background:rgba(10,30,40,.65)}.dialog{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;color:#18313f;border-radius:12px;padding:28px;width:min(560px,80vw);max-height:80vh;overflow:auto;box-shadow:0 12px 50px #0005}
    </style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`;
  const server = createServer((req, res) => {
    if (req.url === '/bundle.js') { res.setHeader('content-type', 'text/javascript; charset=utf-8'); return res.end(bundle); }
    if (req.url === '/robots.txt') { res.setHeader('content-type', 'text/plain'); return res.end('User-agent: *\nAllow: /\n'); }
    res.setHeader('content-type', 'text/html; charset=utf-8'); res.end(html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${server.address().port}`,
    close: async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } };
}
