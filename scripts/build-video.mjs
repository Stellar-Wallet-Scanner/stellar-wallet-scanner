// Assemble the pitch video: Ken Burns zooms/pans per scene, crossfade transitions,
// narration placed at scene starts, subtle ambient music bed, final loudnorm.
// Output: assets/stellar-wallet-scanner-pitch.mp4 (1080p30)
import fs from "fs";
import { execSync } from "child_process";

const SLIDES = "video-assets/slides";
const AUDIO = "video-assets/audio";
const TMP = "video-assets/tmp";
const OUTDIR = "assets";
fs.mkdirSync(TMP, { recursive: true });
fs.mkdirSync(OUTDIR, { recursive: true });

const run = (cmd) => execSync(cmd, { stdio: ["ignore", "ignore", "pipe"] });
const FPS = 30;
const PAD = 0.7;          // silence after narration inside each scene
const XFADE = 0.5;        // transition duration

const SCENES = [
  { img: "s01-title",        motion: "in"  },
  { img: "s02-problem",      motion: "in"  },
  { img: "s03-solution",     motion: "out" },
  { img: "s04-account",      motion: "pan" },  // composite: anchored, keep callouts visible
  { img: "s05-contract",     motion: "pan" },
  { img: "s06-workflow",     motion: "pan" },
  { img: "s07-registry",     motion: "pan" },
  { img: "s08-architecture", motion: "in"  },
  { img: "s09-code",         motion: "out" },
  { img: "s10-value",        motion: "in"  },
  { img: "s11-mobile",       motion: "out" },
  { img: "s12-outro",        motion: "in"  },
].map((s, i) => {
  const n = String(i + 1).padStart(2, "0");
  const meta = JSON.parse(fs.readFileSync(`${AUDIO}/scene-${n}.json`, "utf8"));
  const narr = `${AUDIO}/scene-${n}.mp3`;
  const dur = Math.max(5, meta.dur + PAD);
  return { ...s, n, narr, audioDur: meta.dur, dur };
});

const total = SCENES.reduce((a, s) => a + s.dur, 0) - XFADE * (SCENES.length - 1);
console.log(`[build] narration total ${SCENES.reduce((a, s) => a + s.audioDur, 0).toFixed(1)}s → video ${total.toFixed(1)}s`);

// ---- 1. Per-scene motion clips (zoompan, 1920x1080@30) ----
for (const s of SCENES) {
  const frames = Math.round(s.dur * FPS) + 2;
  const zmax = s.motion === "pan" ? 1.06 : 1.09;
  let z, x, y;
  if (s.motion === "pan") { // anchored top-left slow push — keeps callouts in frame
    z = `1+${(zmax - 1).toFixed(4)}*on/${frames}`;
    x = "0"; y = "0";
  } else if (s.motion === "out") { // zoom-out, centered
    z = `${zmax.toFixed(4)}-${(zmax - 1).toFixed(4)}*on/${frames}`;
    x = "iw/2-(iw/zoom/2)"; y = "ih/2-(ih/zoom/2)";
  } else { // zoom-in, centered
    z = `1+${(zmax - 1).toFixed(4)}*on/${frames}`;
    x = "iw/2-(iw/zoom/2)"; y = "ih/2-(ih/zoom/2)";
  }
  run(
    `ffmpeg -y -loop 1 -i ${SLIDES}/${s.img}.png -frames:v ${frames} ` +
    `-vf "zoompan=z='${z}':x='${x}':y='${y}':d=${frames}:s=1920x1080:fps=${FPS},format=yuv420p" ` +
    `-c:v libx264 -preset fast -crf 18 ${TMP}/v-${s.n}.mp4`,
  );
  console.log(`[build] scene ${s.n} clip ${s.dur.toFixed(1)}s (${s.motion})`);
}

// ---- 2. Video: xfade chain ----
const TRANS = ["fade", "smoothleft", "fade", "circleopen", "fade", "smoothup", "fade", "smoothleft", "fade", "circleopen", "fade"];
let inputs = SCENES.map((s) => `-i ${TMP}/v-${s.n}.mp4`).join(" ");
let fc = "";
let prev = "[0:v]";
let offset = SCENES[0].dur;
const starts = [0];
for (let i = 1; i < SCENES.length; i++) {
  starts.push(offset);
  const t = TRANS[(i - 1) % TRANS.length];
  const out = i === SCENES.length - 1 ? "[vout]" : `[vx${i}]`;
  fc += `${prev}[${i}:v]xfade=transition=${t}:duration=${XFADE}:offset=${offset.toFixed(3)}${out};`;
  prev = out;
  offset += SCENES[i].dur - XFADE;
}
fc = fc.slice(0, -1);
run(`ffmpeg -y ${inputs} -filter_complex "${fc}" -map "[vout]" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p ${TMP}/video-nosound.mp4`);
console.log("[build] video track done");

// ---- 3. Audio: narration at scene starts + ambient bed ----
const aIn = SCENES.map((s) => `-i ${s.narr}`).join(" ");
const delays = SCENES.map((s, i) => `[${i}:a]adelay=${Math.round((starts[i] + 0.45) * 1000)}|${Math.round((starts[i] + 0.45) * 1000)}[a${i}]`).join(";");
// Ambient bed: slow-breathing low pad (A2 + E3 + A3) — subtle, non-distracting
const bed =
  "aevalsrc=0.055*sin(2*PI*110*t)*(0.65+0.35*sin(2*PI*0.045*t))" +
  "+0.035*sin(2*PI*165*t)*(0.6+0.4*sin(2*PI*0.062*t+1.3))" +
  "+0.022*sin(2*PI*220*t)*(0.55+0.45*sin(2*PI*0.053*t+2.1))" +
  `:s=44100:d=${total.toFixed(2)},lowpass=f=520,afade=t=in:st=0:d=2.5,afade=t=out:st=${(total - 3).toFixed(2)}:d=3[bed]`;
const mixParts = SCENES.map((_, i) => `[a${i}]`).join("") + "[bed]amix=inputs=" + (SCENES.length + 1) + ":duration=longest:normalize=0[amix]";
run(
  `ffmpeg -y ${aIn} -filter_complex "${bed};${delays};${mixParts};` +
  `[amix]loudnorm=I=-14:TP=-1.5:LRA=11,aresample=44100[aout]" ` +
  `-map "[aout]" -t ${total.toFixed(2)} -c:a aac -b:a 192k ${TMP}/audio.m4a`,
);
console.log("[build] audio track done");

// ---- 4. Mux ----
const OUT = `${OUTDIR}/stellar-wallet-scanner-pitch.mp4`;
run(
  `ffmpeg -y -i ${TMP}/video-nosound.mp4 -i ${TMP}/audio.m4a -map 0:v -map 1:a ` +
  `-c:v copy -c:a copy -movflags +faststart ${OUT}`,
);
console.log("[build] muxed", OUT);

// ---- 5. Thumbnail with play button ----
try {
  run(
    `ffmpeg -y -i ${SLIDES}/s01-title.png -vf "` +
    `drawbox=x=790:y=430:w=340:h=220:color=0x060b09@0.55:t=fill,` +
    `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='▶':fontcolor=0x8FE6BD:fontsize=130:x=905:y=455,` +
    `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='WATCH  THE  PITCH':fontcolor=white:fontsize=34:box=1:boxcolor=0x060b09@0.55:boxborderw=18:x=(w-text_w)/2:y=700" ` +
    `${OUTDIR}/pitch-video-thumb.png`,
  );
  console.log("[build] thumbnail done");
} catch (e) {
  fs.copyFileSync(`${SLIDES}/s01-title.png`, `${OUTDIR}/pitch-video-thumb.png`);
  console.log("[build] thumbnail fallback (plain slide)");
}

console.log("[build] DONE", fs.statSync(OUT).size, "bytes");
