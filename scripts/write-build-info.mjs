import { readFile, writeFile } from 'node:fs/promises';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const release = clean(process.env.BUILD_RELEASE || process.env.GITHUB_SHA || 'development');
const buildInfo = {
  app: 'owner-dashboard',
  version: packageJson.version,
  release,
  builtAt: process.env.BUILD_TIMESTAMP || new Date().toISOString(),
};

await writeFile(
  new URL('../public/build-info.json', import.meta.url),
  `${JSON.stringify(buildInfo, null, 2)}\n`,
);

function clean(value) {
  return String(value).trim().slice(0, 64) || 'development';
}
