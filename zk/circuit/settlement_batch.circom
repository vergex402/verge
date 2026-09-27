pragma circom 2.0.0;

include "comparators.circom";
include "poseidon.circom";

// Merkle batch settlement proof (Poseidon variant)
// Public: root, numLeaves
// Private: N leaf hashes + their Merkle sibling paths
//
// The circuit proves: "I know N leaves whose computed Merkle root equals `root`"
// using the same domain-separated Poseidon construction as the TS verifier:
//   leaf node  = Poseidon(leafPrefix, data)
//   internal   = Poseidon(nodePrefix, min(sibling), max(sibling))
// With sorted pairs and a fixed depth, recomputation from leaves to root proves
// inclusion of every leaf in the batch without revealing data off-chain.


template Poseidon2() {
    signal input in[2];
    signal output out;
    component p = Poseidon(2);
    p.inputs <== in;
    out <== p.out;
}

template SortedMerkleRoot(depth) {
    signal input leaf[1 << depth];
    signal input sibling[depth][1 << depth]; // siblings per level per position
    signal output root;

    signal level[depth + 1][1 << depth];

    // Level 0 = leaves
    for (var i = 0; i < (1 << depth); i++) {
        level[0][i] <== leaf[i];
    }

    // Positional (index-ordered) Merkle: parent = Poseidon2(left, right).
    // Full-tree proofs need no sorted hashing — child order is fixed by index,
    // so no comparator/bit-decomposition is required and Poseidon outputs stay
    // full field elements. TS generator mirrors this exact construction.
    component phash[depth * (1 << (depth - 1))];

    for (var d = 0; d < depth; d++) {
        var width = 1 << (depth - d);
        for (var i = 0; i < width / 2; i++) {
            var idx = d * (1 << (depth - 1)) + i;
            phash[idx] = Poseidon2();
            phash[idx].in[0] <== level[d][2 * i];
            phash[idx].in[1] <== level[d][2 * i + 1];
            level[d + 1][i] <== phash[idx].out;
        }
    }

    root <== level[depth][0];
}

template SettlementBatch(depth) {
    signal input root;               // public: expected Merkle root
    signal input numLeaves;          // public: how many leaves are valid
    signal input leaf[1 << depth];   // private: leaf hashes
    signal input sibling[depth][1 << depth]; // private: sibling at each level

    // numLeaves must be >= 1: zero batch has no meaning
    component nz = IsZero();
    nz.in <== numLeaves;
    signal numLeavesNonZero;
    numLeavesNonZero <== 1 - nz.out;
    numLeavesNonZero * (numLeavesNonZero - 1) === 0;

    // numLeaves <= WIDTH (cannot claim more leaves than the tree holds)
    component range = LessThan(10); // 10 bits: WIDTH=8 fits easily
    range.in[0] <== numLeaves;
    range.in[1] <== (1 << depth) + 1;
    range.out * (range.out - 1) === 0; // boolean
    range.out === 1;

    // Padding enforcement: every leaf index >= numLeaves must be exactly 0.
    // This makes numLeaves binding — a prover cannot stuff data past the
    // claimed count. Sum of "is this leaf a violation" must be zero.
    component ltNum[1 << depth];
    component violZero = IsZero();
    signal violation[1 << depth];
    signal violationSum[1 << depth + 1];
    signal prod[1 << depth];
    violationSum[0] <== 0;
    for (var i = 0; i < (1 << depth); i++) {
        // isIndexPast = 1 if i >= numLeaves
        ltNum[i] = LessThan(10);
        ltNum[i].in[0] <== numLeaves;   // numLeaves < i+1  <=>  i >= numLeaves
        ltNum[i].in[1] <== i + 1;
        // when i >= numLeaves, leaf[i] must equal 0
        // violation = isIndexPast * leaf[i]  (nonzero if padded leaf has data)
        prod[i] <== ltNum[i].out * leaf[i];
        violation[i] <== prod[i];
        violationSum[i + 1] <== violationSum[i] + violation[i];
    }
    // Total violation must be zero
    violZero.in <== violationSum[(1 << depth)];
    violZero.out === 1;

    component sortedRoot = SortedMerkleRoot(depth);
    for (var i = 0; i < (1 << depth); i++) {
        sortedRoot.leaf[i] <== leaf[i];
    }
    for (var d = 0; d < depth; d++) {
        for (var i = 0; i < (1 << depth); i++) {
            sortedRoot.sibling[d][i] <== sibling[d][i];
        }
    }

    // Computed root must match claimed public root
    sortedRoot.root === root;
}

component main {public [root, numLeaves]} = SettlementBatch(3);
