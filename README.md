# Stellar Scan

[![Watch the Pitch Video](https://img.shields.io/badge/🎬_Watch_the_Pitch_Video-2_min-7c5cff?style=for-the-badge)](https://github.com/Stellar-Wallet-Scanner/stellar-wallet-scanner/blob/main/video/out/pitch.mp4)
[![Live on Vercel](https://img.shields.io/badge/▲_Live_on_Vercel-stellar--wallet--scanner-000?style=for-the-badge&logo=vercel)](https://stellar-wallet-scanner.vercel.app)
[![Built on Stellar](https://img.shields.io/badge/Built_on-Stellar_Testnet-7d00ff?style=for-the-badge&logo=stellar)](https://stellar.org)
[![License](https://img.shields.io/badge/License-Open_Source-22d3ee?style=for-the-badge)](#license)

<br />

<div align="center">

  <a href="https://github.com/Stellar-Wallet-Scanner/stellar-wallet-scanner/blob/main/video/out/pitch.mp4">
    <img src="assets/pitch-thumbnail.png" alt="Stellar Scan pitch video thumbnail" width="820" />
  </a>

  <p>
    <sub>
      <b>▶ Click the thumbnail to watch the 2-minute product pitch.</b><br />
      Real UI captures, Gemini voice-over, architecture walkthrough and live Vercel deployment.
    </sub>
  </p>

</div>

<br />

## Overview

Stellar Scan is a security intelligence platform for the Stellar ecosystem.

It provides read-only analysis of Stellar Testnet accounts and Soroban smart contracts, helping users surface potential security risks through a simple and accessible dashboard.

The platform is designed to allow users to inspect Stellar addresses without connecting a wallet, providing a low-friction way to understand account configurations and deployed Soroban contract capabilities.

## Why Stellar Scan

Anyone can paste a Stellar address and quickly understand what they are interacting with before trusting it with value.

### Key capabilities

- Two address types, one scanner — wallets (`G...`) and Soroban smart contracts (`C...`)
- Instant security verdicts — scores plus severity-ranked findings, not a wall of raw chain data
- Contract risk detection — inspects deployed WASM, enumerates exported functions, and flags admin, upgrade, and pause capabilities
- Account configuration audits — balances, signers, and thresholds flagged when risky
- Zero-friction — no wallet connection, no private keys, no transaction signing, no sign-up
- Local-first history and analytics — every scan stays in your browser and rolls up into security trends

## 🎬 Product Pitch Video

The 2-minute product pitch demonstrates the core product experience, architecture, and live deployment.

### What the pitch covers

| #   | Scene               | Description                                                     |
| --- | ------------------- | --------------------------------------------------------------- |
| 1   | Cold Open           | Product introduction and security-focused positioning           |
| 2   | The Problem         | Challenges involved in understanding on-chain contract behavior |
| 3   | The Solution        | Testnet address scanning and read-only security analysis        |
| 4   | Account Scan        | Analysis of a Stellar account and security scoring              |
| 5   | Contract Scan       | Soroban WASM analysis and capability detection                  |
| 6   | History & Analytics | Local scan history and security trends                          |
| 7   | Architecture        | React + Vite → Rust/Axum → Stellar RPC                          |
| 8   | Live Demo           | Production Vercel deployment and application walkthrough        |

### Watch the pitch

[▶ Watch the full pitch video](https://github.com/Stellar-Wallet-Scanner/stellar-wallet-scanner/blob/main/video/out/pitch.mp4)

[Open the live application](https://stellar-wallet-scanner.vercel.app)

## 🖥️ Live Demo

### [stellar-wallet-scanner.vercel.app](https://stellar-wallet-scanner.vercel.app)

Stellar Scan currently operates on Stellar Testnet.

You can test the application with:

### Soroban Testnet Contract

```text
CBRNQB56MDSCZERPTQD6KRC26Z5GBI43N4G57A525I7CCI4LH6E37PFD
```

### Stellar Testnet Account

```text
GBVVPXTBPYEOYQJHIIVIOUBFXXSHYSP6GN2XZN56L7VAX7ZNT66WDFSU
```

No setup or wallet connection is required.

Simply paste a supported Testnet address and scan.

## Features

### Stellar Account Analysis

- Scan Stellar Testnet accounts (`G...`)
- Retrieve account information
- Analyze account balances
- Inspect signers
- Analyze account thresholds
- Identify potentially risky account configurations

### Soroban Contract Analysis

- Scan Soroban smart contracts (`C...`)
- Retrieve deployed contract information
- Inspect deployed WASM
- Enumerate exported functions
- Detect administrative capabilities
- Detect upgrade-related capabilities
- Detect pause-related capabilities
- Generate preliminary security findings

### User Experience

- Simple address-based scanning
- No wallet connection
- No private keys
- No transaction signing
- No account registration
- Responsive interface
- Dark and light mode
- Local scan history
- Security analytics

## How It Works

```text
Stellar Address
      ↓
Address Detection
      ↓
Account / Smart Contract
      ↓
On-chain Analysis
      ↓
Security Assessment
      ↓
Score & Findings
```

The application first determines whether the submitted address represents a Stellar account or a Soroban smart contract.

The appropriate analysis pipeline is then executed and the resulting information is processed into security findings and a preliminary security score.

## Architecture

```text
User enters Stellar address
          |
          v
    Address Detection
        /       \
      G...      C...
       |          |
       v          v
Existing or    Soroban
New Account    Contract
       |          |
       v          v
Rust Backend   WASM Analysis
       |          |
       v          v
Account Data   Contract Data
       |          |
       +-----+----+
             |
             v
      Security Assessment
             |
             v
       Score & Findings
```

### Application Flow

```text
                    ┌──────────────────────┐
                    │        User          │
                    │   Stellar Address    │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Address Detection   │
                    └──────────┬───────────┘
                               │
                    ┌──────────┴───────────┐
                    │                      │
                    ▼                      ▼
              G... Account            C... Contract
                    │                      │
                    ▼                      ▼
             Account Analysis       WASM Analysis
                    │                      │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Security Assessment  │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Score & Findings    │
                    └──────────────────────┘
```

## Wallet Flow

For a new `G...` Testnet account, the backend can detect that the account is not funded and handle the Testnet funding flow before completing the scan.

For an existing `G...` account, Stellar Scan retrieves the available account information and performs the security analysis directly.

For a `C...` address, the application retrieves the deployed Soroban contract data and analyzes its WASM and exported functions.

## Technology Stack

### Frontend

- React
- Vite
- JavaScript
- Tailwind CSS
- Lucide React

### Blockchain

- Stellar SDK
- Soroban
- Stellar Testnet
- Stellar RPC
- Stellar XDR

### Backend

- Rust
- Rust-based backend services
- WASM analysis

## Getting Started

### Prerequisites

Make sure you have Node.js and npm installed.

### Clone the repository

```bash
git clone https://github.com/Stellar-Wallet-Scanner/stellar-wallet-scanner.git
```

### Navigate into the project

```bash
cd stellar-wallet-scanner
```

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

The application will then be available through the local development URL provided by Vite.

### Build for production

```bash
npm run build
```

## Network

Stellar Scan currently operates on:

```text
Stellar Testnet
```

All scanning functionality is designed to be read-only.

The application does not require users to sign transactions or provide private keys.

## Security Model

Stellar Scan performs preliminary automated security analysis by examining publicly available account and contract information.

Detected capabilities should be treated as security signals requiring further investigation.

A detected administrative or upgrade capability does not automatically mean that a contract is vulnerable or malicious.

## Security Notice

Stellar Scan provides preliminary automated security analysis.

Detected capabilities are security signals for further investigation and do not automatically indicate that a contract is vulnerable.

Stellar Scan is not a replacement for a professional smart contract security audit.

## Privacy

Stellar Scan does not require:

- Login
- Signup
- Wallet connection
- Private keys
- Transaction signing

Scan history is stored locally in the user's browser.

## Roadmap

- Deeper Soroban security analysis
- Improved authorization analysis
- Function-level risk detection
- Advanced security scoring
- Exportable security reports
- Automated contract monitoring

## Project Structure

```text
stellar-wallet-scanner/
│
├── assets/
│
├── video/
│   └── out/
│       └── pitch.mp4
│
├── frontend/
│
├── backend/
│
├── README.md
└── ...
```

The exact project structure may evolve as development continues.

## Author

### Moses Ifunanya Nobei

Blockchain Developer | JavaScript Developer | Data Analyst

- GitHub: https://github.com/mosesifunanya
- LinkedIn: https://www.linkedin.com/in/mosesifunanya/
- X: https://x.com/Ifynob53

## License

Open-source project.
