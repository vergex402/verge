# Verge ZK + Facilitator Binary

Final two roadmap items, shipped.

## 1. ZK Batch Settlement Proofs (`zk/`)

Groth16 proof over a Poseidon Merkle tree of settlement leaves.

**Status: compiled, proven, verified.**

### Artifacts

| File | Purpose |
|---|---|
| `circuit/settlement_batch.circom` | Circuit source (depth-3, 8 leaves, 2 public inputs, 32 private) |
| `build/settlement_batch.r1cs` | Compiled constraint system — 3468 constraints |
| `build/circuit_final_beacon.zkey` | Proving key (2 MB, beaconed with public entropy) |
| `build/verification_key.json` | Verification key |
| `build/verifier.sol` | Auto-generated on-chain Groth16 verifier |
| `proof/proof.json` + `proof/public.json` | Example proof (root + numLeaves) |

### Prove → Verify

```bash
# generate witness from inputs (leaves + siblings + public root)
node build/settlement_batch_js/generate_witness.js \
  build/settlement_batch_js/settlement_batch.wasm \
  proof/input.json proof/witness.wtns

# prove
snarkjs groth16 prove build/circuit_final_beacon.zkey \
  proof/witness.wtns proof/proof.json proof/public.json

# verify — prints "snarkJS: OK!"
snarkjs groth16 verify build/verification_key.json \
  proof/public.json proof/proof.json
```

Negative test confirmed: corrupted `root` fails witness generation (circuit constraint rejects).

### Circuit design notes

- **Positional Merkle** (parent = `Poseidon2(left, right)`, index-ordered) — full-tree proofs need no sorted hashing, which removes `LessThan`/`Num2Bits` bit-decomposition entirely and keeps all signals as raw field elements. This avoids the 252-bit comparator overflow class entirely and halves the constraint count.
- **Public inputs:** `root`, `numLeaves`. **Private:** 8 leaf hashes + 24 tree nodes (intermediate levels).
- **Trusted setup:** local `powersoftau new` + a single contribution + fixed public beacon entropy (`0102…1f`, 10 iterations). This is **ceremony-grade local setup**, suitable for demos and development. Production deployment should use the public Perpetual Powers of Tau (`powersOfTau28_hez_final_*.ptau`) and/or a multi-party ceremony.
- `numLeaves` is constrained `≥ 1`; empty batches cannot be proven.

### Upgrading the hosted Merkle proofs to ZK

The Merkle root already produced by `POST /api/proofs` is the ZK public input. A production integration would:

1. Recompute leaves as Poseidon hashes of settlement rows (canonical field encoding)
2. Run the prover with those leaves + the tree path
3. Post `(root, numLeaves, proof)` on-chain via `verifier.sol`

## 2. Facilitator Binary (`facilitator/`)

Standalone HTTP-402 settlement server — no database, no console, no web app.

```bash
cd facilitator
npm install && npm run build && npm start
# → verge-facilitator listening on :3399
```

### Endpoints (live-tested)

| Route | Tested | Result |
|---|---|---|
| `GET /health` | ✅ | `{ok, challenges, settled, uptime}` |
| `GET /facilitator/supported` | ✅ | All 7 rails with token contracts |
| `GET /facilitator/challenge?network=&recipient=&amount=` | ✅ | Issues nonce + base64 `payment-required` header |
| `POST /facilitator/verify` | ✅ | Read-only check (does NOT consume nonce) |
| `POST /facilitator/settle` | — | Requires real on-chain tx (wire-compatible with hosted facilitator) |
| Any other route | ✅ | 404 |

### Storage model

In-memory challenges (TTL 10 min, 50k cap) + replay-key set. Right default for single-node; the `ChallengeStore`/`ReplayStore` interfaces from `@vergex402/core` are the scaling extension point (Redis/Postgres adapters drop in without touching route code).

### Docker

```bash
docker build -f facilitator/Dockerfile -t verge-facilitator .
docker run -p 3399:3399 verge-facilitator
```

Non-root user, healthcheck included. Same wire protocol as `vergesnowy.com/api/facilitator` — swap base URL and existing SDKs work unchanged.
