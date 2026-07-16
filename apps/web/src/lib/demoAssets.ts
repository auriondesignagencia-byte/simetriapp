/**
 * Gerador de "fotos" do modo demo.
 *
 * Por que não usar fotos de banco de imagens: são fotos de bebês reais, de
 * crianças que não consentiram em ilustrar um app sobre deformidade craniana.
 * Por que não usar placeholder cinza: o briefing proíbe tela feia, e um grid de
 * retângulos cinzas é exatamente isso.
 *
 * Então desenhamos. Cada imagem é uma vista superior estilizada de cabeça, e a
 * assimetria da SEMANA é aplicada de verdade na geometria — a foto da semana 1
 * é visivelmente mais torta que a da semana 10. O gráfico e as imagens contam a
 * mesma história porque saem do mesmo número.
 */

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BLANKETS = [
  ['#F3E6D8', '#E7D3BE'],
  ['#E4EAF0', '#CFDAE4'],
  ['#EDE7F0', '#DCD2E2'],
  ['#E8EFE6', '#D3E0D0'],
];

/**
 * @param asymmetry índice em % — controla o quanto a cabeça é desenhada torta
 * @param seed      mantém a mesma "foto" estável entre renders
 */
export function generateHeadPhoto(asymmetry: number, seed: number): string {
  const rnd = mulberry32(seed);
  const size = 512;
  const cx = size / 2;
  const cy = size / 2 + 8;

  // Achatamento posterior-direito, que é o padrão de plagiocefalia posicional.
  // k escala o quanto o quadrante traseiro-direito "afunda" para dentro.
  const k = Math.min(1, asymmetry / 12);
  const baseRx = 150;
  const baseRy = 178;

  const jitter = () => (rnd() - 0.5) * 6;

  // 4 raios de quadrante: frente-esq, frente-dir, trás-dir (achatado), trás-esq
  const rFE = baseRx * (1 + 0.02 * k) + jitter();
  const rFD = baseRx * (1 - 0.06 * k) + jitter();
  const rTD = baseRx * (1 - 0.16 * k) + jitter();
  const rTE = baseRx * (1 + 0.05 * k) + jitter();

  const top = cy - baseRy - jitter();
  const bottom = cy + baseRy * (1 - 0.04 * k);

  // Contorno como 4 arcos Bézier, um por quadrante — permite raio diferente em
  // cada canto, que é justamente o que um contorno elíptico simples não faria.
  const c = 0.5523;
  const head = [
    `M ${cx} ${top}`,
    `C ${cx + rFD * c} ${top}, ${cx + rFD} ${cy - baseRy * c}, ${cx + rFD} ${cy}`,
    `C ${cx + rTD} ${cy + baseRy * c * 0.95}, ${cx + rTD * c} ${bottom}, ${cx} ${bottom}`,
    `C ${cx - rTE * c} ${bottom}, ${cx - rTE} ${cy + baseRy * c}, ${cx - rTE} ${cy}`,
    `C ${cx - rFE} ${cy - baseRy * c}, ${cx - rFE * c} ${top}, ${cx} ${top}`,
    'Z',
  ].join(' ');

  const blanket = BLANKETS[seed % BLANKETS.length];
  const swirlX = cx + (rnd() - 0.5) * 30;
  const swirlY = cy + 40 + (rnd() - 0.5) * 20;

  // Fios de cabelo irradiando do redemoinho — é o detalhe que faz a silhueta
  // ler como "cabecinha vista de cima" em vez de "óvalo bege".
  const strands = Array.from({ length: 26 }, (_, i) => {
    const a = (i / 26) * Math.PI * 2 + rnd() * 0.25;
    const len = 60 + rnd() * 90;
    const x2 = swirlX + Math.cos(a) * len;
    const y2 = swirlY + Math.sin(a) * len * 1.05;
    const mx = swirlX + Math.cos(a + 0.5) * len * 0.55;
    const my = swirlY + Math.sin(a + 0.5) * len * 0.55;
    return `<path d="M ${swirlX.toFixed(1)} ${swirlY.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="#6B5545" stroke-opacity="${(0.13 + rnd() * 0.16).toFixed(2)}" stroke-width="${(1.6 + rnd() * 2).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="72%">
      <stop offset="0%" stop-color="${blanket[0]}"/>
      <stop offset="100%" stop-color="${blanket[1]}"/>
    </radialGradient>
    <radialGradient id="skin" cx="44%" cy="34%" r="68%">
      <stop offset="0%" stop-color="#F0D3BC"/>
      <stop offset="70%" stop-color="#E2BC9F"/>
      <stop offset="100%" stop-color="#CFA184"/>
    </radialGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="10"/>
    </filter>
    <clipPath id="skull"><path d="${head}"/></clipPath>
  </defs>

  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <ellipse cx="${cx}" cy="${cy + 14}" rx="${baseRx + 22}" ry="${baseRy + 16}" fill="#000" opacity="0.10" filter="url(#soft)"/>

  <path d="${head}" fill="url(#skin)"/>
  <g clip-path="url(#skull)">${strands}</g>
  <path d="${head}" fill="none" stroke="#B98F72" stroke-opacity="0.35" stroke-width="2"/>

  <ellipse cx="${cx - rFE * 0.62}" cy="${cy + 6}" rx="15" ry="26" fill="#E2BC9F" stroke="#B98F72" stroke-opacity="0.35" stroke-width="2"/>
  <ellipse cx="${cx + rFD * 0.62}" cy="${cy + 6}" rx="15" ry="26" fill="#E2BC9F" stroke="#B98F72" stroke-opacity="0.35" stroke-width="2"/>

  <rect x="0" y="0" width="${size}" height="${size}" fill="#FFF" opacity="0.04"/>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * "Foto" de um ângulo complementar para o modo demo (perfil, frente, nuca,
 * diagonal). Ao contrário da vista de cima, estes ângulos NÃO carregam índice —
 * são registro visual — então o desenho não precisa codificar a assimetria, só
 * ler como uma cabecinha vista daquele lado. Categorias agrupadas pelo tipo de
 * silhueta: perfil/diagonal mostram uma orelha, a nuca mostra duas.
 */
export function generateAnglePhoto(angle: string, seed = 3): string {
  const size = 512;
  const cx = size / 2;
  const cy = size / 2 + 6;
  const blanket = BLANKETS[seed % BLANKETS.length];

  const profile = (mirror: boolean) => {
    const s = mirror ? -1 : 1;
    // Perfil: crânio arredondado atrás, testa/rosto à frente, uma orelha.
    const head = `M ${cx} ${cy - 150}
      C ${cx + s * 150} ${cy - 150}, ${cx + s * 165} ${cy - 20}, ${cx + s * 120} ${cy + 70}
      C ${cx + s * 95} ${cy + 130}, ${cx + s * 20} ${cy + 150}, ${cx - s * 20} ${cy + 150}
      C ${cx - s * 70} ${cy + 150}, ${cx - s * 120} ${cy + 90}, ${cx - s * 130} ${cy - 10}
      C ${cx - s * 138} ${cy - 90}, ${cx - s * 80} ${cy - 150}, ${cx} ${cy - 150} Z`;
    const ear = `<ellipse cx="${cx + s * 18}" cy="${cy + 4}" rx="22" ry="30" fill="#E2BC9F" stroke="#B98F72" stroke-opacity="0.4" stroke-width="2"/>`;
    // Faces à frente (lado do rosto).
    const face = `<path d="M ${cx + s * 118} ${cy - 40} Q ${cx + s * 132} ${cy + 20} ${cx + s * 100} ${cy + 78}" stroke="#B98F72" stroke-opacity="0.3" stroke-width="2" fill="none"/>`;
    return { head, extras: ear + face };
  };

  const posterior = () => {
    // Nuca: crânio simétrico visto por trás, duas orelhas, redemoinho central.
    const head = `M ${cx} ${cy - 155}
      C ${cx + 150} ${cy - 155}, ${cx + 155} ${cy + 40}, ${cx + 90} ${cy + 120}
      C ${cx + 45} ${cy + 165}, ${cx - 45} ${cy + 165}, ${cx - 90} ${cy + 120}
      C ${cx - 155} ${cy + 40}, ${cx - 150} ${cy - 155}, ${cx} ${cy - 155} Z`;
    const ears = `<ellipse cx="${cx - 138}" cy="${cy}" rx="20" ry="30" fill="#E2BC9F" stroke="#B98F72" stroke-opacity="0.4" stroke-width="2"/>
      <ellipse cx="${cx + 138}" cy="${cy}" rx="20" ry="30" fill="#E2BC9F" stroke="#B98F72" stroke-opacity="0.4" stroke-width="2"/>`;
    return { head, extras: ears };
  };

  const front = () => {
    // Frente: rosto com olhos e boca.
    const head = `M ${cx} ${cy - 152}
      C ${cx + 140} ${cy - 152}, ${cx + 150} ${cy + 30}, ${cx + 78} ${cy + 120}
      C ${cx + 40} ${cy + 160}, ${cx - 40} ${cy + 160}, ${cx - 78} ${cy + 120}
      C ${cx - 150} ${cy + 30}, ${cx - 140} ${cy - 152}, ${cx} ${cy - 152} Z`;
    const face = `<ellipse cx="${cx - 46}" cy="${cy - 6}" rx="9" ry="7" fill="#4A3A2E"/>
      <ellipse cx="${cx + 46}" cy="${cy - 6}" rx="9" ry="7" fill="#4A3A2E"/>
      <path d="M ${cx - 26} ${cy + 62} Q ${cx} ${cy + 78} ${cx + 26} ${cy + 62}" stroke="#B07A62" stroke-width="4" fill="none" stroke-linecap="round"/>
      <circle cx="${cx - 78}" cy="${cy + 34}" r="12" fill="#E39B8A" opacity="0.3"/>
      <circle cx="${cx + 78}" cy="${cy + 34}" r="12" fill="#E39B8A" opacity="0.3"/>`;
    return { head, extras: face };
  };

  let shape: { head: string; extras: string };
  if (angle === 'lateral_esq' || angle === 'diagonal_esq') shape = profile(true);
  else if (angle === 'lateral_dir' || angle === 'diagonal_dir') shape = profile(false);
  else if (angle === 'posterior') shape = posterior();
  else shape = front();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="72%">
      <stop offset="0%" stop-color="${blanket[0]}"/><stop offset="100%" stop-color="${blanket[1]}"/>
    </radialGradient>
    <radialGradient id="skin" cx="44%" cy="30%" r="72%">
      <stop offset="0%" stop-color="#F0D3BC"/><stop offset="70%" stop-color="#E2BC9F"/><stop offset="100%" stop-color="#CFA184"/>
    </radialGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10"/></filter>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <ellipse cx="${cx}" cy="${cy + 30}" rx="180" ry="150" fill="#000" opacity="0.10" filter="url(#soft)"/>
  <path d="${shape.head}" fill="url(#skin)"/>
  <path d="${shape.head}" fill="none" stroke="#B98F72" stroke-opacity="0.35" stroke-width="2"/>
  ${shape.extras}
  <rect width="${size}" height="${size}" fill="#FFF" opacity="0.04"/>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Avatar circular do bebê para o cabeçalho da Home. */
export function generateBabyAvatar(seed = 7): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <defs>
    <radialGradient id="a" cx="42%" cy="34%" r="70%">
      <stop offset="0%" stop-color="#F6E0CB"/><stop offset="100%" stop-color="#E0B99B"/>
    </radialGradient>
    <linearGradient id="b" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F5EDE2"/><stop offset="100%" stop-color="#E7D8C5"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" fill="url(#b)"/>
  <circle cx="100" cy="150" r="62" fill="#C9A227" opacity="0.18"/>
  <circle cx="100" cy="92" r="56" fill="url(#a)"/>
  <path d="M 52 76 Q 100 34 148 76 Q 128 58 100 56 Q 72 58 52 76 Z" fill="#6B5545" opacity="0.55"/>
  <circle cx="80" cy="94" r="5" fill="#4A3A2E"/>
  <circle cx="120" cy="94" r="5" fill="#4A3A2E"/>
  <path d="M 86 118 Q 100 128 114 118" stroke="#B07A62" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="64" cy="108" r="8" fill="#E39B8A" opacity="0.35"/>
  <circle cx="136" cy="108" r="8" fill="#E39B8A" opacity="0.35"/>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
