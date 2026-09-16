# Stellar Scan — Pitch Video Script (~1:59)

> **Final render:** `video/out/pitch.mp4` (1920×1080, 1:59, ~36MB) · watch: https://gofile.io/d/ad1YDCAe
> **Thumbnail:** `assets/pitch-thumbnail.png` (embedded in README)

Voice: Gemini TTS — `Kore` (confident, warm). Style: documentary narrator, cinematic energy.
Total target: ~125s @ 30fps, 1920x1080.

| # | Scene | Dur | Narration | Visuals |
|---|-------|-----|-----------|---------|
| 1 | Cold open | 12s | Every day, new wallets and smart contracts go live on Stellar. Each one is a tiny piece of code holding real value — and almost nobody checks it before they trust it. | Starfield intro, logo forms, scan-line sweep, tagline types out |
| 2 | The problem | 17s | Who can upgrade that contract? Are its signers and thresholds set up safely? Is the deployed code even valid? A professional audit answers these questions — but it costs thousands and takes weeks. | Motion typography: three urgent questions pulse in; audit cost card slams in |
| 3 | The solution | 12s | Stellar Scan answers them in seconds. Paste any Testnet address — a wallet or a Soroban contract — and get instant, read-only security intelligence. | Logo slam, dashboard hero screenshot, glow + slow zoom |
| 4 | Account scan | 22s | For a Stellar account, Stellar Scan reads balances, signers, and thresholds, flags risky configurations — and even funds brand-new Testnet wallets automatically. Here, a healthy wallet scores a perfect one hundred. | Live UI: typing G… address, loading, score ring, findings cards; zoom + callouts |
| 5 | Contract scan | 21s | For a Soroban contract, it pulls the deployed WASM, validates it, maps every exported function, and detects upgrade, admin, and pause capabilities — with severity-ranked findings. Watch it catch the upgrade path on a live token contract. | Live UI: C… USDC SAC scan, WASM stats, findings; callouts on upgrade finding |
| 6 | History & analytics | 16s | Every scan is saved locally in your browser — no account, no server — and rolled up into security analytics: trends, averages, and a full picture at a glance. | Sidebar nav → Scan History → Security Analytics; pan over charts |
| 7 | Architecture | 13s | Under the hood: a React and Vite frontend, a Rust backend on Axum, and the Stellar SDK — read-only by design. No keys, no signing, no sign-up. | Architecture diagram animates; tech badges; quick code flash |
| 8 | Live + CTA | 12s | Stellar Scan is live on Vercel right now. Try it with your own Testnet address — and know what you're interacting with before you trust it. | Live Vercel deploy footage → end card with URL, GitHub, author |

## Segments (verbatim, for TTS)

1. "Every day, new wallets and smart contracts go live on Stellar. Each one is a tiny piece of code holding real value — and almost nobody checks it before they trust it."
2. "Who can upgrade that contract? Are its signers and thresholds set up safely? Is the deployed code even valid? A professional audit answers these questions — but it costs thousands, and takes weeks."
3. "Stellar Scan answers them in seconds. Paste any Testnet address — a wallet, or a Soroban contract — and get instant, read-only security intelligence."
4. "For a Stellar account, Stellar Scan reads balances, signers, and thresholds, flags risky configurations — and even funds brand-new Testnet wallets automatically. Here, a healthy wallet scores a perfect one hundred."
5. "For a Soroban contract, it pulls the deployed WASM, validates it, maps every exported function, and detects upgrade, admin, and pause capabilities — with severity-ranked findings. Watch it catch the upgrade path on a live token contract."
6. "Every scan is saved locally in your browser — no account, no server — and rolled up into security analytics: trends, averages, and a full picture at a glance."
7. "Under the hood: a React and Vite frontend, a Rust backend on Axum, and the Stellar SDK — read-only by design. No keys, no signing, no sign-up."
8. "Stellar Scan is live on Vercel right now. Try it with your own Testnet address — and know what you're interacting with, before you trust it."
