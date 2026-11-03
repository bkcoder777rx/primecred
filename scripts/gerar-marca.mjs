// Gera os arquivos da marca a partir do logo original (fundo preto).
// Uso: node scripts/gerar-marca.mjs caminho/do/logo.jpg
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const origem = process.argv[2];
if (!origem) {
  console.error("Informe o caminho do logo.");
  process.exit(1);
}
mkdirSync("public/marca", { recursive: true });
mkdirSync("public/icones", { recursive: true });

/** Recorta uma área e troca o fundo preto por transparência (mantém o brilho dourado). */
async function recortarSemFundo({ left, top, width, height }, largura) {
  const { data, info } = await sharp(origem)
    .extract({ left, top, width, height })
    .resize({ width: largura })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const piso = 26; // ruído do fundo preto
  for (let i = 0; i < data.length; i += 4) {
    const max = Math.max(data[i], data[i + 1], data[i + 2]);
    const a = Math.max(0, Math.min(255, ((max - piso) * 255) / (255 - piso)));
    if (a <= 0) {
      data[i + 3] = 0;
      continue;
    }
    const f = 255 / Math.max(max, 1);
    data[i] = Math.min(255, data[i] * f);
    data[i + 1] = Math.min(255, data[i + 1] * f);
    data[i + 2] = Math.min(255, data[i + 2] * f);
    data[i + 3] = a;
  }
  return sharp(data, { raw: info }).png();
}

const EMBLEMA = { left: 295, top: 190, width: 715, height: 572 };
const LOGO = { left: 80, top: 185, width: 1100, height: 810 };

await (await recortarSemFundo(EMBLEMA, 480)).toFile("public/marca/emblema.png");
await (await recortarSemFundo(LOGO, 900)).toFile("public/marca/logo.png");

// Ícones do app: emblema sobre fundo verde-escuro, com margem.
for (const tamanho of [180, 192, 512]) {
  const emblema = await (await recortarSemFundo(EMBLEMA, Math.round(tamanho * 0.72))).toBuffer();
  await sharp({
    create: { width: tamanho, height: tamanho, channels: 4, background: "#07180f" },
  })
    .composite([{ input: emblema, gravity: "center" }])
    .png()
    .toFile(`public/icones/icone-${tamanho}.png`);
}
console.log("Marca gerada em public/marca e public/icones.");
