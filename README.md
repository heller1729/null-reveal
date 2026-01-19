# Accountable Wallet

A zero-knowledge proof demo that lets you prove your wallet balance is above a certain threshold — without revealing what your actual balance is.

## What's the point?

Imagine you need to prove you have enough funds for a transaction, but you don't want to show your exact balance. That's what this does. You can prove "I have at least $500" without anyone knowing if you actually have $500 or $50,000.

This is useful for:
- Privacy-preserving KYC/AML compliance
- Proving solvency without exposing holdings
- Any situation where you need to prove a condition without revealing the underlying data

## How it works

The project uses **zk-SNARKs** (Zero-Knowledge Succinct Non-Interactive Arguments of Knowledge). Here's the basic flow:

1. You enter your secret balance
2. A cryptographic commitment (hash) is created
3. You specify a threshold to prove against
4. The system generates a mathematical proof that your balance >= threshold
5. Anyone can verify this proof, but they learn nothing about your actual balance

The proof is "zero-knowledge" because it reveals nothing beyond the truth of the statement. It's "succinct" because it's small and quick to verify regardless of the complexity of what you're proving.

## Tech stack

| Component | What it does |
|-----------|--------------|
| **Circom** | Domain-specific language for writing ZK circuits |
| **snarkjs** | JavaScript library for generating and verifying proofs |
| **Groth16** | The proof system we're using (fast verification) |
| **circomlib** | Library of pre-built circuit components |

### Languages used

- **Circom** — for the circuit logic (`circuits/balance_threshold.circom`)
- **JavaScript** — for the setup script and browser app
- **HTML/CSS** — for the demo UI

Rust is used under the hood to compile the Circom compiler itself, but you don't write any Rust code.

## Project structure

```
accountable-wallet/
├── circuits/
│   └── balance_threshold.circom   # the ZK circuit
├── scripts/
│   └── setup.js                   # generates proving/verification keys
├── web/
│   ├── index.html                 # demo UI
│   ├── style.css                  # styling
│   └── app.js                     # proof generation logic
├── package.json
└── README.md
```

## Getting started

### Prerequisites

You'll need these installed:
- Node.js (v18+)
- Rust (for building Circom)
- Circom compiler
- snarkjs (`npm install -g snarkjs`)

### Installation

```bash
# clone the repo
git clone https://github.com/heller1729/accountable-wallet.git
cd accountable-wallet

# install dependencies
npm install

# compile the circuit
mkdir -p circuits/build
npm run compile

# download powers of tau and generate keys
# (you may need to manually download pot12.ptau if the auto-download fails)
npm run setup

# start the demo
npm run serve
```

Then open http://localhost:8080 in your browser.

### If the Powers of Tau download fails

The setup script tries to download the ceremony file automatically. If it fails, download it manually:

```bash
wget -O circuits/build/pot12.ptau https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_12.ptau
```

## The circuit explained

Here's what the Circom circuit does:

```circom
template BalanceThreshold() {
    signal input balance;      // private - only you know this
    signal input threshold;    // public - everyone sees this
    signal output isAccountable;
    
    // check if balance >= threshold
    component gte = GreaterEqThan(64);
    gte.in[0] <== balance;
    gte.in[1] <== threshold;
    
    isAccountable <== gte.out;
    gte.out === 1;  // proof fails if balance < threshold
}
```

The key insight: the `balance` is a private input, so it never gets revealed. The proof mathematically guarantees that `balance >= threshold` without exposing what `balance` actually is.

## How the proof works (simplified)

1. **Compile** — Circom compiles the circuit into an R1CS (constraint system) and WASM
2. **Setup** — Using a "Powers of Tau" ceremony, we generate proving and verification keys
3. **Prove** — Given private inputs, snarkjs generates a proof using the WASM circuit
4. **Verify** — Anyone with the verification key can check if the proof is valid

The math behind it involves elliptic curve cryptography and polynomial commitments, but you don't need to understand that to use it.

## Why "Powers of Tau"?

The `pot12.ptau` file comes from a multi-party computation ceremony. It's used to generate the proving/verification keys in a way that's secure as long as at least one participant was honest. Think of it as trusted setup that the community has already done for you.

## Limitations

This is a demo, not production code. In a real system you'd want:
- Proper commitment schemes (Poseidon hash inside the circuit)
- More robust error handling
- Actual on-chain verification (Solidity verifier contract)
- Security audits

## Resources

- [Circom docs](https://docs.circom.io/)
- [snarkjs repo](https://github.com/iden3/snarkjs)
- [ZK learning resources](https://learn.0xparc.org/)

## Author

Developed by [Pratham Jangra](https://github.com/heller1729)
