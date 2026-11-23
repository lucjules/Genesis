// Assemble le jeu en un seul fichier HTML autonome : dist/dune-genesis.html
// usage : node tools/bundle.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let html = readFileSync(join(root, 'index.html'), 'utf8');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => {
  const js = readFileSync(join(root, src), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script>\n/* ${src} */\n${js}\n</script>`;
});
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'dune-genesis.html'), html);
console.log('dist/dune-genesis.html', (html.length / 1024).toFixed(0) + ' Ko');
