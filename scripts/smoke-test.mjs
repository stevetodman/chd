#!/usr/bin/env node

import process from 'node:process';

const usage = `Usage: node scripts/smoke-test.mjs <base-url>

Examples:
  node scripts/smoke-test.mjs https://example.com`;

if (process.argv.length < 3) {
  console.error('Error: missing base URL.');
  console.error(usage);
  process.exit(1);
}

const baseUrlRaw = process.argv[2];
let baseUrl;
try {
  baseUrl = new URL(baseUrlRaw);
} catch (error) {
  console.error(`Error: invalid URL "${baseUrlRaw}"`);
  console.error(usage);
  process.exit(1);
}

if (!['http:', 'https:'].includes(baseUrl.protocol)) {
  console.error(`Error: unsupported protocol "${baseUrl.protocol}". Expected http or https.`);
  process.exit(1);
}

const SPA_ROUTES = ['/dashboard', '/practice'];

function resolveUrl(pathOrUrl) {
  try {
    return new URL(pathOrUrl, baseUrl).toString();
  } catch (error) {
    throw new Error(`Failed to resolve URL for ${pathOrUrl}: ${error.message}`);
  }
}

async function assertStatusOk(url, description) {
  const response = await fetch(url, { redirect: 'manual' });
  if (response.status !== 200) {
    throw new Error(`${description} did not return HTTP 200 (received ${response.status}).`);
  }
  return response;
}

async function main() {
  console.log(`Running smoke test against ${baseUrl.toString()}`);

  const rootResponse = await assertStatusOk(resolveUrl('/'), 'Root document');
  const rootHtml = await rootResponse.text();
  console.log('✔ Root document returned HTTP 200.');

  const scriptMatches = [...rootHtml.matchAll(/<script[^>]*src=["']([^"']+\.js)["'][^>]*><\\/script>/gi)];
  if (scriptMatches.length === 0) {
    throw new Error('Unable to find any JavaScript bundles in the root HTML.');
  }

  const preferredScript = scriptMatches.find((match) => /(main|index|app)/i.test(match[1])) ?? scriptMatches[0];
  const scriptUrl = resolveUrl(preferredScript[1]);
  await assertStatusOk(scriptUrl, 'Main JavaScript bundle');
  console.log(`✔ Loaded JavaScript bundle at ${scriptUrl}.`);

  for (const route of SPA_ROUTES) {
    const routeUrl = resolveUrl(route);
    const response = await assertStatusOk(routeUrl, `SPA route ${route}`);
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) {
      throw new Error(`SPA route ${route} did not return an HTML response (content-type: ${contentType || 'unknown'}).`);
    }
    const body = await response.text();
    if (!body.includes('id="root"')) {
      throw new Error(`SPA route ${route} response does not contain the root app div.`);
    }
    console.log(`✔ SPA route ${route} returned HTML with root app div.`);
  }

  console.log('✅ Smoke test completed successfully.');
}

main().catch((error) => {
  console.error(`❌ Smoke test failed: ${error.message}`);
  process.exit(1);
});
