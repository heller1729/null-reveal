pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";

// Simple balance threshold proof circuit
// Proves that a private balance is >= a public threshold

template BalanceThreshold() {
    // private - only the prover knows this
    signal input balance;
    
    // public - the verifier sees this
    signal input threshold;
    
    // output signal
    signal output isAccountable;
    
    // 64-bit comparison should handle most balance values
    component gte = GreaterEqThan(64);
    gte.in[0] <== balance;
    gte.in[1] <== threshold;
    
    isAccountable <== gte.out;
    
    // this constraint ensures the proof only succeeds if balance >= threshold
    gte.out === 1;
}

component main {public [threshold]} = BalanceThreshold();
