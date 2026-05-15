import { GoogleGenAI } from '@google/genai';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// Load .env if dotenv available
try {
  const { config } = await import('dotenv');
  config();
} catch {}

const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
};

const prompt = getArg('--prompt');
const outputFile = getArg('--output');
const sizeArg = getArg('--size') || '860x860';

if (!prompt || !outputFile) {
  console.error('Usage: node generate-image.mjs --prompt "<text>" --output <path> [--size WxH]');
  process.exit(1);
}

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error('ERROR: GOOGLE_API_KEY not set. Set it in .env or environment.');
  console.error('Get a free key at: https://aistudio.google.com/app/apikey');
  process.exit(1);
}

const [widthStr, heightStr] = sizeArg.split('x');
const imgWidth = parseInt(widthStr, 10);
const imgHeight = parseInt(heightStr, 10);

const outputPath = resolve(outputFile);
mkdirSync(dirname(outputPath), { recursive: true });

(async () => {
  try {
    const ai = new GoogleGenAI({ apiKey });

    const aspectRatio = imgWidth >= imgHeight
      ? (imgWidth / imgHeight >= 1.5 ? '16:9' : '1:1')
      : (imgHeight / imgWidth >= 1.5 ? '9:16' : '1:1');

    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/png',
        aspectRatio,
      },
    });

    const imageData = response.generatedImages[0].image.imageBytes;
    const buffer = Buffer.from(imageData, 'base64');
    writeFileSync(outputPath, buffer);
    console.log(`Image generated: ${outputPath} (${sizeArg})`);
  } catch (err) {
    console.error('Image generation failed:', err.message);
    process.exit(1);
  }
})();
