/* Regenerate the printable QR: npm run qr:generate
   The code encodes a URL on our own domain, so the destinations behind it can change
   without reprinting anything already in the wild. */
import QRCode from "qrcode";
import { writeFile } from "node:fs/promises";

const target = process.env.QR_TARGET ?? "https://www.vianovaaddis.store/links";
/* High error correction so the code still scans over a scuff, a fold, or a centred logo. */
const options = { errorCorrectionLevel: "H", margin: 4, color: { dark: "#191714ff", light: "#ffffffff" } };

await writeFile("public/vianova-qr.svg", await QRCode.toString(target, { ...options, type: "svg" }));
await QRCode.toFile("public/vianova-qr.png", target, { ...options, width: 2000 });
console.log(`encoded ${target}`);
