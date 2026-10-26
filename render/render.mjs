// Renders one devotion image to JPEG.
//
//   node render/render.mjs --payload '{"date":"2026-11-01",...}' --out out.jpg
//   node render/render.mjs --payload-b64 <base64 json> --upload
//
// With --upload the image is sent to the dashboard app (APP_URL) together with
// the shared RENDER_SECRET; the app stores it and sends the Telegram preview.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { buildHtml } from './template.mjs';

const here = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, '');
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) args[key] = true;
    else args[key] = argv[++i];
  }
  return args;
}

export async function renderJpeg(data) {
  const logoPath = join(here, 'assets', 'logo.png');
  const logoDataUrl = existsSync(logoPath)
    ? `data:image/png;base64,${readFileSync(logoPath).toString('base64')}`
    : undefined;

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
    await page.setContent(buildHtml({ ...data, logoDataUrl }), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => window.fitText());
    return await page.screenshot({ type: 'jpeg', quality: 92 });
  } finally {
    await browser.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const raw = args['payload-b64']
    ? Buffer.from(args['payload-b64'], 'base64').toString('utf8')
    : args['payload-file']
      ? readFileSync(args['payload-file'], 'utf8')
      : args.payload;
  if (!raw) throw new Error('Pass --payload, --payload-b64 or --payload-file');
  const data = JSON.parse(raw);

  const jpeg = await renderJpeg(data);

  if (args.out) {
    writeFileSync(args.out, jpeg);
    console.log(`Wrote ${args.out}`);
  }

  if (args.upload) {
    const { APP_URL, RENDER_SECRET } = process.env;
    if (!APP_URL || !RENDER_SECRET) throw new Error('APP_URL and RENDER_SECRET must be set to upload');
    const res = await fetch(`${APP_URL.replace(/\/$/, '')}/api/render-callback?date=${data.date}&notify=${data.notify ? 1 : 0}`, {
      method: 'POST',
      headers: { 'content-type': 'image/jpeg', authorization: `Bearer ${RENDER_SECRET}` },
      body: jpeg,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status} ${await res.text()}`);
    console.log(`Uploaded image for ${data.date}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
