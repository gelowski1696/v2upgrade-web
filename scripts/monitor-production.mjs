import tls from 'node:tls';
import { performance } from 'node:perf_hooks';

const baseUrl = new URL(process.env.OWNER_URL || 'https://vmjamdocuai.cloud');
const maximumLatencyMs = numberFromEnvironment('MONITOR_MAX_LATENCY_MS', 5_000);
const minimumCertificateDays = numberFromEnvironment('MONITOR_MIN_CERTIFICATE_DAYS', 14);
const failures = [];
const results = {};

await checkPage();
await checkApi();
await checkBuild();
await checkCertificate();

if (failures.length) {
  console.error(JSON.stringify({ status: 'FAIL', failures, results }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ status: 'PASS', results }, null, 2));

async function checkPage() {
  const result = await timedFetch('/');
  requireStatus(result, 'dashboard');
  for (const [header, expected] of [
    ['content-security-policy', "default-src 'self'"],
    ['strict-transport-security', 'max-age='],
    ['x-content-type-options', 'nosniff'],
    ['x-frame-options', 'DENY'],
    ['x-robots-tag', 'noindex'],
  ]) {
    const value = result.response?.headers.get(header) || '';
    if (!value.toLowerCase().includes(expected.toLowerCase())) {
      failures.push(`dashboard ${header} is missing or invalid`);
    }
  }
  results.dashboardLatencyMs = result.durationMs;
}

async function checkApi() {
  const result = await timedFetch('/api/v1/health');
  requireStatus(result, 'API health');
  const body = result.response ? await result.response.json().catch(() => null) : null;
  if (body?.status !== 'ok' || body?.service !== 'subsapi' || body?.checks?.database !== 'ok') {
    failures.push('API health response is invalid or the database is unavailable');
  }
  if (!usableRelease(body?.release)) failures.push('API release identifier is invalid');
  results.apiLatencyMs = result.durationMs;
  results.apiRelease = body?.release;
}

async function checkBuild() {
  const result = await timedFetch('/build-info.json');
  requireStatus(result, 'build metadata');
  const body = result.response ? await result.response.json().catch(() => null) : null;
  if (body?.app !== 'owner-dashboard' || !usableRelease(body?.release)) {
    failures.push('dashboard build metadata is invalid');
  }
  results.webRelease = body?.release;
}

async function checkCertificate() {
  if (baseUrl.protocol !== 'https:') {
    failures.push('OWNER_URL must use HTTPS');
    return;
  }
  const certificate = await certificateFor(baseUrl.hostname, Number(baseUrl.port || 443));
  const validUntil = Date.parse(certificate.valid_to || '');
  const remainingDays = Math.floor((validUntil - Date.now()) / 86_400_000);
  if (!Number.isFinite(remainingDays) || remainingDays < minimumCertificateDays) {
    failures.push(`TLS certificate expires in ${remainingDays} days`);
  }
  results.certificateExpiresAt = Number.isFinite(validUntil)
    ? new Date(validUntil).toISOString()
    : null;
  results.certificateDaysRemaining = remainingDays;
}

async function timedFetch(path) {
  const startedAt = performance.now();
  const response = await fetch(new URL(path, baseUrl), {
    headers: { 'User-Agent': 'POSV2-Production-Monitor/1.0' },
    redirect: 'error',
    signal: AbortSignal.timeout(maximumLatencyMs),
  }).catch((error) => {
    failures.push(`${path} request failed: ${error instanceof Error ? error.message : error}`);
    return null;
  });
  return {
    response,
    durationMs: Math.round(performance.now() - startedAt),
  };
}

function requireStatus(result, label) {
  if (!result.response?.ok) {
    failures.push(`${label} returned HTTP ${result.response?.status ?? 'unavailable'}`);
  }
  if (result.durationMs > maximumLatencyMs) {
    failures.push(`${label} exceeded ${maximumLatencyMs} ms`);
  }
}

function usableRelease(value) {
  return typeof value === 'string' && value !== 'development' && value !== 'unavailable';
}

function certificateFor(host, port) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      { host, port, servername: host, rejectUnauthorized: true, timeout: maximumLatencyMs },
      () => {
        const certificate = socket.getPeerCertificate();
        socket.end();
        resolve(certificate);
      },
    );
    socket.once('timeout', () => socket.destroy(new Error('TLS connection timed out')));
    socket.once('error', reject);
  }).catch((error) => {
    failures.push(
      `TLS certificate check failed: ${error instanceof Error ? error.message : error}`,
    );
    return {};
  });
}

function numberFromEnvironment(name, fallback) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isFinite(value) || value < 1) throw new Error(`${name} must be a positive number.`);
  return value;
}
