// v2: level arrays correctly sized per depth (width halves each level),
// circuit expects sibling[depth][1<<depth] — we flatten in row-major with
// each level occupying its natural width, zero-padded to 8 per level.
// Root recomputation mirrors the circuit exactly.
import { buildPoseidon } from 'circomlibjs';
import { writeFileSync } from 'node:fs';

const DEPTH = 3;
const WIDTH = 1 << DEPTH;
const P = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

const poseidon = await buildPoseidon();
const F = poseidon.F;
const toBig = x => BigInt(F.toObject(x)) % P;

const realLeaves = 5;
let leafFields = [];
for (let i = 0; i < realLeaves; i++) {
  leafFields.push(toBig(poseidon([BigInt(i), BigInt(i*2), BigInt(i*3)])));
}
while (leafFields.length < WIDTH) leafFields.push(0n);

// level[d] holds width(d) = 1 << (DEPTH-d) nodes
const levels = [leafFields];
for (let d = 0; d < DEPTH; d++) {
  const width = levels[d].length;
  const next = [];
  for (let i = 0; i < width / 2; i++) {
    // Positional merkle — mirrors circuit exactly (no sorting)
    next.push(toBig(poseidon([levels[d][2*i], levels[d][2*i+1]])));
  }
  levels.push(next);
}
const root = levels[DEPTH][0];

// sibling[d][i] for i < width(d)/2: sibling of node i at level d
// circuit indexes sibling[d][2i] and sibling[d][2i+1] implicitly by node idx
const sibling = [];
for (let d = 0; d < DEPTH; d++) {
  const width = levels[d].length;
  const sib = new Array(WIDTH).fill('0');
  for (let i = 0; i < width / 2; i++) {
    const a = levels[d][2*i], b = levels[d][2*i+1];
    sib[2*i] = b.toString();     // sibling of left child
    sib[2*i+1] = a.toString();   // sibling of right child
  }
  sibling.push(sib);
}

writeFileSync('/root/verge/zk/proof/input.json', JSON.stringify({
  root: root.toString(),
  numLeaves: realLeaves.toString(),
  leaf: leafFields.map(x => x.toString()),
  sibling,
}, null, 2));
console.log('root:', root.toString());
console.log('levels widths:', levels.map(l => l.length).join(','));
