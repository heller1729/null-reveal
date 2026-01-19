const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");
const https = require("https");

const BUILD_DIR = path.join(__dirname, "..", "circuits", "build");
const PTAU_PATH = path.join(BUILD_DIR, "pot12.ptau");
const R1CS_PATH = path.join(BUILD_DIR, "balance_threshold.r1cs");
const ZKEY_PATH = path.join(BUILD_DIR, "balance_threshold.zkey");
const VKEY_PATH = path.join(BUILD_DIR, "verification_key.json");

// downloads the powers of tau file if we don't have it yet
async function downloadPtau() {
    if (fs.existsSync(PTAU_PATH)) {
        console.log("✓ Powers of Tau file already exists");
        return;
    }

    console.log("⬇ Downloading Powers of Tau ceremony file (~50MB)...");
    console.log("  This is a one-time download, please wait...");

    const url = "https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau";

    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(PTAU_PATH);
        https.get(url, (response) => {
            response.pipe(file);
            file.on("finish", () => {
                file.close();
                console.log("✓ Powers of Tau downloaded successfully");
                resolve();
            });
        }).on("error", (err) => {
            fs.unlink(PTAU_PATH, () => { });
            reject(err);
        });
    });
}

// generates the zkey (proving key) from our circuit
async function generateZkey() {
    console.log("\n⚙ Generating proving key (zkey)...");

    if (!fs.existsSync(R1CS_PATH)) {
        console.error("✗ Error: R1CS file not found!");
        console.error("  Run 'npm run compile' first to compile the circuit.");
        process.exit(1);
    }

    await snarkjs.zKey.newZKey(R1CS_PATH, PTAU_PATH, ZKEY_PATH);
    console.log("✓ Proving key generated");

    // also export the verification key while we're at it
    const vkey = await snarkjs.zKey.exportVerificationKey(ZKEY_PATH);
    fs.writeFileSync(VKEY_PATH, JSON.stringify(vkey, null, 2));
    console.log("✓ Verification key exported");
}

// copies all the necessary files to web/ so the browser can use them
async function copyToWeb() {
    console.log("\n📁 Copying files to web directory...");

    const webDir = path.join(__dirname, "..", "web");
    const wasmSrc = path.join(BUILD_DIR, "balance_threshold_js", "balance_threshold.wasm");

    if (fs.existsSync(wasmSrc)) {
        fs.copyFileSync(wasmSrc, path.join(webDir, "balance_threshold.wasm"));
        console.log("✓ WASM file copied");
    }

    if (fs.existsSync(ZKEY_PATH)) {
        fs.copyFileSync(ZKEY_PATH, path.join(webDir, "balance_threshold.zkey"));
        console.log("✓ Proving key copied");
    }

    if (fs.existsSync(VKEY_PATH)) {
        fs.copyFileSync(VKEY_PATH, path.join(webDir, "verification_key.json"));
        console.log("✓ Verification key copied");
    }
}

async function main() {
    console.log("===========================================");
    console.log("  Accountable Wallet - Trusted Setup");
    console.log("===========================================\n");

    try {
        if (!fs.existsSync(BUILD_DIR)) {
            fs.mkdirSync(BUILD_DIR, { recursive: true });
        }

        await downloadPtau();
        await generateZkey();
        await copyToWeb();

        console.log("\n===========================================");
        console.log("  ✓ Setup Complete!");
        console.log("===========================================");
        console.log("\nNext steps:");
        console.log("  1. Run 'npm run serve' to start the demo");
        console.log("  2. Open http://localhost:8080 in your browser");
    } catch (error) {
        console.error("\n✗ Setup failed:", error.message);
        process.exit(1);
    }
}

main();
