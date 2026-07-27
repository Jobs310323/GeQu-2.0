// Fails if any source file uses an emoji introduced in Unicode 9.0 or later.
// Those render as tofu boxes on the Windows build this app targets, which has
// bitten the UI repeatedly (🧠 🟢 🟡 🧊 🧘 🧪 🧩 🪜 …).
import fs from 'node:fs';
import path from 'node:path';

const files = [];
(function walk(dir) {
    for (const f of fs.readdirSync(dir)) {
        const p = path.join(dir, f);
        fs.statSync(p).isDirectory() ? walk(p) : /\.(tsx?|css|html)$/.test(f) && files.push(p);
    }
})('src');

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/gu;
const isRisky = cp =>
    (cp >= 0x1F7E0 && cp <= 0x1F7EB) ||   // coloured squares/circles, Unicode 12
    (cp >= 0x1F900 && cp <= 0x1F9FF) ||   // supplemental symbols, Unicode 9–11
    (cp >= 0x1FA70 && cp <= 0x1FAFF) ||   // extended-A, Unicode 12–14
    (cp >= 0x1F6D5 && cp <= 0x1F6DF);

let bad = 0;
for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    text.split('\n').forEach((line, i) => {
        for (const ch of new Set(line.match(EMOJI) || [])) {
            if (isRisky(ch.codePointAt(0))) {
                console.error(`${file}:${i + 1}  ${ch}  U+${ch.codePointAt(0).toString(16).toUpperCase()}`);
                bad++;
            }
        }
    });
}
console.log(bad ? `\n${bad} unsupported emoji found` : 'All emoji are widely supported ✓');
process.exit(bad ? 1 : 0);
