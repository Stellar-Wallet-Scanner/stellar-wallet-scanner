// Stellar Scan — pitch video composition (Remotion).
// 1920x1080 @ 30fps, ~2:08, Gemini "Kore" narration + ambient music bed.
//
// Design system: deep navy (#070a14) canvas, violet (#7c5cff) + cyan (#22d3ee)
// accents, Space Grotesk display / Inter body, self-hosted woff2 (no network
// needed at render time).

import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

const V = "#7c5cff"; // violet
const C = "#22d3ee"; // cyan
const BG = "#070a14";
const GOOD = "#34d399";
const MID = "#fbbf24";
const BAD = "#f87171";

const FONT_DISPLAY = '"Space Grotesk", system-ui, sans-serif';
const FONT_BODY = '"Inter", system-ui, sans-serif';
const FONT_MONO =
  '"SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace';

// ---------------------------------------------------------------------------
// Timeline — scene start times derived from the narration segment lengths.
// Every scene overlaps the next by 0.5s so a constant cross-fade can run.
// ---------------------------------------------------------------------------

const SEG = {
  hero: { wav: "seg1.wav", seconds: 12.84 },
  problem: { wav: "seg2.wav", seconds: 15.72 },
  solution: { wav: "seg3.wav", seconds: 13.37 },
  account: { wav: "seg4.wav", seconds: 18.94 },
  contract: { wav: "seg5.wav", seconds: 22.2 },
  history: { wav: "seg6.wav", seconds: 14.11 },
  architecture: { wav: "seg7.wav", seconds: 14.5 },
  cta: { wav: "seg8.wav", seconds: 10.49 },
};

const CROSS = 0.5;

const ORDER = [
  "hero",
  "problem",
  "solution",
  "account",
  "contract",
  "history",
  "architecture",
  "cta",
];

let cursor = 0;
export const SCENE_STARTS = {};
for (const id of ORDER) {
  SCENE_STARTS[id] = cursor;
  cursor += SEG[id].seconds - CROSS;
}
export const TOTAL_SECONDS = cursor + CROSS; // ≈ 127.7s

const FPS = 30;

// Scene kinds — "video" scenes loop their raw capture footage; "still" scenes
// hold a full-bleed screenshot (Or escape hatch: stills also take videos).
const SCENE_MEDIA = {
  hero: { kind: "still", src: "stills/dashboard.png" },
  problem: { kind: "none" },
  solution: { kind: "still", src: "stills/dashboard.png" },
  account: {
    kind: "still",
    src: "stills/account_result.png",
    video: "footage/B_account_scan.mp4",
  },
  contract: {
    kind: "still",
    src: "stills/contract_result.png",
    video: "footage/C_contract_scan.mp4",
  },
  history: {
    kind: "still",
    src: "stills/history.png",
    video: "footage/D_history.mp4",
  },
  analytics: {
    kind: "still",
    src: "stills/analytics.png",
    video: "footage/E_analytics.mp4",
  },
  architecture: { kind: "still", src: "stills/architecture.png" },
  cta: { kind: "still", src: "stills/vercel_deploy.png" },
};

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut = Easing.out(Easing.cubic);
const easeInOut = Easing.inOut(Easing.cubic);

function useProgress(sceneStartSec, sceneSec) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps - sceneStartSec;
  return clamp01(t / sceneSec);
}

/** Opacity window: fade in after `delay`, hold, fade out before `dur`. */
function fade(local, sceneStartSec, sceneSec, dur, delay = 0, tail = 0.4) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps - sceneStartSec;
  if (t < delay) return 0;
  const inP = clamp01((t - delay) / Math.min(0.35, dur * 0.3));
  const remaining = delay + dur - t;
  const outP =
    tail > 0 ? clamp01(remaining / Math.min(tail, dur * 0.4)) : 1;
  return Math.min(inP, outP);
}

const translate = (o, x = 0, y = 0) => ({
  opacity: o,
  transform: `translate(${x}px, ${y}px)`,
});

// ---------------------------------------------------------------------------
// Global layers: background, music bed, vignette, film grain, watermark
// ---------------------------------------------------------------------------

const Backdrop = () => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(1200px 800px at 50% -10%, #101735 0%, ${BG} 60%), ${BG}`,
    }}
  />
);

const MusicBed = () => <Audio src={staticFile("audio/bed.mp3")} volume={0.22} />;

/** Narration: each segment starts exactly at its scene's start time. */
const Narration = () => (
  <>
    {ORDER.map((id) => (
      <Sequence key={`narr-${id}`} from={Math.round(SCENE_STARTS[id] * FPS)}>
        <Audio src={staticFile(`audio/${SEG[id].wav}`)} volume={1} />
      </Sequence>
    ))}
  </>
);

const Grain = () => {
  const f = useCurrentFrame();
  const jx = (Math.sin(f * 12.9898) * 43758.5453) % 1;
  const jy = (Math.sin(f * 78.233) * 12345.6789) % 1;
  return (
    <AbsoluteFill
      style={{
        opacity: 0.05,
        background: `radial-gradient(circle at ${(jx + 1) * 30}% ${
          (jy + 1) * 30
        }%, rgba(255,255,255,0.7) 0.5px, transparent 1.4px)`,
        backgroundSize: "9px 9px",
        mixBlendMode: "overlay",
      }}
    />
  );
};

const Vignette = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(130% 100% at 50% 45%, transparent 55%, rgba(2,3,10,0.55) 100%)",
    }}
  />
);

const Watermark = () => (
  <div
    style={{
      position: "absolute",
      right: 30,
      bottom: 24,
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontFamily: FONT_DISPLAY,
      fontSize: 13,
      letterSpacing: 2,
      color: "rgba(255,255,255,0.32)",
      zIndex: 50,
    }}
  >
    <img
      src={staticFile("stills/stellar-scan-icon.png")}
      style={{ width: 15, height: 15, borderRadius: 4 }}
    />
    STELLAR SCAN
  </div>
);

/** White low-caps kicker shown in the top-left of content scenes. */
const Kicker = ({ children, o = 1, color = "rgba(255,255,255,0.5)" }) => (
  <div
    style={{
      position: "absolute",
      top: 24,
      left: 30,
      fontFamily: FONT_DISPLAY,
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: 3.5,
      color,
      opacity: o,
      zIndex: 60,
    }}
  >
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Motion chrome: scanline sweep, intro, outro
// ---------------------------------------------------------------------------

const ScanSweep = ({ o }) => {
  const f = useCurrentFrame();
  const y = interpolate(
    (f % 150) / 150,
    [0, 1],
    [-80, 1080 + 80],
    { easing: Easing.linear },
  );
  return (
    <AbsoluteFill style={{ opacity: o, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: y,
          height: 3,
          background: `linear-gradient(90deg, transparent, ${V}, ${C}, transparent)`,
          boxShadow: `0 0 24px ${V}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: y - 60,
          height: 60,
          background: `linear-gradient(180deg, transparent, rgba(124,92,255,0.08))`,
        }}
      />
    </AbsoluteFill>
  );
};

const Intro = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;

  const fadeOut = clamp01(1 - Math.max(0, (t - 4.7) / 0.55));
  if (fadeOut <= 0) return null;

  const logoP = spring({ frame: f, fps, config: { damping: 14, mass: 0.9 } });
  const scale = interpolate(logoP, [0, 1], [1.5, 1], {
    easing: easeOut,
  });
  const sweep = clamp01((t - 0.75) / 0.7);
  const tagline = clamp01((t - 1.35) / 0.5);
  const sub = clamp01((t - 1.85) / 0.5);
  const chip = clamp01((t - 2.4) / 0.45);
  const barW = 640 * clamp01((t - 2.1) / 1.1);

  return (
    <AbsoluteFill
      style={{ background: BG, alignItems: "center", justifyContent: "center", opacity: fadeOut, zIndex: 80 }}
    >
      <div
        style={{
          width: 92,
          height: 92,
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: `0 0 70px ${V}55, 0 18px 50px rgba(0,0,0,0.6)`,
          transform: `scale(${scale})`,
          opacity: clamp01(logoP * 1.4),
        }}
      >
        <Img src={staticFile("stills/stellar-scan-icon.png")} width={92} height={92} />
      </div>

      <h1
        style={{
          margin: "34px 0 0",
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 62,
          letterSpacing: -1.5,
          color: "#f2f4ff",
          textShadow: `0 0 46px ${V}66`,
          opacity: clamp01(logoP * 1.6),
          transform: `translateY(${(1 - logoP) * 26}px)`,
        }}
      >
        Stellar{" "}
        <span
          style={{
            background: `linear-gradient(90deg, ${V}, ${C})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Scan
        </span>
      </h1>

      <div
        style={{
          marginTop: 26,
          height: 4,
          width: barW,
          borderRadius: 2,
          background: `linear-gradient(90deg, ${V}, ${C})`,
          boxShadow: `0 0 18px ${V}`,
        }}
      />

      <div
        style={{
          marginTop: 30,
          display: "flex",
          gap: 12,
          opacity: tagline,
          transform: `translateY(${(1 - tagline) * 16}px)`,
        }}
      >
        <span style={{ color: C, fontSize: 20 }}>▸</span>
        <span
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 500,
            fontSize: 26,
            color: "#c6cdf3",
            letterSpacing: 0.4,
          }}
        >
          Security intelligence for Stellar, in seconds
        </span>
      </div>

      <div
        style={{
          marginTop: 18,
          fontFamily: FONT_BODY,
          fontSize: 15.5,
          color: "rgba(255,255,255,0.42)",
          letterSpacing: 2.6,
          opacity: sub,
          textTransform: "uppercase",
        }}
      >
        Read-only · No keys · No sign-up
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 56,
          display: "flex",
          gap: 10,
          opacity: chip,
        }}
      >
        {["Accounts", "Soroban contracts", "WASM", "Signers"].map((c) => (
          <div
            key={c}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: "1px solid rgba(124,92,255,0.35)",
              background: "rgba(124,92,255,0.1)",
              color: "#c9c2ff",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {c}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Outro = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const o = clamp01((t - 1.3) / 0.5);
  if (t < 1.3) return null;

  const card = spring({
    frame: Math.max(0, f - fps * 1.3),
    fps,
    config: { damping: 15 },
  });
  const glow = 0.5 + 0.5 * Math.sin(t * 2.4);

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        opacity: o,
        zIndex: 80,
      }}
    >
      <AbsoluteFill style={{ background: BG, opacity: o * 0.96 }} />
      <div
        style={{
          textAlign: "center",
          transform: `scale(${interpolate(card, [0, 1], [0.92, 1], { easing: easeOut })})`,
          opacity: card,
        }}
      >
        <div
          style={{
            width: 78,
            height: 78,
            margin: "0 auto 26px",
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: `0 0 ${50 + glow * 30}px ${V}${glow > 0.5 ? "99" : "55"}`,
          }}
        >
          <Img src={staticFile("stills/stellar-scan-icon.png")} width={78} height={78} />
        </div>

        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 56,
            letterSpacing: -1,
            color: "#f2f4ff",
          }}
        >
          Stellar{" "}
          <span
            style={{
              background: `linear-gradient(90deg, ${V}, ${C})`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Scan
          </span>
        </div>

        <div
          style={{
            marginTop: 12,
            fontFamily: FONT_DISPLAY,
            fontSize: 21,
            color: "#a9b1d6",
          }}
        >
          Know what you interact with — before you trust it.
        </div>

        <div
          style={{
            marginTop: 36,
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            padding: "15px 30px",
            borderRadius: 16,
            background: "rgba(124,92,255,0.14)",
            border: `1px solid ${V}66`,
            boxShadow: `0 0 ${24 + glow * 20}px ${V}33`,
          }}
        >
          <span style={{ fontSize: 22, color: C }}>▸</span>
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 24,
              fontWeight: 600,
              color: "#e8ebff",
              letterSpacing: 0.5,
            }}
          >
            stellar-wallet-scanner.vercel.app
          </span>
        </div>

        <div
          style={{
            marginTop: 30,
            display: "flex",
            gap: 26,
            justifyContent: "center",
            fontFamily: FONT_BODY,
            fontSize: 15,
            color: "rgba(255,255,255,0.5)",
          }}
        >
          <span>github.com/mosesifunanya/stellar-wallet-scanner</span>
          <span style={{ color: V }}>•</span>
          <span>Moses Ifunanya Nobei</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Typography blocks for problem / CTA
// ---------------------------------------------------------------------------

const PROBLEM_LINES = [
  { icon: "⇪", text: "Who can upgrade this contract?", tone: V },
  { icon: "⚿", text: "Are signers & thresholds safe?", tone: C },
  { icon: "✦", text: "Is the deployed code even valid?", tone: GOOD },
];

const AUDIT_CARD = { price: "$15k+", time: "2–6 weeks", risk: "ship first, audit later" };

const ProblemContent = ({ id, start, sec }) => {
  const q0 = 2.4;
  const step = 1.35;
  const auditAt = q0 + step * 3 + 0.55;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 26,
        zIndex: 20,
      }}
    >
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 26,
          letterSpacing: 8,
          color: "rgba(255,255,255,0.45)",
          ...translate(fade(0, start, sec, 1.2, 0.5), 0, -6),
        }}
      >
        ON-CHAIN CODE HOLDS REAL VALUE
      </div>

      {PROBLEM_LINES.map((l, i) => {
        const p = fade(0, start, sec, 1.0, q0 + i * step);
        return (
          <div
            key={l.text}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              padding: "22px 40px",
              borderRadius: 18,
              background: "rgba(13,17,38,0.88)",
              border: `1px solid ${l.tone}44`,
              boxShadow: `0 18px 50px rgba(0,0,0,0.45), 0 0 30px ${l.tone}18`,
              ...translate(p, (1 - p) * -70, 0),
            }}
          >
            <span
              style={{
                fontSize: 30,
                color: l.tone,
                textShadow: `0 0 18px ${l.tone}`,
              }}
            >
              {l.icon}
            </span>
            <span
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 500,
                fontSize: 38,
                color: "#eef0ff",
              }}
            >
              {l.text}
            </span>
          </div>
        );
      })}

      <div
        style={{
          marginTop: 8,
          display: "flex",
          alignItems: "center",
          gap: 34,
          padding: "26px 46px",
          borderRadius: 20,
          background: "linear-gradient(135deg, rgba(248,113,113,0.12), rgba(251,191,36,0.08))",
          border: "1px solid rgba(248,113,113,0.4)",
          boxShadow: "0 26px 70px rgba(0,0,0,0.55), 0 0 44px rgba(248,113,113,0.12)",
          ...translate(fade(0, start, sec, 1.1, auditAt), 0, (1 - fade(0, start, sec, 1.1, auditAt)) * 50),
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 52,
              color: BAD,
              textShadow: `0 0 26px ${BAD}55`,
            }}
          >
            {AUDIT_CARD.price}
          </div>
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 15,
              color: "rgba(255,255,255,0.55)",
              letterSpacing: 2,
              marginTop: 2,
            }}
          >
            PER CONTRACT AUDIT
          </div>
        </div>
        <div style={{ width: 1, height: 66, background: "rgba(255,255,255,0.14)" }} />
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 52,
              color: MID,
              textShadow: `0 0 26px ${MID}55`,
            }}
          >
            {AUDIT_CARD.time}
          </div>
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 15,
              color: "rgba(255,255,255,0.55)",
              letterSpacing: 2,
              marginTop: 2,
            }}
          >
            BEFORE YOU CAN SHIP
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Scene shell: media + light chrome + callouts
// ---------------------------------------------------------------------------

const Callout = ({
  x,
  y,
  label,
  detail,
  tone = V,
  o,
  side = "right",
  arrow = true,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      opacity: o,
      transform: `translateY(${(1 - o) * 12}px)`,
      zIndex: 30,
      display: "flex",
      flexDirection: side === "left" ? "row-reverse" : "row",
      alignItems: "flex-start",
      gap: 10,
    }}
  >
    {arrow && (
      <div
        style={{
          marginTop: 24,
          width: 54,
          height: 2,
          background: tone,
          boxShadow: `0 0 12px ${tone}`,
          transformOrigin: side === "left" ? "right center" : "left center",
          transform: `scaleX(${clamp01(o * 1.4)})`,
        }}
      />
    )}
    <div
      style={{
        maxWidth: 330,
        padding: "14px 20px",
        borderRadius: 14,
        background: "rgba(9,12,28,0.9)",
        border: `1px solid ${tone}55`,
        boxShadow: `0 14px 40px rgba(0,0,0,0.5), 0 0 26px ${tone}22`,
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 16.5,
          letterSpacing: 1.6,
          color: tone,
          textTransform: "uppercase",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 99,
            background: tone,
            boxShadow: `0 0 10px ${tone}`,
          }}
        />
        {label}
      </div>
      {detail && (
        <div
          style={{
            marginTop: 6,
            fontFamily: FONT_BODY,
            fontSize: 14.5,
            lineHeight: 1.45,
            color: "rgba(230,234,255,0.82)",
          }}
        >
          {detail}
        </div>
      )}
    </div>
  </div>
);

/** Soft ring highlighting a UI region. */
const Highlight = ({ x, y, w, h, tone = C, o }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: 16,
      border: `2.5px solid ${tone}`,
      boxShadow: `0 0 26px ${tone}66, inset 0 0 26px ${tone}22`,
      opacity: o * 0.9,
      zIndex: 25,
    }}
  />
);

/**
 * Zoomed screenshot stage with subtle Ken Burns drift.
 * zoom: 1 = full frame; >1 crops toward the focus point.
 */
const Stage = ({ id, start, sec, zoom = 1, focus = { x: 50, y: 50 }, drift = 0 }) => {
  const p = useProgress(start, sec);
  const kb = drift ? Math.sin(p * Math.PI * 2) * drift : 0;
  const scale = zoom * (1 + kb * 0.006);
  const tx = (50 - focus.x) * (scale - 1) * 1.9 + kb * 2;
  const ty = (50 - focus.y) * (scale - 1) * 1.9;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          width: 1920,
          height: 1080,
          transform: `scale(${scale}) translate(${tx}px, ${ty}px)`,
          transformOrigin: "50% 50%",
        }}
      >
        <Img
          src={staticFile(SCENE_MEDIA[id].src)}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
        />
      </div>
    </AbsoluteFill>
  );
};

/** Raw capture footage, optionally slowed and tinted. */
const Footage = ({ src, playbackRate = 1, zoom = 1 }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
    <div style={{ width: 1920, height: 1080, transform: `scale(${zoom})` }}>
      <OffthreadVideo
        src={staticFile(src)}
        playbackRate={playbackRate}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  </AbsoluteFill>
);

// ---------------------------------------------------------------------------
// Scenes
// ---------------------------------------------------------------------------

const SceneHero = ({ id, start, sec }) => (
  <>
    <Stage id={id} start={start} sec={sec} zoom={1.06} drift={1} />
    <Kicker o={fade(0, start, sec, sec, 1.2)}>STELLAR SCAN</Kicker>
    <Callout
      x={1150}
      y={120}
      o={fade(0, start, sec, 2.2, 7.0)}
      tone={C}
      label="One address, instant verdict"
      detail="Paste any Testnet address — account (G…) or contract (C…)."
      side="left"
    />
    <Callout
      x={150}
      y={760}
      o={fade(0, start, sec, 2.2, 9.0)}
      tone={V}
      label="Read-only by design"
      detail="No wallet connection. No private keys. Ever."
    />
  </>
);

const SceneSolution = ({ id, start, sec }) => (
  <>
    <Stage id={id} start={start} sec={sec} zoom={1.03} drift={0.7} />
    <Kicker o={fade(0, start, sec, sec, 0.4)}>THE SOLUTION</Kicker>
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 68,
        textAlign: "center",
        ...translate(fade(0, start, sec, 1.0, 0.5)),
      }}
    >
      <span
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 42,
          color: "#f2f4ff",
          textShadow: "0 6px 30px rgba(0,0,0,0.8)",
        }}
      >
        Paste an address.{" "}
        <span
          style={{
            background: `linear-gradient(90deg, ${V}, ${C})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Get a security verdict in seconds.
        </span>
      </span>
    </div>
    <Callout
      x={90}
      y={430}
      o={fade(0, start, sec, 2.4, 2.6)}
      tone={V}
      label="Accounts (G…)"
      detail="Balances, signers, thresholds — flagged when risky."
      side="left"
    />
    <Callout
      x={90}
      y={700}
      o={fade(0, start, sec, 2.4, 4.4)}
      tone={C}
      label="Contracts (C…)"
      detail="Deployed WASM, exported functions, upgrade paths."
      side="left"
    />
    <Callout
      x={1290}
      y={560}
      o={fade(0, start, sec, 2.4, 6.8)}
      tone={GOOD}
      label="Instant score"
      detail="Severity-ranked findings, zero setup."
    />
  </>
);

const SceneAccount = ({ id, start, sec }) => (
  <>
    <Stage id={id} start={start} sec={sec} zoom={1.02} drift={0.6} />
    <Kicker o={fade(0, start, sec, sec, 0.4)}>ACCOUNT SCAN</Kicker>
    <Highlight
      x={1218}
      y={196}
      w={470}
      h={150}
      tone={C}
      o={fade(0, start, sec, 3.0, 2.2)}
    />
    <Callout
      x={1180}
      y={40}
      o={fade(0, start, sec, 3.2, 2.2)}
      tone={C}
      label="Security score: 100/100"
      detail="Signers, thresholds and balances — all healthy."
    />
    <Callout
      x={80}
      y={520}
      o={fade(0, start, sec, 3.2, 6.4)}
      tone={V}
      label="Auto-funded testnet wallets"
      detail="Brand-new wallet? Stellar Scan funds it with test XLM so you can keep going."
      side="left"
    />
    <Callout
      x={80}
      y={810}
      o={fade(0, start, sec, 3.0, 11.2)}
      tone={GOOD}
      label="Every finding explained"
      detail="Plain-language reasons behind the score — not a black box."
      side="left"
    />
  </>
);

const SceneContract = ({ id, start, sec }) => (
  <>
    <Stage id={id} start={start} sec={sec} zoom={1.02} drift={0.6} />
    <Kicker o={fade(0, start, sec, sec, 0.4)}>CONTRACT SCAN</Kicker>
    <Callout
      x={1170}
      y={70}
      o={fade(0, start, sec, 3.4, 1.4)}
      tone={C}
      label="Validated WASM"
      detail="Size, validity and provenance of the deployed bytecode."
    />
    <Highlight
      x={100}
      y={330}
      w={760}
      h={260}
      tone={V}
      o={fade(0, start, sec, 4.0, 7.5)}
    />
    <Callout
      x={80}
      y={620}
      o={fade(0, start, sec, 4.4, 7.5)}
      tone={V}
      label="Upgrade path detected"
      detail="This contract can be replaced by its admin — the #1 rug-pull vector. Flagged instantly."
      side="left"
    />
    <Callout
      x={1240}
      y={620}
      o={fade(0, start, sec, 3.4, 13.5)}
      tone={MID}
      label="Every function mapped"
      detail="Exported functions enumerated from live chain state."
    />
  </>
);

const SceneHistory = ({ id, start, sec }) => {
  const half = sec / 2;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps - start;
  // First half: scan history page; second half: cross-fade to analytics.
  const histO = 1 - clamp01((t - half) / 0.5);
  const anaO = clamp01((t - half) / 0.5);
  return (
    <>
      <AbsoluteFill style={{ opacity: histO }}>
        <Stage id={id} start={start} sec={sec} zoom={1.02} drift={0.5} />
      </AbsoluteFill>
      <AbsoluteFill style={{ opacity: anaO }}>
        <Stage id="analytics" start={start} sec={sec} zoom={1.02} drift={0.5} />
      </AbsoluteFill>
      <Kicker o={fade(0, start, sec, half, 0.4) * histO}>SCAN HISTORY</Kicker>
      <Kicker o={anaO}>SECURITY ANALYTICS</Kicker>
      <Callout
        x={40}
        y={300}
        o={fade(0, start, sec, 3.0, 1.2) * histO}
        tone={V}
        label="100% local history"
        detail="Every scan saved in your browser. No account, no server, no tracking."
        side="left"
      />
      <Callout
        x={1240}
        y={230}
        o={fade(0, start, sec, 3.4, half + 0.4)}
        tone={C}
        label="Security analytics"
        detail="Score trends, averages and finding patterns across every scan."
      />
      <Callout
        x={1240}
        y={560}
        o={fade(0, start, sec, 3.0, half + 3.0)}
        tone={GOOD}
        label="Portfolio view"
        detail="Watch your whole portfolio's security posture at a glance."
      />
    </>
  );
};

const SceneArchitecture = ({ id, start, sec }) => (
  <>
    <Stage id={id} start={start} sec={sec} zoom={1.01} drift={0.4} />
    <Kicker o={fade(0, start, sec, sec, 0.4)}>UNDER THE HOOD</Kicker>
    <Callout
      x={60}
      y={150}
      o={fade(0, start, sec, 2.6, 1.0)}
      tone={V}
      label="React + Vite frontend"
      detail="TypeScript-light, fast, fully client-side dashboard."
      side="left"
    />
    <Callout
      x={60}
      y={640}
      o={fade(0, start, sec, 2.6, 4.0)}
      tone={C}
      label="Rust / Axum backend"
      detail="Blasts through XDR & WASM parsing at native speed. No keys stored."
      side="left"
    />
    <Callout
      x={1300}
      y={330}
      o={fade(0, start, sec, 2.6, 7.5)}
      tone={GOOD}
      label="Stellar Testnet RPC"
      detail="Public chain data only — Horizon + Soroban RPC."
    />
  </>
);

const SceneCta = ({ id, start, sec }) => (
  <>
    <Stage id={id} start={start} sec={sec} zoom={1.04} drift={0.6} />
    <Kicker o={fade(0, start, sec, sec, 0.4)}>LIVE ON VERCEL</Kicker>
    <Callout
      x={1150}
      y={130}
      o={fade(0, start, sec, 2.4, 1.2)}
      tone={GOOD}
      label="Production deploy"
      detail="Same engine, live at stellar-wallet-scanner.vercel.app"
      side="left"
    />
    <Callout
      x={120}
      y={720}
      o={fade(0, start, sec, 2.4, 4.0)}
      tone={C}
      label="Try your own address"
      detail="Paste any Testnet G… or C… and see the verdict instantly."
      side="left"
    />
  </>
);

// ---------------------------------------------------------------------------
// Root composition
// ---------------------------------------------------------------------------

const SCENE_COMPONENTS = {
  hero: SceneHero,
  problem: null,
  solution: SceneSolution,
  account: SceneAccount,
  contract: SceneContract,
  history: SceneHistory,
  architecture: SceneArchitecture,
  cta: SceneCta,
};

const SceneMedia = ({ id, start }) => {
  const media = SCENE_MEDIA[id];
  if (!media || !media.src || media.kind === "none") return null;
  if (media.kind === "still") {
    return <Stage id={id} start={start} sec={SEG[id].seconds} zoom={1.02} drift={0.4} />;
  }
  return null;
};

export const PitchVideo: React.FC = () => {
  const sceneAt = (t) => {
    let current = ORDER[0];
    for (const id of ORDER) if (t >= SCENE_STARTS[id]) current = id;
    return current;
  };
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const crossOpacity = (id) => {
    const s = SCENE_STARTS[id];
    const e = s + SEG[id].seconds;
    const inO = clamp01((t - s) / CROSS);
    const outO = clamp01((e - t) / CROSS);
    return Math.min(inO, outO);
  };

  const bodyFade = interpolate(t, [4.7, 5.6], [0, 1], {
    easing: easeInOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: FONT_BODY }}>
      <Backdrop />
      <MusicBed />
      <Narration />

      {/* Scene stack: every scene renders for its window; cross-fades blend */}
      {ORDER.map((id) => {
        const o = crossOpacity(id);
        if (o <= 0.001) return null;
        const Comp = SCENE_COMPONENTS[id];
        return (
          <AbsoluteFill key={id} style={{ opacity: o }}>
            <SceneMedia id={id} start={SCENE_STARTS[id]} />
            {id === "problem" && (
              <ProblemContent start={SCENE_STARTS[id]} sec={SEG.problem.seconds} />
            )}
            {Comp && <Comp start={SCENE_STARTS[id]} sec={SEG[id].seconds} id={id} />}
          </AbsoluteFill>
        );
      })}

      {/* Global intro / outro — Sequences so overlays use local time.
          Outro must be gated to the final scene, not the whole video. */}
      <Sequence from={0}>
        <Intro />
      </Sequence>
      <Sequence from={Math.round(SCENE_STARTS.cta * FPS)}>
        <Outro />
      </Sequence>

      {/* Scan sweep — subtle, over everything except intro/outro */}
      <ScanSweep o={bodyFade * 0.5} />

      {/* Vignette + grain + watermark */}
      <Vignette />
      <Grain />
      <Watermark />
    </AbsoluteFill>
  );
};

export default PitchVideo;
