import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
};

const inputFile = getArg('--input');
const outputFile = getArg('--output');
const width = parseInt(getArg('--width') || '860', 10);

if (!inputFile || !outputFile) {
  console.error('Usage: node html-to-long-png.mjs --input <html> --output <png> [--width 860]');
  process.exit(1);
}

const inputPath = resolve(inputFile);
const outputPath = resolve(outputFile);

if (!existsSync(inputPath)) {
  console.error(`Input file not found: ${inputPath}`);
  process.exit(1);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width, height: 800, deviceScaleFactor: 1 });

  const fileUrl = `file:///${inputPath.replace(/\\/g, '/')}`;
  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 60000 });

  await page.waitForFunction(() => document.fonts.ready);

  const bodyHeight = await page.evaluate(() => {
    return Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
  });

  await page.setViewport({ width, height: bodyHeight, deviceScaleFactor: 1 });

  await page.screenshot({
    path: outputPath,
    fullPage: true,
    type: 'png',
  });

  const finalHeight = await page.evaluate(() => document.body.scrollHeight);
  console.log(`PNG rendered: ${width}x${finalHeight}px → ${outputPath}`);

  await browser.close();
})();
