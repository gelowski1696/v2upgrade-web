import { access, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const buildRoot = path.resolve('dist/ownerdashboard-posv2/browser');
const failures = [];

try {
  await access(buildRoot);
} catch {
  console.error(`Production build not found at ${buildRoot}. Run npm run build first.`);
  process.exit(1);
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
    }),
  );
  return nested.flat();
}

const files = await listFiles(buildRoot);
const relativeFiles = files.map((file) => path.relative(buildRoot, file).replaceAll('\\', '/'));
const sourceMaps = relativeFiles.filter((file) => file.endsWith('.map'));
const mainScripts = files.filter((file) => /(?:^|[\\/])main-[^\\/]+\.js$/i.test(file));
const stylesheets = files.filter((file) => file.endsWith('.css'));
const mainScriptBytes = await totalSize(mainScripts);
const stylesheetBytes = await totalSize(stylesheets);

if (mainScriptBytes > 800 * 1024) {
  failures.push(`main JavaScript is ${mainScriptBytes} bytes; budget is 819200 bytes`);
}
if (stylesheetBytes > 60 * 1024) {
  failures.push(`stylesheets are ${stylesheetBytes} bytes; budget is 61440 bytes`);
}

if (sourceMaps.length > 0) {
  failures.push(`source maps were emitted: ${sourceMaps.join(', ')}`);
}

const indexPath = path.join(buildRoot, 'index.html');
const indexHtml = await readFile(indexPath, 'utf8');

if (/onload=["']this\.media=/i.test(indexHtml)) {
  failures.push('index.html contains the CSP-incompatible inline stylesheet loader');
}

const stylesheetMatch = indexHtml.match(
  /<link\s+rel=["']stylesheet["'][^>]*href=["']([^"']+\.css)["'][^>]*>/i,
);

if (!stylesheetMatch) {
  failures.push('index.html does not contain a normal stylesheet link');
} else {
  const stylesheetPath = path.join(buildRoot, stylesheetMatch[1].replace(/^\//, ''));
  try {
    await access(stylesheetPath);
  } catch {
    failures.push(`referenced stylesheet is missing: ${stylesheetMatch[1]}`);
  }
}

const textFiles = files.filter((file) => /\.(?:css|html|js|json)$/i.test(file));
const forbiddenPatterns = [
  {
    label: 'development HTTP endpoint',
    pattern: /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?/i,
  },
  {
    label: 'server-only secret name',
    pattern:
      /\b(?:DATABASE_URL|DEVICE_JWT_SECRET|JWT_ACCESS_SECRET|JWT_REFRESH_SECRET|PORTAL_JWT_ACCESS_SECRET|POSTGRES_PASSWORD|RESEND_API_KEY|RESEND_WEBHOOK_SECRET)\b/,
  },
  {
    label: 'private key material',
    pattern: /-----BEGIN (?:EC |OPENSSH |RSA )?PRIVATE KEY-----/,
  },
  {
    label: 'source map reference',
    pattern: /sourceMappingURL=/,
  },
];

for (const file of textFiles) {
  const content = await readFile(file, 'utf8');
  for (const check of forbiddenPatterns) {
    if (check.pattern.test(content)) {
      failures.push(`${check.label} found in ${path.relative(buildRoot, file)}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Production build verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const totalBytes = (await Promise.all(files.map(async (file) => (await stat(file)).size))).reduce(
  (sum, size) => sum + size,
  0,
);

if (totalBytes > 1_500 * 1024) {
  failures.push(`production output is ${totalBytes} bytes; budget is 1536000 bytes`);
}

if (failures.length > 0) {
  console.error('Production build verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Production build verified: ${files.length} files, ${totalBytes} bytes total, ${mainScriptBytes} bytes main JavaScript, ${stylesheetBytes} bytes CSS.`,
);

async function totalSize(selectedFiles) {
  return (await Promise.all(selectedFiles.map(async (file) => (await stat(file)).size))).reduce(
    (sum, size) => sum + size,
    0,
  );
}
