const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 60;
const DURATION_MS = 60000;
const TOTAL_FRAMES = FPS * (DURATION_MS / 1000); // 3600

const FRAMES_DIR = path.join(__dirname, "frames");
const OUTPUT_FILE = path.join(__dirname, "oneword-promo-60s.mp4");
const FFMPEG = require("@ffmpeg-installer/ffmpeg").path;
const CHROME = "/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome";

async function render() {
  // Create frames directory
  if (fs.existsSync(FRAMES_DIR)) {
    fs.rmSync(FRAMES_DIR, { recursive: true });
  }
  fs.mkdirSync(FRAMES_DIR);

  console.log(
    `Rendering ${TOTAL_FRAMES} frames at ${WIDTH}x${HEIGHT} @ ${FPS}fps...`
  );

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: CHROME,
    args: [
      `--window-size=${WIDTH},${HEIGHT}`,
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--font-render-hinting=none",
      "--disable-gpu",
    ],
  });

  const page = await browser.newPage();

  // Set viewport — component renders at 390x844, scale up via deviceScaleFactor
  const scaleFactor = WIDTH / 390; // ~2.77x
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: scaleFactor,
  });

  console.log("Loading page...");
  await page.goto("http://localhost:3000/promo", { waitUntil: "networkidle0" });

  // Wait for fonts
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 3000)); // Extra wait for Google Fonts

  console.log("Fonts loaded. Starting frame capture...");

  const msPerFrame = DURATION_MS / TOTAL_FRAMES; // ~16.67ms

  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const currentMs = Math.round(i * msPerFrame);

    // Set the frame time
    await page.evaluate((ms) => {
      window.setFrame(ms);
    }, currentMs);

    // Wait for React to re-render
    await page.evaluate(
      () =>
        new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r))
        )
    );

    // Capture screenshot
    const frameNum = String(i).padStart(6, "0");
    await page.screenshot({
      path: path.join(FRAMES_DIR, `frame_${frameNum}.png`),
      type: "png",
    });

    // Progress logging every 60 frames (1 second)
    if (i % 60 === 0) {
      const seconds = (currentMs / 1000).toFixed(1);
      const percent = ((i / TOTAL_FRAMES) * 100).toFixed(1);
      console.log(`Frame ${i}/${TOTAL_FRAMES} (${seconds}s) — ${percent}%`);
    }
  }

  console.log("All frames captured. Closing browser...");
  await browser.close();

  // Stitch frames into MP4 using FFmpeg
  console.log("Stitching frames into MP4...");
  const ffmpegCmd = `"${FFMPEG}" -y -framerate ${FPS} -i "${FRAMES_DIR}/frame_%06d.png" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart "${OUTPUT_FILE}"`;

  execSync(ffmpegCmd, { stdio: "inherit" });

  console.log(`\n✅ Video rendered: ${OUTPUT_FILE}`);
  console.log(`Resolution: ${WIDTH}x${HEIGHT}`);
  console.log(`Duration: 60 seconds`);
  console.log(`FPS: ${FPS}`);

  // Cleanup frames
  console.log("Cleaning up frames...");
  fs.rmSync(FRAMES_DIR, { recursive: true });

  console.log("Done!");
}

render().catch(console.error);
