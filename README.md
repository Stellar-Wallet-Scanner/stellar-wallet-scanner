# Stellar Scan

Stellar Scan is a security intelligence platform for the Stellar ecosystem. It provides read-only analysis of Stellar Testnet accounts and Soroban smart contracts to surface potential security risks through a simple dashboard.

## Features

- Scan Stellar Testnet accounts (`G...`)
- Scan Soroban smart contracts (`C...`)
- Analyze account balances, signers, and thresholds
- Inspect deployed contract WASM
- Detect administrative and upgrade-related capabilities
- Generate preliminary security scores and findings
- Scan history and security analytics
- Dark and light mode
- Responsive interface
- No wallet connection or transaction signing required

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

### Wallet Flow

For a new `G...` Testnet account, the backend can detect that the account is not funded and handle the Testnet funding flow before completing the scan.

For an existing `G...` account, Stellar Scan retrieves the available account information and performs the security analysis directly.

For a `C...` address, the application retrieves the deployed Soroban contract data and analyzes its WASM and exported functions.

## Tech Stack

- React
- Vite
- JavaScript
- Tailwind CSS
- Lucide React
- Stellar SDK
- Soroban
- Stellar Testnet RPC
- Stellar XDR
- Rust backend

## Getting Started

```bash
git clone YOUR_REPOSITORY_URL
cd stellar-contract-scanner
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## Network

Stellar Scan currently operates on Stellar Testnet.

All scanning is read-only.

## Security Notice

Stellar Scan provides preliminary automated security analysis. Detected capabilities are security signals for further investigation and do not automatically indicate that a contract is vulnerable.

It is not a replacement for a professional smart contract audit.

## Privacy

Stellar Scan does not require login, signup, wallet connection, private keys, or transaction signing.

Scan history is stored locally in the browser.

## Roadmap

- Deeper Soroban security analysis
- Improved authorization analysis
- Function-level risk detection
- Advanced security scoring
- Exportable security reports
- Automated contract monitoring

## Author

### Moses Ifunanya Nobei

Blockchain Developer | JavaScript Developer | Data Analyst

- GitHub: https://github.com/mosesifunanya
- LinkedIn: https://www.linkedin.com/in/mosesifunanya/
- X: https://x.com/Ifynob53

## License

Open-source project.
