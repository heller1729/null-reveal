// accountable wallet demo
// proves balance >= threshold without revealing the actual balance

let currentBalance = null;
let currentCommitment = null;
let currentProof = null;
let currentPublicSignals = null;

const elements = {
    balance: document.getElementById('balance'),
    threshold: document.getElementById('threshold'),
    createCommitment: document.getElementById('createCommitment'),
    generateProof: document.getElementById('generateProof'),
    verifyProof: document.getElementById('verifyProof'),
    commitmentResult: document.getElementById('commitmentResult'),
    commitmentValue: document.getElementById('commitmentValue'),
    proofStatus: document.getElementById('proofStatus'),
    proofResult: document.getElementById('proofResult'),
    proofValue: document.getElementById('proofValue'),
    verificationResult: document.getElementById('verificationResult'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingText: document.getElementById('loadingText')
};

// sha-256 hash for creating the commitment
async function generateCommitment(balance, salt) {
    const data = `${balance}:${salt}`;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

function generateSalt() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

// step 1: create a commitment hash from the balance
async function createBalanceCommitment() {
    const balance = parseInt(elements.balance.value);

    if (isNaN(balance) || balance < 0) {
        showStatus('proofStatus', 'Please enter a valid positive balance', 'error');
        return;
    }

    currentBalance = balance;

    const salt = generateSalt();
    currentCommitment = await generateCommitment(balance, salt);

    elements.commitmentValue.textContent = currentCommitment;
    elements.commitmentResult.classList.remove('hidden');
    elements.generateProof.disabled = false;

    // reset the rest of the UI
    elements.proofResult.classList.add('hidden');
    elements.verificationResult.classList.add('hidden');
    elements.verifyProof.disabled = true;
    currentProof = null;
}

// step 2: generate the zk proof
async function generateAccountabilityProof() {
    const threshold = parseInt(elements.threshold.value);

    if (isNaN(threshold) || threshold < 0) {
        showStatus('proofStatus', 'Please enter a valid threshold', 'error');
        return;
    }

    // don't reveal actual balance in error message
    if (currentBalance < threshold) {
        showStatus('proofStatus', `Cannot generate proof: balance is insufficient for this threshold.`, 'error');
        return;
    }

    showLoading('Generating zero-knowledge proof...');
    showStatus('proofStatus', 'Computing witness and generating proof...', 'loading');

    try {
        const input = {
            balance: currentBalance.toString(),
            threshold: threshold.toString()
        };

        console.log('generating proof for threshold:', threshold);

        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input,
            'balance_threshold.wasm',
            'balance_threshold.zkey'
        );

        currentProof = proof;
        currentPublicSignals = publicSignals;

        console.log('proof generated');

        // show a truncated version of the proof
        const proofDisplay = {
            protocol: "groth16",
            curve: "bn128",
            pi_a: proof.pi_a.slice(0, 2).map(x => x.slice(0, 20) + '...'),
            pi_b: "[[...], [...]]",
            pi_c: proof.pi_c.slice(0, 2).map(x => x.slice(0, 20) + '...')
        };
        elements.proofValue.textContent = JSON.stringify(proofDisplay, null, 2);
        elements.proofResult.classList.remove('hidden');

        showStatus('proofStatus', '✓ Proof generated successfully! The proof reveals NOTHING about your actual balance.', 'success');
        elements.verifyProof.disabled = false;

    } catch (error) {
        console.error('proof generation failed:', error);
        showStatus('proofStatus', `Error generating proof. Please check your inputs.`, 'error');
    } finally {
        hideLoading();
    }
}

// step 3: verify the proof
async function verifyAccountabilityProof() {
    if (!currentProof || !currentPublicSignals) {
        showStatus('proofStatus', 'No proof to verify', 'error');
        return;
    }

    showLoading('Verifying proof...');

    try {
        const vkeyResponse = await fetch('verification_key.json');
        const vkey = await vkeyResponse.json();

        const isValid = await snarkjs.groth16.verify(vkey, currentPublicSignals, currentProof);

        const resultBox = elements.verificationResult;
        resultBox.classList.remove('hidden', 'success', 'failure');

        const threshold = elements.threshold.value;

        if (isValid) {
            resultBox.classList.add('success');
            resultBox.querySelector('.verification-icon').textContent = '✓';
            resultBox.querySelector('.verification-text').innerHTML =
                `<strong>Verified!</strong><br>You proved: Balance ≥ ${threshold}<br><small>Without revealing your actual balance!</small>`;
        } else {
            resultBox.classList.add('failure');
            resultBox.querySelector('.verification-icon').textContent = '✗';
            resultBox.querySelector('.verification-text').textContent =
                'Verification failed — proof is invalid.';
        }

    } catch (error) {
        console.error('verification failed:', error);
        showVerificationError(error.message);
    } finally {
        hideLoading();
    }
}

// ui helpers
function showStatus(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = `status-box ${type}`;
    element.classList.remove('hidden');
}

function showLoading(message) {
    elements.loadingText.textContent = message;
    elements.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    elements.loadingOverlay.classList.add('hidden');
}

function showVerificationError(message) {
    const resultBox = elements.verificationResult;
    resultBox.classList.remove('hidden', 'success');
    resultBox.classList.add('failure');
    resultBox.querySelector('.verification-icon').textContent = '✗';
    resultBox.querySelector('.verification-text').textContent = `Error: ${message}`;
}

// event listeners
elements.createCommitment.addEventListener('click', createBalanceCommitment);
elements.generateProof.addEventListener('click', generateAccountabilityProof);
elements.verifyProof.addEventListener('click', verifyAccountabilityProof);

console.log('accountable wallet loaded');
