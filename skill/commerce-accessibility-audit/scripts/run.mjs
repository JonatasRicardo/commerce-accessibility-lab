#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { access } from 'node:fs/promises';

const root = process.env.COMMERCE_AUDIT_ROOT ? path.resolve(process.env.COMMERCE_AUDIT_ROOT) : fileURLToPath(new URL('../../../', import.meta.url));
const entry = path.join(root, 'bin', 'commerce-audit.mjs');
try {
  await access(entry);
  const { main } = await import(pathToFileURL(entry).href);
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  console.error(`Não foi possível executar o avaliador: ${error.message}`);
  console.error('Confira a instalação do clone e, se necessário, configure COMMERCE_AUDIT_ROOT.');
  process.exitCode = 1;
}
