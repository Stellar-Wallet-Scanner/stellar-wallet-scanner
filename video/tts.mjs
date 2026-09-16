// Gemini TTS narration generator for the Stellar Scan pitch video.
// Usage: GEMINI_API_KEY=xxx node video/tts.mjs
// Generates per-segment WAV (24kHz mono) into video/audio/segments.

import { spawnSync } from "node:child_process";
import { GoogleGenAI } from "@google/genai";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = path.join(__dirname, "audio", "segments");

const MODEL = "gemini-2.5-flash-preview-tts";
const VOICE = "Kore";

const SEGMENTS = [
  { id: "seg1", text: "Every day, new wallets and smart contracts go live on Stellar. Each one is a tiny piece of code holding real value — and almost nobody checks it before they trust it." },
  { id: "seg2", text: "Who can upgrade that contract? Are its signers and thresholds set up safely? Is the deployed code even valid? A professional audit answers these questions — but it costs thousands, and takes weeks." },
  { id: "seg3", text: "Stellar Scan answers them in seconds. Paste any Testnet address — a wallet, or a Soroban contract — and get instant, read-only security intelligence." },
  { id: "seg4", text: "For a Stellar account, Stellar Scan reads balances, signers, and thresholds, flags risky configurations — and even funds brand-new Testnet wallets automatically. Here, a healthy wallet scores a perfect one hundred." },
  { id: "seg5", text: "For a Soroban contract, it pulls the deployed WASM, validates it, maps every exported function, and detects upgrade, admin, and pause capabilities — with severity-ranked findings. Watch it catch the upgrade path on a live token contract." },
  { id: "seg6", text: "Every scan is saved locally in your browser — no account, no server — and rolled up into security analytics: trends, averages, and a full picture at a glance." },
  { id: "seg7", text: "Under the hood: a React and Vite frontend, a Rust backend on Axum, and the Stellar SDK — read-only by design. No keys, no signing, no sign-up." },
  { id: "seg8", text: "Stellar Scan is live on Vercel right now. Try it with your own Testnet address — and know what you're interacting with, before you trust it." },
];

// Parse RIFF/WAVE PCM16 and return { sampleRate, pcm (Int16 samples) }
function parseWav(buffer) {
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Not a RIFF/WAVE file");
  }

  let offset = 12;
  let sampleRate = 0;
  let channels = 1;
  let pcm = null;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const dataStart = offset + 8;

    if (chunkId === "fmt ") {
      channels = buffer.readUInt16LE(dataStart + 2);
      sampleRate = buffer.readUInt32LE(dataStart + 4);
    } else if (chunkId === "data") {
      pcm = buffer.subarray(dataStart, dataStart + chunkSize);
    }

    offset = dataStart + chunkSize + (chunkSize % 2);
  }

  if (!pcm || !sampleRate) {
    throw new Error("WAV missing fmt or data chunk");
  }

  return { sampleRate, channels, pcm };
}

// Convert PCM (any channel count, any rate) to mono 48kHz WAV buffer
function toMono48kWav({ sampleRate, channels, pcm }) {
  const srcSamples = pcm.length / 2 / channels;
  const outSamples = Math.max(1, Math.floor((srcSamples * 48000) / sampleRate));
  const out = Buffer.alloc(outSamples * 2);

  const readMono = (index) => {
    const i = Math.max(0, Math.min(srcSamples - 1, index));
    let mono = 0;

    for (let c = 0; c < channels; c += 1) {
      mono += pcm.readInt16LE(Math.floor(i) * channels * 2 + c * 2);
    }

    return mono / channels;
  };

  for (let i = 0; i < outSamples; i += 1) {
    const srcIndex = (i * sampleRate) / 48000;
    const i0 = Math.floor(srcIndex);
    const frac = srcIndex - i0;
    const value = readMono(i0) + (readMono(i0 + 1) - readMono(i0)) * frac;

    out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(value))), i * 2);
  }

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + out.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(48000, 24);
  header.writeUInt32LE(48000 * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(out.length, 40);

  return Buffer.concat([header, out]);
}

async function gttsSegment(text, outPath) {
  const mp3 = outPath.replace(/\.wav$/, ".src.mp3");
  await new Promise((resolve, reject) => {
    const py = `from gtts import gTTS; gTTS(${JSON.stringify(text)}, lang="en", tld="com").save(${JSON.stringify(mp3)})`;
    const p = spawnSync("python3", ["-c", py], { stdio: "pipe", timeout: 60_000 });
    if (p.status !== 0) reject(new Error(p.stderr?.toString().slice(0, 200) || "gTTS failed"));
    else resolve();
  });
  await new Promise((resolve, reject) => {
    const p = spawnSync("ffmpeg", ["-y", "-i", mp3, "-ar", "48000", "-ac", "1", "-sample_fmt", "s16", outPath], { stdio: "pipe", timeout: 60_000 });
    if (p.status !== 0) reject(new Error(p.stderr?.toString().slice(0, 200) || "ffmpeg failed"));
    else resolve();
  });
  await fs.unlink(mp3).catch(() => {});
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  const useGemini = Boolean(apiKey);
  if (!useGemini) console.log("No GEMINI_API_KEY — using gTTS fallback voice.");

  const ai = useGemini ? new GoogleGenAI({ apiKey }) : null;
  await fs.mkdir(AUDIO_DIR, { recursive: true });

  const durations = {};

  for (const seg of SEGMENTS) {
    const outPath = path.join(AUDIO_DIR, `${seg.id}.wav`);

    try {
      const stat = await fs.stat(outPath);
      if (stat.size > 1000) {
        console.log(`${seg.id}: exists, skipping`);
        continue;
      }
    } catch {
      // generate below
    }

    process.stdout.write(`${seg.id}: generating (${useGemini ? "gemini" : "gTTS"})... `);

    let wav;
    if (useGemini) {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts: [{ text: seg.text }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } },
          },
        },
      });

      const inline = response?.candidates?.[0]?.content?.parts?.find(
        (part) => part?.inlineData?.data,
      )?.inlineData;

      if (!inline) {
        throw new Error(`No audio returned for ${seg.id}`);
      }

      wav = toMono48kWav(parseWav(Buffer.from(inline.data, "base64")));
    } else {
      await gttsSegment(seg.text, outPath);
    }

    if (useGemini) {
      await fs.writeFile(outPath, wav);
    }

    const stat = await fs.stat(outPath);
    const seconds = stat.size / 2 / 48000; // PCM16 mono 48kHz: 2 bytes per sample
    durations[seg.id] = Number(seconds.toFixed(2));
    console.log(`${seconds.toFixed(2)}s`);
  }

  console.log(JSON.stringify(durations, null, 2));
  await fs.writeFile(path.join(AUDIO_DIR, "durations.json"), JSON.stringify(durations, null, 2));
}

main().catch((error) => {
  console.error("TTS failed:", error?.message || error);
  process.exit(1);
});
