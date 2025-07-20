import { makeNoise4D } from "https://deno.land/x/open_simplex_noise/mod.ts";
import { playTone } from "./sound.ts";

// 🌈 Color palettes
const palettes: Record<string, string[]> = {
  fire: ["\x1b[38;5;196m", "\x1b[38;5;202m", "\x1b[38;5;208m", "\x1b[38;5;214m", "\x1b[38;5;220m", "\x1b[38;5;226m"],
  ocean: ["\x1b[38;5;17m", "\x1b[38;5;18m", "\x1b[38;5;19m", "\x1b[38;5;20m", "\x1b[38;5;21m"],
  sunset: ["\x1b[38;5;198m", "\x1b[38;5;202m", "\x1b[38;5;208m", "\x1b[38;5;215m", "\x1b[38;5;223m"],
  neon: ["\x1b[38;5;201m", "\x1b[38;5;93m", "\x1b[38;5;99m", "\x1b[38;5;105m", "\x1b[38;5;111m"],
  forest: ["\x1b[38;5;22m", "\x1b[38;5;28m", "\x1b[38;5;34m", "\x1b[38;5;40m", "\x1b[38;5;46m"],
  sandstorm: ["\x1b[38;5;180m", "\x1b[38;5;186m", "\x1b[38;5;192m", "\x1b[38;5;222m", "\x1b[38;5;228m"],
  ice: ["\x1b[38;5;153m", "\x1b[38;5;159m", "\x1b[38;5;195m", "\x1b[38;5;123m", "\x1b[38;5;117m"],
};

// 🔡 Character shape sets
const charsets: Record<string, string[]> = {
  classic: [" ", ".", ":", "-", "=", "+", "*", "#", "%", "@"],
  blocks: [" ", "░", "▒", "▓", "█"],
  lines: [" ", ".", "`", "'", "-", "~", "_", "^", "="],
  bars: [" ", "|", "!", "I", "H", "#"],
  wide: [" ", "∘", "○", "◍", "●"],
  symbols: [" ", ".", "*", "o", "x", "#", "&", "@"],
};

const paletteNames = Object.keys(palettes);
let currentPalette = "fire";

const charsetNames = Object.keys(charsets);
let currentCharset = "classic";

// 🌀 Noise generator
const noise = makeNoise4D(Date.now());

// Display dimensions
const width = 80;
const height = 30;

let t = 0;
let w = 0;
let speed = 0.05;
let zoomX = 20;
let zoomY = 10;
let running = true;
let frameCount = 0;

function clearScreen() {
  Deno.stdout.writeSync(new TextEncoder().encode("\x1b[H\x1b[2J"));
}

function getChar(n: number): string {
  const charset = charsets[currentCharset];
  const i = Math.floor((n + 1) / 2 * (charset.length - 1));
  return charset[Math.min(i, charset.length - 1)];
}

function getColor(n: number): string {
  const colors = palettes[currentPalette];
  const i = Math.floor((n + 1) / 2 * (colors.length - 1));
  return colors[Math.min(i, colors.length - 1)];
}

function printHUD() {
  console.log(`\x1b[0m`);
  console.log(`Speed: ${speed.toFixed(2)} | Zoom: ${zoomX.toFixed(1)}x${zoomY.toFixed(1)} | Palette: ${currentPalette} | Charset: ${currentCharset}`);
  console.log(`←/→ = speed | ↑/↓ = zoom | c/v = palette | z/x = charset | s = save | l = load | q = quit`);
}

function animate() {
  clearScreen();

  for (let y = 0; y < height; y++) {
    let row = "";
    for (let x = 0; x < width; x++) {
      const n = noise(x / zoomX, y / zoomY, t, w);
      row += getColor(n) + getChar(n);
    }
    console.log(row);
  }

  printHUD();

  if (frameCount++ % 3 === 0) {
    const toneNoise = noise(0, 0, t, w);
    const freq = 220 + toneNoise * 220;
    playTone(freq).catch(() => {});
  }

  t += speed;
  w += 0.01;
}

function savePreset() {
  const preset = { speed, zoomX, zoomY, palette: currentPalette, charset: currentCharset };
  Deno.writeTextFileSync("preset.json", JSON.stringify(preset, null, 2));
  console.log("\nPreset saved to preset.json");
}

function loadPreset() {
  try {
    const data = JSON.parse(Deno.readTextFileSync("preset.json"));
    speed = data.speed;
    zoomX = data.zoomX;
    zoomY = data.zoomY;
    currentPalette = data.palette;
    currentCharset = data.charset;
    console.log("\nPreset loaded from preset.json");
  } catch {
    console.log("\nFailed to load preset.json");
  }
}

function listenKeys() {
  Deno.stdin.setRaw(true);
  const buf = new Uint8Array(3);

  (async () => {
    while (running) {
      const n = await Deno.stdin.read(buf);
      if (!n) continue;

      const key = new TextDecoder().decode(buf.slice(0, n));

      switch (key) {
        case "\x1b[D": speed = Math.max(speed - 0.01, 0); break;
        case "\x1b[C": speed += 0.01; break;
        case "\x1b[A": zoomX -= 1; zoomY -= 0.5; break;
        case "\x1b[B": zoomX += 1; zoomY += 0.5; break;
        case "c": {
          const idx = (paletteNames.indexOf(currentPalette) + 1) % paletteNames.length;
          currentPalette = paletteNames[idx];
          break;
        }
        case "v": {
          const idx = (paletteNames.indexOf(currentPalette) - 1 + paletteNames.length) % paletteNames.length;
          currentPalette = paletteNames[idx];
          break;
        }
        case "z": {
          const idx = (charsetNames.indexOf(currentCharset) + 1) % charsetNames.length;
          currentCharset = charsetNames[idx];
          break;
        }
        case "x": {
          const idx = (charsetNames.indexOf(currentCharset) - 1 + charsetNames.length) % charsetNames.length;
          currentCharset = charsetNames[idx];
          break;
        }
        case "s": savePreset(); break;
        case "l": loadPreset(); break;
        case "q":
          running = false;
          Deno.stdin.setRaw(false);
          console.log("\nGoodbye!\n");
          Deno.exit();
      }
    }
  })();
}

listenKeys();
setInterval(() => {
  if (running) animate();
}, 50);
