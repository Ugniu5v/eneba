#!/usr/bin/env node
// Generates the original, self-contained SVG cover art used by the marketplace.
// Keeping the art procedural means the demo has no external image dependencies.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(
  readFileSync(join(root, "backend/internal/catalog/catalog.json"), "utf8")
);
const coversDir = join(root, "frontend/public/assets/covers");
const bannersDir = join(root, "frontend/public/assets/banners");
mkdirSync(coversDir, { recursive: true });
mkdirSync(bannersDir, { recursive: true });

const esc = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const font = `Arial, Helvetica, sans-serif`;

function wrap(text, max = 13, maxLines = 4) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (!line.length) line = word;
    else if ((line + " " + word).length <= max) line += " " + word;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, maxLines);
}

const stars = (count, w = 600, h = 800, seed = 7) => {
  let out = "";
  let s = seed;
  for (let i = 0; i < count; i++) {
    s = (s * 9301 + 49297) % 233280;
    const x = ((s / 233280) * w).toFixed(1);
    s = (s * 9301 + 49297) % 233280;
    const y = ((s / 233280) * h).toFixed(1);
    s = (s * 9301 + 49297) % 233280;
    const r = (((s / 233280) * 1.7 + 0.3) * 10).toFixed(1) / 10;
    out += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${(0.2 + (s % 5) / 10).toFixed(2)}"/>`;
  }
  return out;
};

function commonDefs(p, id) {
  return `
  <defs>
    <linearGradient id="bg${id}" x1="0" y1="0" x2="0.75" y2="1">
      <stop offset="0" stop-color="${p.from}"/>
      <stop offset="1" stop-color="${p.to}"/>
    </linearGradient>
    <radialGradient id="glow${id}" cx="50%" cy="35%" r="65%">
      <stop offset="0" stop-color="${p.accent}" stop-opacity=".42"/>
      <stop offset="1" stop-color="${p.accent}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="shade${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset=".38" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".8"/>
    </linearGradient>
    <linearGradient id="inkFade${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${p.ink}" stop-opacity=".95"/>
      <stop offset="1" stop-color="${p.ink}" stop-opacity=".62"/>
    </linearGradient>
    <pattern id="grid${id}" width="44" height="44" patternUnits="userSpaceOnUse">
      <path d="M44 0H0V44" fill="none" stroke="${p.accent}" stroke-opacity=".12" stroke-width="1"/>
    </pattern>
    <pattern id="dots${id}" width="18" height="18" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.2" fill="${p.accent}" opacity=".18"/>
    </pattern>
    <filter id="grain${id}">
      <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope=".055"/></feComponentTransfer>
    </filter>
    <filter id="blur${id}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="16"/>
    </filter>
    <filter id="blurSmall${id}" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="5"/>
    </filter>
    <clipPath id="clip${id}"><rect width="600" height="800" rx="0"/></clipPath>
  </defs>`;
}

function overlay(p, id) {
  return `
  <rect width="600" height="800" fill="url(#glow${id})"/>
  <rect width="600" height="800" fill="url(#grid${id})" opacity=".55"/>
  <rect width="600" height="800" fill="#000" filter="url(#grain${id})" opacity=".65"/>
  <rect y="420" width="600" height="380" fill="url(#shade${id})"/>`;
}

function gameCover(product) {
  const p = product.art;
  const id = product.slug.replaceAll(/[^a-z0-9]/g, "").slice(0, 10);
  const titleLines = wrap(p.short, p.short.length > 10 ? 11 : 13, 3);
  const startY = 680 - (titleLines.length - 1) * 63;
  const titleSize = titleLines.some((l) => l.length > 10) ? 58 : 66;
  const tagLines = wrap(p.tag, 22, 2);
  const motif = motifSvg(p, id);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800" role="img" aria-label="${esc(product.title)} cover art">
  ${commonDefs(p, id)}
  <g clip-path="url(#clip${id})">
    <rect width="600" height="800" fill="url(#bg${id})"/>
    ${motif}
    ${overlay(p, id)}
    <g font-family="${font}">
      <rect x="36" y="36" width="${Math.min(196, 44 + product.productType.length * 8.9)}" height="28" fill="#000" opacity=".35"/>
      <text x="50" y="55" fill="${p.ink}" font-size="11" font-weight="700" letter-spacing="2">${esc(product.productType.toUpperCase())}</text>
      <text x="564" y="55" text-anchor="end" fill="${p.accent}" font-size="11" font-weight="700" letter-spacing="2">EN • EUR</text>
      <g transform="translate(36 ${startY})">
        <rect x="0" y="-42" width="44" height="4" fill="${p.accent}"/>
        ${titleLines
          .map(
            (line, i) =>
              `<text x="0" y="${i * (titleSize + 4)}" fill="${p.ink}" font-size="${titleSize}" font-weight="900" letter-spacing="-2.5">${esc(line.toUpperCase())}</text>`
          )
          .join("")}
      </g>
      <g transform="translate(36 ${startY + titleLines.length * (titleSize + 4) + 4})">
        ${tagLines
          .map(
            (line, i) =>
              `<text x="0" y="${i * 22}" fill="${p.accent}" font-size="16" font-weight="700" letter-spacing="3.5">${esc(line.toUpperCase())}</text>`
          )
          .join("")}
      </g>
      <g transform="translate(36 748)" opacity=".78">
        <path d="M0 0h70" stroke="${p.ink}" stroke-width="1"/>
        <text x="0" y="24" fill="${p.ink}" font-size="10" font-weight="700" letter-spacing="2.6">DIGITAL DOWNLOAD</text>
        <text x="564" y="0" text-anchor="end" fill="${p.ink}" font-size="10" font-weight="700" letter-spacing="1.7">INSTANT DELIVERY</text>
      </g>
    </g>
  </g>
</svg>`;
}

function giftCover(product) {
  const p = product.art;
  const id = product.slug.replaceAll(/[^a-z0-9]/g, "").slice(0, 10);
  const light = p.ink === "#111111";
  const brand = p.short;
  const tag = p.tag;
  // Gift card artwork is intentionally flat and product-led, like the physical cards.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800" role="img" aria-label="${esc(product.title)} digital gift card">
  <defs>
    <linearGradient id="back${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${p.from}"/>
      <stop offset="1" stop-color="${p.to}"/>
    </linearGradient>
    <linearGradient id="card${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${p.accent}" stop-opacity=".24"/>
      <stop offset=".5" stop-color="${p.accent}" stop-opacity=".04"/>
      <stop offset="1" stop-color="${p.accent}" stop-opacity=".19"/>
    </linearGradient>
    <radialGradient id="g${id}" cx="50%" cy="28%" r="70%">
      <stop offset="0" stop-color="${p.accent}" stop-opacity=".4"/>
      <stop offset="1" stop-color="${p.accent}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="lines${id}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
      <line x1="0" y1="0" x2="0" y2="8" stroke="${p.ink}" stroke-opacity=".045" stroke-width="2"/>
    </pattern>
    <filter id="shadow${id}" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="24" stdDeviation="26" flood-color="#000" flood-opacity=".32"/>
    </filter>
    <filter id="grain${id}">
      <feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope=".04"/></feComponentTransfer>
    </filter>
    <clipPath id="clip${id}"><rect width="600" height="800" rx="0"/></clipPath>
  </defs>
  <g clip-path="url(#clip${id})">
    <rect width="600" height="800" fill="url(#back${id})"/>
    <rect width="600" height="800" fill="url(#g${id})"/>
    <circle cx="518" cy="100" r="210" fill="none" stroke="${p.ink}" stroke-opacity=".08" stroke-width="1"/>
    <circle cx="518" cy="100" r="160" fill="none" stroke="${p.ink}" stroke-opacity=".06" stroke-width="1"/>
    <rect width="600" height="800" fill="url(#lines${id})"/>
    <g filter="url(#shadow${id})">
      <rect x="42" y="205" width="516" height="324" rx="14" fill="url(#card${id})"/>
      <rect x="42" y="205" width="516" height="324" rx="14" fill="none" stroke="${p.accent}" stroke-opacity=".34"/>
      <circle cx="512" cy="248" r="33" fill="${p.accent}" opacity=".17"/>
      <path d="M500 238l24 24m0-24l-24 24" stroke="${p.accent}" stroke-width="2" stroke-linecap="round"/>
      <text x="80" y="260" fill="${p.ink}" font-family="${font}" font-size="11" font-weight="700" letter-spacing="3.2">${light ? "DIGITAL GIFT CARD" : "DIGITAL CODE"}</text>
      <g font-family="${font}" fill="${p.ink}">
        <text x="80" y="368" font-size="${brand.length > 10 ? 43 : 51}" font-weight="900" letter-spacing="-1.5">${esc(brand)}</text>
        <rect x="80" y="394" width="48" height="3" fill="${p.accent}"/>
        <text x="80" y="444" font-size="30" font-weight="700" letter-spacing=".5">${esc(tag)}</text>
        <text x="80" y="496" font-size="10" font-weight="700" letter-spacing="2.8" opacity=".55">REDEEM • INSTANT • GLOBAL</text>
      </g>
      <g transform="translate(428 462)" opacity=".65">
        <rect width="82" height="26" rx="13" fill="none" stroke="${p.ink}" stroke-opacity=".4"/>
        <text x="41" y="17" text-anchor="middle" font-family="${font}" font-size="8" font-weight="700" letter-spacing="1.5" fill="${p.ink}">EN · EUR</text>
      </g>
    </g>
    <g font-family="${font}">
      <text x="42" y="84" fill="${p.ink}" font-size="10" font-weight="700" letter-spacing="2.6">${esc(product.productType.toUpperCase())}</text>
      <text x="558" y="84" text-anchor="end" fill="${p.ink}" font-size="10" font-weight="700" letter-spacing="2.6" opacity=".6">${esc(product.region.toUpperCase())}</text>
      <text x="42" y="648" fill="${p.ink}" font-size="20" font-weight="800">${esc(wrap(product.title, 26, 2)[0])}</text>
      <text x="42" y="676" fill="${p.ink}" opacity=".66" font-size="14">${esc(wrap(product.title, 26, 2)[1] || "Digital delivery by email")}</text>
      <g transform="translate(42 742)" opacity=".65">
        <circle cx="5" cy="5" r="4" fill="${p.accent}"/>
        <text x="18" y="9" fill="${p.ink}" font-size="9" font-weight="700" letter-spacing="2">VERIFIED DIGITAL CODE</text>
        <text x="516" y="9" text-anchor="end" fill="${p.ink}" font-size="9" font-weight="700" letter-spacing="1.8">EN · EUR</text>
      </g>
    </g>
    <rect width="600" height="800" fill="#000" filter="url(#grain${id})" opacity=".7"/>
  </g>
</svg>`;
}

function motifSvg(p, id) {
  switch (p.motif) {
    case "neon":
      return `
      ${stars(20, 600, 380, 11)}
      <circle cx="300" cy="250" r="165" fill="${p.accent}" opacity=".13" filter="url(#blur${id})"/>
      <circle cx="300" cy="250" r="118" fill="none" stroke="${p.accent}" stroke-width="1.5" opacity=".7"/>
      <circle cx="300" cy="250" r="88" fill="${p.accent}" opacity=".15"/>
      <path d="M0 500L160 360l85 90 95-150 140 200V800H0Z" fill="#070411" opacity=".8"/>
      <g fill="none" stroke="${p.accent}" opacity=".35">
        <path d="M300 390L600 620M300 390L0 620M300 390L600 800M300 390L0 800"/>
        <path d="M110 580h380M55 670h490M0 770h600" opacity=".35"/>
      </g>
      <path d="M-40 618L640 310" stroke="${p.accent}" stroke-width="26" opacity=".12" filter="url(#blurSmall${id})"/>
      <path d="M40 420h520" stroke="${p.accent}" stroke-width="1" opacity=".4"/>
      <g fill="${p.accent}">
        <rect x="380" y="510" width="55" height="9" transform="rotate(-22 380 510)" opacity=".9"/>
        <rect x="458" y="474" width="33" height="6" transform="rotate(-22 458 474)" opacity=".5"/>
      </g>`;
    case "voxel":
      return `
      ${stars(10, 600, 300, 3)}
      <circle cx="475" cy="140" r="78" fill="${p.accent}" opacity=".65"/>
      <g opacity=".24" stroke="${p.accent}" fill="none">
        <path d="M0 300h600M0 360h600M0 420h600M120 260v300M240 250v330M360 250v330M480 260v300"/>
      </g>
      <g>
        <path d="M80 630l88-50 78 44-88 50z" fill="#67B75D"/>
        <path d="M80 630l78 44v92l-78-44z" fill="#2B6A46"/>
        <path d="M158 674l88-50v92l-88 50z" fill="#1A4738"/>
        <path d="M260 560l66-38 64 36-66 38z" fill="#8ED66B"/>
        <path d="M260 560l64 36v74l-64-36z" fill="#376E42"/>
        <path d="M324 596l66-38v74l-66 38z" fill="#244C35"/>
        <path d="M420 680l56-32 54 31-56 32z" fill="#79C56B" opacity=".8"/>
        <path d="M340 370l36-21 34 19-36 21z" fill="#A4ED78" opacity=".8"/>
        <path d="M340 370l34 19v38l-34-19z" fill="#4B8750" opacity=".8"/>
      </g>
      <g fill="none" stroke="${p.accent}" stroke-opacity=".22">
        <path d="M40 530l120-68 100 56M380 490l120-68 100 56"/>
      </g>`;
    case "crown":
      return `
      <circle cx="300" cy="320" r="230" fill="none" stroke="${p.accent}" stroke-opacity=".22"/>
      <circle cx="300" cy="320" r="190" fill="none" stroke="${p.accent}" stroke-opacity=".12" stroke-dasharray="3 9"/>
      <circle cx="300" cy="320" r="120" fill="${p.accent}" opacity=".08" filter="url(#blur${id})"/>
      <g transform="translate(142 330)" fill="none" stroke="${p.accent}" stroke-width="2.4" stroke-linejoin="round">
        <path d="M0 130L38 34l64 64L158 0l56 98 64-64 38 96v116H0Z" fill="${p.accent}" fill-opacity=".12"/>
        <path d="M10 244h286"/>
        <path d="M106 98v132M213 98v132"/>
        <circle cx="158" cy="64" r="9" fill="${p.accent}"/>
        <circle cx="38" cy="34" r="7" fill="${p.accent}"/>
        <circle cx="280" cy="34" r="7" fill="${p.accent}"/>
      </g>
      <g fill="${p.accent}" opacity=".5">
        ${[46, 118, 512, 556].map((x, i) => `<circle cx="${x}" cy="${210 + i * 65}" r="${2 + (i % 2)}"/>`).join("")}
      </g>
      <path d="M300 0v180M90 620L300 430l210 190" stroke="${p.accent}" stroke-opacity=".16"/>`; 
    case "eclipse":
      return `
      ${stars(75, 600, 520, 9)}
      <circle cx="330" cy="310" r="170" fill="#03060A"/>
      <circle cx="330" cy="310" r="173" fill="none" stroke="${p.accent}" stroke-width="2" opacity=".8"/>
      <circle cx="330" cy="310" r="207" fill="none" stroke="${p.accent}" stroke-width="1" opacity=".25"/>
      <ellipse cx="330" cy="310" rx="290" ry="76" fill="none" stroke="${p.accent}" stroke-width="1" opacity=".38" transform="rotate(-18 330 310)"/>
      <circle cx="136" cy="226" r="4" fill="${p.accent}"/>
      <path d="M0 600L170 470l80 40 78-100 100 80 172-84v394H0Z" fill="#03070C" opacity=".75"/>
      <path d="M0 470h600" stroke="${p.accent}" stroke-opacity=".3"/>
      <path d="M54 410l260 230" stroke="${p.accent}" stroke-width="2" opacity=".2"/>
      <g fill="${p.accent}" opacity=".6">
        <rect x="58" y="242" width="3" height="88"/>
        <rect x="48" y="278" width="24" height="3"/>
      </g>`;
    case "blade":
      return `
      <circle cx="310" cy="300" r="230" fill="none" stroke="${p.accent}" stroke-opacity=".12"/>
      <path d="M-30 610L500 90" stroke="${p.accent}" stroke-width="38" opacity=".12" filter="url(#blur${id})"/>
      <path d="M-20 600L520 80" stroke="${p.accent}" stroke-width="5" opacity=".85"/>
      <path d="M120 690L630 180" stroke="${p.accent}" stroke-width="1.5" opacity=".42"/>
      <path d="M0 714L570 142" stroke="#fff" stroke-width="1" opacity=".18"/>
      <g fill="${p.accent}" opacity=".6">
        <path d="M70 350l2 26 26 2-26 2-2 26-2-26-26-2 26-2z"/>
        <path d="M502 235l1.5 18 18 1.5-18 1.5-1.5 18-1.5-18-18-1.5 18-1.5z"/>
      </g>
      <g fill="#050307" opacity=".65">
        <path d="M0 600c110-55 200-66 300-44 98 21 190 8 300-30v274H0z"/>
      </g>
      <circle cx="475" cy="480" r="3" fill="${p.accent}"/>
      <path d="M0 95h600" stroke="${p.ink}" stroke-opacity=".09"/>`;
    case "farm":
      return `
      <circle cx="430" cy="210" r="92" fill="${p.accent}" opacity=".82"/>
      <circle cx="430" cy="210" r="140" fill="${p.accent}" opacity=".09" filter="url(#blur${id})"/>
      <g fill="none" stroke="${p.ink}" stroke-opacity=".2">
        <path d="M0 440c130-100 250-90 360-38s170 45 240 5"/>
        <path d="M0 510c150-76 280-62 380-14s170 35 220 10"/>
        <path d="M0 600c170-90 330-48 430-16s130 14 170-8"/>
      </g>
      <path d="M0 500c90-58 180-58 266-5 90 55 200 59 334-8v313H0Z" fill="#1B4B2D" opacity=".8"/>
      <path d="M0 620c130-50 260-55 350-25s180 30 250-5v210H0Z" fill="#0B2B20"/>
      <g transform="translate(90 476)">
        <path d="M0 80l50-38 50 38v82H0z" fill="#3D2313"/>
        <path d="M-12 82L50 34l62 48" fill="none" stroke="${p.accent}" stroke-width="7"/>
        <rect x="39" y="115" width="24" height="47" fill="#130D09"/>
        <rect x="10" y="99" width="16" height="16" fill="${p.accent}" opacity=".7"/>
        <rect x="74" y="99" width="16" height="16" fill="${p.accent}" opacity=".7"/>
      </g>
      <g stroke="${p.ink}" stroke-opacity=".38" stroke-width="1.4" fill="none">
        <path d="M0 696c120-60 250-70 370-30s180 28 230-4"/>
        <path d="M36 730c120-50 240-58 350-20"/>
      </g>
      <g fill="${p.accent}" opacity=".8">
        <circle cx="96" cy="360" r="2"/><circle cx="120" cy="340" r="1.4"/><circle cx="78" cy="330" r="1.4"/>
      </g>`;
    case "shooter":
      return `
      <rect width="600" height="800" fill="${p.accent}" opacity=".04"/>
      <g opacity=".16" fill="${p.ink}">
        ${Array.from({ length: 7 }, (_, i) => `<rect x="-80" y="${80 + i * 46}" width="760" height="${i % 3 === 0 ? 8 : 2}" transform="rotate(-11 300 300)"/>`).join("")}
      </g>
      <circle cx="300" cy="292" r="148" fill="none" stroke="${p.accent}" stroke-width="1.5" opacity=".6"/>
      <circle cx="300" cy="292" r="102" fill="none" stroke="${p.accent}" stroke-width="1" opacity=".3"/>
      <path d="M300 104v376M112 292h376" stroke="${p.accent}" stroke-width="1" opacity=".7"/>
      <path d="M300 196v192M204 292h192" stroke="${p.accent}" stroke-width="18" stroke-opacity=".1"/>
      <circle cx="300" cy="292" r="7" fill="${p.accent}"/>
      <g fill="${p.accent}">
        <rect x="280" y="80" width="40" height="6"/>
        <rect x="280" y="502" width="40" height="6"/>
        <rect x="88" y="278" width="5" height="28"/>
        <rect x="507" y="278" width="5" height="28"/>
      </g>
      <path d="M-50 740L650 540" stroke="${p.accent}" stroke-width="70" opacity=".06"/>
      <path d="M40 610l45 14-8 30-45-14z" fill="${p.accent}" opacity=".8"/>
      <path d="M476 650l15-4 15 4-15-42z" fill="${p.accent}" opacity=".5"/>`;
    case "ridge":
      return `
      ${stars(30, 600, 400, 5)}
      <circle cx="440" cy="190" r="78" fill="${p.accent}" opacity=".75"/>
      <circle cx="440" cy="190" r="120" fill="${p.accent}" opacity=".1" filter="url(#blur${id})"/>
      <path d="M0 470L115 320l70 100 100-152 132 194 70-92 113 86v344H0Z" fill="#243D50" opacity=".68"/>
      <path d="M0 544L130 412l90 86 76-60 118 118 84-56 102 62v238H0Z" fill="#132A39" opacity=".9"/>
      <path d="M0 650c130-92 280-92 380-18s160 68 220 28v140H0Z" fill="#0B1B27"/>
      <g transform="translate(196 568)">
        <path d="M0 60L44 0l44 60z" fill="${p.accent}" opacity=".86"/>
        <path d="M18 60L44 26l26 34z" fill="#6B3F21"/>
        <path d="M34 60V42h20v18" fill="#2C1D13"/>
      </g>
      <g stroke="${p.ink}" stroke-opacity=".24" fill="none">
        <path d="M110 680c100-38 200-32 290 8"/>
        <path d="M360 710c80-27 160-23 220 4"/>
      </g>
      <g fill="${p.ink}" opacity=".5">
        <path d="M456 400l10-6 8 8 12-4-5 10 7 7-11 2-5 10-4-11-10 1 7-8z"/>
      </g>`;
    case "speed":
      return `
      ${stars(22, 600, 320, 4)}
      <circle cx="300" cy="300" r="142" fill="${p.accent}" opacity=".8"/>
      <g fill="${p.to}" opacity=".4">
        <rect y="190" width="600" height="9"/>
        <rect y="228" width="600" height="4"/>
        <rect y="345" width="600" height="6"/>
      </g>
      <path d="M0 800L248 404h104L600 800Z" fill="#06040D"/>
      <g fill="none" stroke="${p.accent}" opacity=".65">
        <path d="M297 408L126 800M303 408L474 800M300 408v392"/>
        <path d="M206 620h188M154 720h292M86 800h428"/>
      </g>
      <g stroke="${p.accent}" stroke-linecap="round">
        <path d="M60 540h220" stroke-width="3" opacity=".8"/>
        <path d="M0 500h160" stroke-width="1.4" opacity=".5"/>
        <path d="M420 610h180" stroke-width="2" opacity=".7"/>
        <path d="M470 680h130" stroke-width="1" opacity=".4"/>
        <path d="M60 690h80" stroke-width="1.4" opacity=".4"/>
      </g>
      <g transform="translate(250 610)">
        <path d="M0 55c6-22 22-33 52-33h45c17 0 30 9 38 27l6 15 32 8v20H0z" fill="#08040D"/>
        <path d="M17 58l17-20h37l22 20z" fill="${p.accent}" opacity=".6"/>
        <circle cx="35" cy="80" r="16" fill="#0B0613" stroke="${p.accent}" stroke-width="2"/>
        <circle cx="143" cy="80" r="16" fill="#0B0613" stroke="${p.accent}" stroke-width="2"/>
      </g>`;
    case "crystal":
      return `
      ${stars(36, 600, 500, 6)}
      <circle cx="300" cy="316" r="228" fill="none" stroke="${p.accent}" stroke-opacity=".15"/>
      <circle cx="300" cy="316" r="168" fill="none" stroke="${p.accent}" stroke-opacity=".2" stroke-dasharray="2 8"/>
      <g filter="url(#blur${id})" opacity=".35">
        <circle cx="300" cy="310" r="90" fill="${p.accent}"/>
      </g>
      <g fill="none" stroke="${p.accent}" stroke-width="1.2" opacity=".6">
        <path d="M300 120L410 300 300 510 190 300z"/>
        <path d="M300 120v390M190 300h220"/>
        <path d="M300 190l63 110-63 110-63-110z"/>
      </g>
      <path d="M300 190l63 110-63 110-63-110z" fill="${p.accent}" opacity=".14"/>
      <g fill="${p.accent}" opacity=".8">
        <path d="M118 220l9 28 28 9-28 9-9 28-9-28-28-9 28-9z"/>
        <path d="M490 410l6 18 18 6-18 6-6 18-6-18-18-6 18-6z" opacity=".65"/>
      </g>
      <path d="M0 600l120-42 80 28 100-70 120 50 180-50v284H0Z" fill="#06111B" opacity=".65"/>`;
    case "space":
      return `
      ${stars(100, 600, 620, 12)}
      <circle cx="410" cy="280" r="152" fill="${p.accent}" opacity=".72"/>
      <circle cx="410" cy="280" r="152" fill="none" stroke="#fff" stroke-opacity=".2"/>
      <ellipse cx="410" cy="280" rx="240" ry="58" fill="none" stroke="${p.accent}" stroke-width="2" opacity=".4" transform="rotate(-22 410 280)"/>
      <circle cx="350" cy="250" r="18" fill="#fff" opacity=".13"/>
      <circle cx="451" cy="335" r="31" fill="#000" opacity=".16"/>
      <g transform="translate(96 380) rotate(-18)">
        <path d="M0 50c35-42 95-50 145-16-24 38-78 52-132 34z" fill="#D7DCE4"/>
        <path d="M54 34l38-32 20 7-20 34z" fill="#9BA7B5"/>
        <circle cx="48" cy="45" r="9" fill="${p.accent}"/>
        <path d="M8 80l38 14" stroke="#fff" stroke-width="4" opacity=".3"/>
      </g>
      <path d="M0 620l200-90 120 26 110-60 170 78v226H0Z" fill="#05070F"/>
      <g stroke="${p.accent}" stroke-opacity=".4" fill="none">
        <path d="M330 120c-60 0-80 36-80 72"/>
        <path d="M480 120c50 0 80 20 80 55"/>
      </g>`;
    case "stealth":
      return `
      <circle cx="306" cy="295" r="215" fill="${p.accent}" opacity=".07"/>
      <g opacity=".18" stroke="${p.accent}">
        <path d="M0 180h600M0 220h600M0 260h600M0 460h600M0 500h600"/>
        <path d="M110 170v390M150 170v390M470 170v390M510 170v390"/>
      </g>
      <g transform="translate(212 160)">
        <path d="M38 0h86l22 42-27 49 46 36-22 100-47 36H59L12 227 0 127l45-36L18 42z" fill="#071A18" stroke="${p.accent}" stroke-width="1.5"/>
        <path d="M37 87l48 25-10 56-42-28zM122 87l-37 25 10 56 42-28z" fill="${p.accent}" opacity=".85"/>
        <path d="M82 148v62l-22 34h44z" fill="${p.accent}" opacity=".4"/>
        <path d="M28 58h108" stroke="${p.accent}" stroke-width="2" opacity=".6"/>
      </g>
      <path d="M0 630l200-75 110 30 120-62 170 70v207H0Z" fill="#06110F" opacity=".8"/>
      <path d="M0 560h600" stroke="${p.accent}" stroke-opacity=".28"/>
      <g fill="${p.accent}" opacity=".6">
        <circle cx="522" cy="254" r="3"/><circle cx="554" cy="288" r="1.5"/>
      </g>`;
    case "ranch":
      return `
      <circle cx="300" cy="318" r="164" fill="${p.accent}" opacity=".82"/>
      <g fill="${p.to}" opacity=".25">
        <rect y="320" width="600" height="28"/><rect y="388" width="600" height="12"/>
        <rect y="440" width="600" height="20"/><rect y="492" width="600" height="8"/>
      </g>
      <path d="M0 590l170-80 120 45 120-50 190 50v245H0Z" fill="#2C180D"/>
      <path d="M0 670l220-74 170 45 210-30v189H0Z" fill="#160C07"/>
      <g transform="translate(96 464)">
        <path d="M0 100L76 38l76 62v106H0z" fill="#6A3116"/>
        <path d="M-14 104L76 30l90 74" fill="none" stroke="#AC5C28" stroke-width="10"/>
        <rect x="64" y="143" width="34" height="63" fill="#1A0C06"/>
        <rect x="22" y="124" width="22" height="22" fill="${p.accent}"/>
        <rect x="112" y="124" width="22" height="22" fill="${p.accent}"/>
        <path d="M126 10v-40" stroke="${p.accent}" stroke-width="4"/>
      </g>
      <g fill="${p.ink}" opacity=".7">
        <rect x="436" y="640" width="54" height="5"/><rect x="486" y="608" width="38" height="4"/>
      </g>
      <g stroke="${p.ink}" stroke-opacity=".28" fill="none">
        <path d="M0 706c140-34 280-28 390 4s160 22 210 8"/>
      </g>`;
    case "horror":
      return `
      ${stars(35, 600, 500, 15)}
      <circle cx="470" cy="200" r="82" fill="#A7ADB7" opacity=".12"/>
      <g fill="#050708">
        <path d="M0 590c80-40 150-40 220-2 72 39 153 43 230 8 50-23 110-21 150-3v207H0z"/>
        <path d="M330 680l-22-250 34-8 32 254z"/>
        <path d="M344 430l-52 60M354 500l88-54M338 550l-100-18M360 600l74-42"/>
      </g>
      <circle cx="452" cy="320" r="6" fill="${p.accent}"/>
      <circle cx="452" cy="320" r="24" fill="${p.accent}" opacity=".15" filter="url(#blurSmall${id})"/>
      <path d="M452 320L250 175M452 320L300 278M452 320L406 86" stroke="${p.accent}" stroke-opacity=".14"/>
      <path d="M0 480c150-28 300-20 380 20s160 46 220 20v74H0z" fill="#C9D0D6" opacity=".05"/>
      <rect x="58" y="365" width="120" height="160" fill="none" stroke="${p.accent}" stroke-opacity=".22"/>
      <path d="M58 365l120 160M178 365L58 525" stroke="${p.accent}" stroke-opacity=".1"/>
      <g fill="${p.accent}" opacity=".24">
        <rect x="0" y="630" width="600" height="1"/>
      </g>`;
    case "norse":
      return `
      ${stars(45, 600, 560, 8)}
      <circle cx="300" cy="300" r="210" fill="none" stroke="${p.accent}" stroke-opacity=".12"/>
      <circle cx="300" cy="300" r="160" fill="none" stroke="${p.accent}" stroke-opacity=".22" stroke-dasharray="2 11"/>
      <g stroke="${p.accent}" stroke-width="1.2" opacity=".36" fill="none">
        <path d="M300 160v280M160 300h280"/>
        <path d="M200 210l200 180M400 210L200 390"/>
        <path d="M300 200l-30 30 30 40 30-40z"/>
        <path d="M256 300l-22 40 22 40M344 300l22 40-22 40"/>
      </g>
      <path d="M0 550l110-160 78 100 98-160 124 176 72-90 118 142v242H0z" fill="#152838" opacity=".8"/>
      <path d="M0 660l180-80 120 24 120-54 180 70v180H0z" fill="#0A151F"/>
      <g fill="${p.accent}" opacity=".7">
        <path d="M160 260c14-18 40-22 56-10-15 3-28 12-34 27-7-10-14-15-22-17z"/>
        <path d="M432 338c12-15 32-18 46-8-12 2-23 9-28 22-6-8-12-12-18-14z"/>
      </g>
      <g fill="${p.accent}" opacity=".45">
        <circle cx="290" cy="482" r="3"/><circle cx="310" cy="492" r="1.5"/>
      </g>`;
    case "dlc":
      return `
      ${stars(38, 600, 500, 10)}
      <g transform="translate(300 330)">
        <circle r="215" fill="none" stroke="${p.accent}" stroke-opacity=".15"/>
        <circle r="155" fill="none" stroke="${p.accent}" stroke-opacity=".35" stroke-width="1.5"/>
        <circle r="102" fill="${p.accent}" opacity=".05"/>
        <path d="M-102 0H102M0-102V102" stroke="${p.accent}" opacity=".2"/>
        <path d="M-155-55L-210-90M155 55L210 90M-55 155L-90 210" stroke="${p.accent}" opacity=".5"/>
        <g fill="none" stroke="${p.accent}" stroke-width="1.5">
          <path d="M0-60L52-30v60L0 60-52 30v-60z" fill="${p.accent}" fill-opacity=".12"/>
          <path d="M0-20V20M-20-10L20 10M20-10L-20 10"/>
        </g>
      </g>
      <path d="M0 610l120-52 110 30 130-72 120 56 120-30v258H0z" fill="#08040C" opacity=".7"/>
      <g fill="${p.accent}" opacity=".7">
        <path d="M140 232l8 24 24 8-24 8-8 24-8-24-24-8 24-8z"/>
        <circle cx="468" cy="470" r="4"/>
      </g>`;
    case "gaming":
      return `
      ${stars(40, 600, 520, 2)}
      <g transform="translate(300 310)">
        <circle r="210" fill="${p.accent}" opacity=".06"/>
        <path d="M-238 70C-160-80-40-120 82-60c70 34 112 28 170-10l-56 140C80 180 10 190-80 140z" fill="${p.accent}" opacity=".2" filter="url(#blur${id})"/>
        <g fill="none" stroke="${p.accent}" stroke-width="3" opacity=".7">
          <path d="M0-190L60-70 190-70 80 10 120 140 0 70-120 140-80 10-190-70-60-70z"/>
        </g>
        <circle r="64" fill="${p.accent}" opacity=".16"/>
        <path d="M-28 18L0-28l28 46-28 18z" fill="${p.accent}"/>
      </g>
      <g fill="${p.to}" opacity=".32">
        <circle cx="76" cy="520" r="38"/><circle cx="514" cy="224" r="22"/>
      </g>
      <path d="M0 700h600" stroke="${p.accent}" stroke-opacity=".2"/>`;
    case "software":
      return `
      <g transform="translate(62 178)">
        <rect width="476" height="320" rx="10" fill="#fff" opacity=".06" stroke="${p.accent}" stroke-opacity=".22"/>
        <rect width="476" height="40" fill="#fff" opacity=".04"/>
        <circle cx="22" cy="20" r="4" fill="${p.accent}" opacity=".7"/>
        <circle cx="38" cy="20" r="4" fill="#fff" opacity=".25"/>
        <circle cx="54" cy="20" r="4" fill="#fff" opacity=".2"/>
        <g transform="translate(34 76)">
          <rect width="186" height="190" rx="4" fill="${p.accent}" opacity=".12"/>
          <circle cx="87" cy="72" r="42" fill="none" stroke="${p.accent}" stroke-width="2" opacity=".6"/>
          <path d="M45 72h84M87 30v84" stroke="${p.accent}" opacity=".45"/>
          <rect x="28" y="138" width="126" height="7" fill="${p.accent}" opacity=".55"/>
          <rect x="28" y="154" width="88" height="4" fill="#fff" opacity=".25"/>
        </g>
        <g transform="translate(246 76)">
          <rect width="196" height="58" fill="#fff" opacity=".04"/>
          <rect x="16" y="16" width="26" height="26" rx="6" fill="${p.accent}" opacity=".6"/>
          <rect x="58" y="20" width="104" height="6" fill="#fff" opacity=".35"/>
          <rect x="58" y="34" width="66" height="4" fill="#fff" opacity=".18"/>
          <rect y="76" width="196" height="58" fill="#fff" opacity=".07"/>
          <rect x="16" y="92" width="26" height="26" rx="6" fill="${p.accent}" opacity=".28"/>
          <rect x="58" y="96" width="118" height="6" fill="#fff" opacity=".35"/>
          <rect x="58" y="110" width="54" height="4" fill="#fff" opacity=".18"/>
          <rect y="152" width="196" height="38" fill="#fff" opacity=".04"/>
          <rect x="16" y="164" width="96" height="5" fill="#fff" opacity=".2"/>
        </g>
      </g>
      <circle cx="476" cy="542" r="110" fill="${p.accent}" opacity=".1" filter="url(#blur${id})"/>
      <path d="M410 532l28 28 60-72" fill="none" stroke="${p.accent}" stroke-width="5" opacity=".6"/>
      <rect y="650" width="600" height="1" fill="${p.accent}" opacity=".2"/>`;
    case "sports":
      return `
      <circle cx="300" cy="330" r="225" fill="none" stroke="${p.accent}" stroke-opacity=".16"/>
      <g transform="translate(300 320)" fill="none" stroke="${p.accent}">
        <circle r="124" stroke-width="2" opacity=".35"/>
        <path d="M-124 0h248M0-124v248" opacity=".2"/>
        <path d="M-88-88L88 88M88-88L-88 88" opacity=".12"/>
        <g stroke-width="3">
          <path d="M0-124L38-58 68-38 38 20 0 56-46 28-70-28-38-72z" fill="${p.accent}" fill-opacity=".08"/>
          <path d="M38-58L88-88M68-38L124-16M38 20L96 58M0 56L0 124M-46 28L-90 70M-70-28L-124 0M-38-72L-38-124" opacity=".4"/>
        </g>
      </g>
      <path d="M0 610L600 520v280H0z" fill="#060F0A" opacity=".6"/>
      <path d="M0 640h600M0 710h600M180 570v230M400 570v230" stroke="${p.accent}" stroke-opacity=".15"/>
      <g fill="${p.accent}" opacity=".5">
        <circle cx="80" cy="230" r="3"/><circle cx="520" cy="440" r="2"/>
      </g>`;
    case "arena":
      return `
      <circle cx="300" cy="310" r="235" fill="none" stroke="${p.accent}" stroke-opacity=".16"/>
      <ellipse cx="300" cy="500" rx="250" ry="88" fill="none" stroke="${p.accent}" stroke-opacity=".25"/>
      <g fill="none" stroke="${p.accent}">
        <circle cx="300" cy="300" r="112" stroke-width="2" opacity=".7"/>
        <circle cx="300" cy="300" r="76" stroke-width="1" opacity=".3" stroke-dasharray="4 8"/>
        <path d="M300 148v96M300 356v96M148 300h96M356 300h96" stroke-width="12" opacity=".12"/>
        <path d="M170 170l52 52M430 170l-52 52M170 430l52-52M430 430l-52-52" stroke-width="1" opacity=".3"/>
      </g>
      <path d="M300 260l36 26-14 44h-44l-14-44z" fill="${p.accent}" opacity=".8"/>
      <g fill="none" stroke="${p.accent}" opacity=".22">
        <path d="M0 170l150 50M600 230l-150 50M0 450l120-20M600 440l-140 40"/>
        <path d="M76 0l22 120M522 800l-16-120"/>
      </g>
      <g fill="${p.accent}" opacity=".8">
        <circle cx="94" cy="580" r="3"/><circle cx="508" cy="200" r="2"/><circle cx="450" cy="642" r="1.5"/>
      </g>`;
    default:
      return `<circle cx="300" cy="300" r="180" fill="${p.accent}" opacity=".2"/>`;
  }
}

let count = 0;
for (const product of catalog.products) {
  const isGift = ["Gift Card", "Gaming eCard", "Subscription"].includes(product.productType);
  const svg = isGift ? giftCover(product) : gameCover(product);
  writeFileSync(join(coversDir, `${product.slug}.svg`), svg);
  count++;
}

// --- Homepage banners: background art only. All copy is rendered from the API. ---
const heroArt = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="760" viewBox="0 0 1600 760" role="img" aria-label="Arcade-inspired promotional artwork">
  <defs>
    <linearGradient id="hbg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2B0866"/><stop offset=".45" stop-color="#6817A8"/><stop offset="1" stop-color="#D22D87"/>
    </linearGradient>
    <radialGradient id="sun" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#FFEB66"/><stop offset=".48" stop-color="#FF8AC9" stop-opacity=".8"/><stop offset="1" stop-color="#FF8AC9" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="streak" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#FFE870" stop-opacity="0"/><stop offset=".5" stop-color="#FFE870" stop-opacity=".8"/><stop offset="1" stop-color="#FFE870" stop-opacity="0"/>
    </linearGradient>
    <filter id="hb"><feGaussianBlur stdDeviation="28"/></filter>
    <filter id="hs"><feGaussianBlur stdDeviation="9"/></filter>
    <filter id="hgrain"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="3"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".06"/></feComponentTransfer></filter>
    <pattern id="hgrid" width="56" height="56" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
      <path d="M56 0H0V56" fill="none" stroke="#fff" stroke-opacity=".08"/>
    </pattern>
  </defs>
  <rect width="1600" height="760" fill="url(#hbg)"/>
  <ellipse cx="1090" cy="210" rx="420" ry="300" fill="url(#sun)" opacity=".85"/>
  <rect width="1600" height="760" fill="url(#hgrid)"/>
  <g opacity=".9" filter="url(#hb)">
    <circle cx="140" cy="110" r="150" fill="#39D2C0" opacity=".28"/>
    <circle cx="1380" cy="600" r="220" fill="#FFD84D" opacity=".2"/>
    <circle cx="750" cy="680" r="190" fill="#FF4A9A" opacity=".25"/>
  </g>
  <g transform="translate(930 120) rotate(-10)">
    <rect width="290" height="390" rx="8" fill="#130B2C" opacity=".65" stroke="#fff" stroke-opacity=".15"/>
    <rect x="18" y="18" width="254" height="286" rx="3" fill="#3A1767"/>
    <circle cx="145" cy="150" r="92" fill="#FAD318" opacity=".65"/>
    <path d="M92 236l53-140 53 140z" fill="#1D0E3D"/>
    <text x="145" y="340" text-anchor="middle" font-family="Arial, sans-serif" font-size="19" font-weight="900" letter-spacing="3" fill="#fff">NIGHT CITY</text>
  </g>
  <g transform="translate(1260 380) rotate(8)">
    <rect width="210" height="282" rx="8" fill="#071A31" opacity=".7" stroke="#fff" stroke-opacity=".15"/>
    <rect x="16" y="16" width="178" height="202" rx="3" fill="#0D3D6B"/>
    <circle cx="105" cy="108" r="62" fill="none" stroke="#69C7FF" stroke-width="4"/>
    <path d="M61 106c22-42 66-46 88 0-25 34-62 36-88 0z" fill="#69C7FF" opacity=".5"/>
    <text x="105" y="252" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="900" letter-spacing="2" fill="#fff">STARFALL</text>
  </g>
  <g transform="translate(770 230)">
    <circle cx="150" cy="160" r="160" fill="none" stroke="#FFF2A8" stroke-width="2" opacity=".28"/>
    <circle cx="150" cy="160" r="120" fill="none" stroke="#FFF2A8" stroke-width="1" opacity=".2"/>
    <g transform="translate(72 54)">
      <path d="M20 80c8-34 40-52 88-52h84c40 0 70 20 84 58l12 46 34 10v32H0l-16-58z" fill="#160A32" opacity=".92"/>
      <path d="M58 90l36-38h60l18 38z" fill="#FFEF7A" opacity=".3"/>
      <circle cx="72" cy="144" r="30" fill="#100624" stroke="#FFDA55" stroke-width="3"/>
      <circle cx="252" cy="144" r="30" fill="#100624" stroke="#FFDA55" stroke-width="3"/>
      <circle cx="72" cy="144" r="9" fill="#FFDA55"/>
      <circle cx="252" cy="144" r="9" fill="#FFDA55"/>
    </g>
    <path d="M-20 400L320 80" stroke="url(#streak)" stroke-width="5" filter="url(#hs)"/>
  </g>
  <g fill="#FFE870">
    <rect x="240" y="560" width="250" height="8" transform="rotate(-14 240 560)" opacity=".8"/>
    <rect x="330" y="594" width="158" height="5" transform="rotate(-14 330 594)" opacity=".4"/>
    <rect x="180" y="642" width="96" height="3" transform="rotate(-14 180 642)" opacity=".3"/>
  </g>
  <g fill="#52E3C2" opacity=".9">
    <path d="M1380 100l12 34 34 12-34 12-12 34-12-34-34-12 34-12z"/>
    <path d="M300 200l7 20 20 7-20 7-7 20-7-20-20-7 20-7z" opacity=".7"/>
  </g>
  <rect width="1600" height="760" fill="#000" filter="url(#hgrain)"/>
</svg>`;

const giftArt = `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="900" viewBox="0 0 760 900" role="img" aria-label="Stack of digital gift cards">
  <defs>
    <linearGradient id="gbg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFE23C"/><stop offset=".5" stop-color="#FFB72B"/><stop offset="1" stop-color="#FF7A3A"/>
    </linearGradient>
    <linearGradient id="card1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6818BB"/><stop offset="1" stop-color="#2A075B"/>
    </linearGradient>
    <linearGradient id="card2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#071A2D"/><stop offset="1" stop-color="#165060"/>
    </linearGradient>
    <filter id="gsh"><feDropShadow dx="0" dy="22" stdDeviation="20" flood-color="#7A2E00" flood-opacity=".35"/></filter>
    <filter id="ggrain"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="3"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".055"/></feComponentTransfer></filter>
    <pattern id="gdots" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.6" fill="#5A2600" opacity=".15"/></pattern>
  </defs>
  <rect width="760" height="900" fill="url(#gbg)"/>
  <rect width="760" height="900" fill="url(#gdots)"/>
  <circle cx="110" cy="150" r="220" fill="#fff" opacity=".13" filter="url(#gsh)"/>
  <circle cx="690" cy="760" r="250" fill="#FF4B8B" opacity=".16" filter="url(#gsh)"/>
  <g transform="translate(440 112) rotate(13)" opacity=".85" filter="url(#gsh)">
    <rect width="300" height="190" rx="12" fill="url(#card2)"/>
    <text x="28" y="48" font-family="Arial, sans-serif" font-size="12" font-weight="700" letter-spacing="3" fill="#fff" opacity=".6">DIGITAL GIFT CARD</text>
    <text x="28" y="104" font-family="Arial, sans-serif" font-size="34" font-weight="900" fill="#fff">GAME ON</text>
    <text x="28" y="134" font-family="Arial, sans-serif" font-size="17" fill="#7BEADB">€50.00</text>
    <circle cx="256" cy="138" r="28" fill="#7BEADB" opacity=".17"/>
    <path d="M242 128l28 22m0-22l-28 22" stroke="#7BEADB" stroke-width="2"/>
  </g>
  <g transform="translate(90 230) rotate(-7)" filter="url(#gsh)">
    <rect width="330" height="208" rx="12" fill="url(#card1)"/>
    <rect x="18" y="18" width="294" height="172" rx="6" fill="none" stroke="#fff" stroke-opacity=".12"/>
    <text x="34" y="54" font-family="Arial, sans-serif" font-size="12" font-weight="700" letter-spacing="3" fill="#FFE76B">GIFT CARD</text>
    <text x="34" y="112" font-family="Arial, sans-serif" font-size="42" font-weight="900" fill="#fff">PLAY</text>
    <text x="34" y="154" font-family="Arial, sans-serif" font-size="16" fill="#D4C2FF">FUND YOUR NEXT ADVENTURE</text>
    <circle cx="270" cy="110" r="42" fill="#FAD318" opacity=".18"/>
    <path d="M252 90l18 40 18-40" fill="none" stroke="#FAD318" stroke-width="4"/>
  </g>
  <g transform="translate(190 510) rotate(9)" filter="url(#gsh)">
    <rect width="380" height="234" rx="14" fill="#F9F5EA"/>
    <circle cx="320" cy="78" r="48" fill="#EAEAE6"/>
    <text x="34" y="72" font-family="Arial, sans-serif" font-size="13" font-weight="700" letter-spacing="3" fill="#6B6458">GIFT CARD</text>
    <text x="34" y="126" font-family="Arial, sans-serif" font-size="44" font-weight="900" fill="#111">ENJOY</text>
    <text x="34" y="166" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#8C7D5C">€25.00</text>
    <rect x="34" y="190" width="180" height="8" rx="4" fill="#DDD5C4"/>
    <rect x="34" y="204" width="110" height="5" rx="2.5" fill="#E7E0D1"/>
  </g>
  <g fill="#4A1C00" opacity=".55">
    <path d="M610 200l10 30 30 10-30 10-10 30-10-30-30-10 30-10z"/>
    <circle cx="110" cy="780" r="5"/>
    <circle cx="665" cy="580" r="3"/>
  </g>
  <rect width="760" height="900" fill="#000" filter="url(#ggrain)"/>
</svg>`;

const crownArt = `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="900" viewBox="0 0 760 900" role="img" aria-label="Golden crown in a dark fantasy realm">
  <defs>
    <linearGradient id="cbg" x1="0" y1="0" x2=".8" y2="1">
      <stop offset="0" stop-color="#0E041D"/><stop offset=".6" stop-color="#2B0B4B"/><stop offset="1" stop-color="#560D54"/>
    </linearGradient>
    <radialGradient id="cglow" cx="50%" cy="36%" r="55%">
      <stop offset="0" stop-color="#F2CA72" stop-opacity=".8"/><stop offset=".35" stop-color="#C26BDB" stop-opacity=".2"/><stop offset="1" stop-color="#C26BDB" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFF2B1"/><stop offset=".45" stop-color="#E3B14A"/><stop offset="1" stop-color="#8E5C18"/>
    </linearGradient>
    <filter id="cgrain"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="3"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".06"/></feComponentTransfer></filter>
    <filter id="csoft"><feGaussianBlur stdDeviation="16"/></filter>
  </defs>
  <rect width="760" height="900" fill="url(#cbg)"/>
  <rect width="760" height="900" fill="url(#cglow)"/>
  <g fill="#fff" opacity=".6">
    <circle cx="100" cy="170" r="1.4"/><circle cx="210" cy="90" r="1"/><circle cx="620" cy="140" r="1.6"/><circle cx="680" cy="320" r="1"/><circle cx="68" cy="400" r="1.2"/><circle cx="560" cy="70" r="1"/><circle cx="480" cy="220" r="1.3"/>
  </g>
  <circle cx="380" cy="350" r="255" fill="none" stroke="#E3B14A" stroke-opacity=".12"/>
  <circle cx="380" cy="350" r="195" fill="none" stroke="#E3B14A" stroke-opacity=".2" stroke-dasharray="3 14"/>
  <g opacity=".25" filter="url(#csoft)">
    <path d="M140 850L380 80l240 770" fill="none" stroke="#E3B14A" stroke-width="32"/>
  </g>
  <g transform="translate(182 290)">
    <path d="M0 210L58 40l104 112L198 0l98 152L400 42l42 182v90H0z" fill="url(#gold)"/>
    <path d="M0 268h442v46H0z" fill="url(#gold)"/>
    <path d="M58 40l18 212M198 0v252M400 42L350 252" stroke="#FFF2B1" stroke-opacity=".28"/>
    <circle cx="198" cy="86" r="15" fill="#7A0F4F"/>
    <circle cx="198" cy="86" r="8" fill="#FF9ADB"/>
    <circle cx="58" cy="40" r="11" fill="#FFF2B1"/>
    <circle cx="400" cy="42" r="11" fill="#FFF2B1"/>
  </g>
  <path d="M0 720l160-90 100 28 120-74 120 58 140-48 120 74v232H0z" fill="#0A0314"/>
  <g stroke="#E3B14A" stroke-opacity=".3">
    <path d="M0 790h760M120 840h400M520 880h240"/>
  </g>
  <rect width="760" height="900" fill="#000" filter="url(#cgrain)"/>
</svg>`;

writeFileSync(join(bannersDir, "hero-arcade.svg"), heroArt);
writeFileSync(join(bannersDir, "gift-cards.svg"), giftArt);
writeFileSync(join(bannersDir, "crownfall.svg"), crownArt);

// Brand mark used by the app / favicon.
const mark = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#4618AC"/>
  <path d="M32 12c8 0 14 6 14 14 0 10-8 14-14 22-6-8-14-12-14-22 0-8 6-14 14-14z" fill="#F7D046"/>
  <path d="M32 20c5 0 9 4 9 9 0 6-4 9-9 13-5-4-9-7-9-13 0-5 4-9 9-9z" fill="#7A35F2"/>
  <circle cx="32" cy="29" r="4" fill="#F6F1FF"/>
  <path d="M12 32c0-8 6-14 14-14" fill="none" stroke="#F26BB5" stroke-width="5" stroke-linecap="round"/>
  <path d="M52 32c0 8-6 14-14 14" fill="none" stroke="#57D7C7" stroke-width="5" stroke-linecap="round"/>
</svg>`;
writeFileSync(join(root, "frontend/public/brand-mark.svg"), mark);
writeFileSync(join(root, "frontend/src/app/icon.svg"), mark);

console.log(`Generated ${count} product covers, 3 banner backgrounds and the brand mark.`);
