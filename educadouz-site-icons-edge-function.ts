const REV = 'e20cbc2bbec1926686be9f9bee7d1d2cfa1fea0e';
const RAW = `https://raw.githubusercontent.com/googlefonts/noto-emoji/${REV}/2D/svg/emoji_u`;
const LICENSE_URL = `https://raw.githubusercontent.com/googlefonts/noto-emoji/${REV}/2D/svg/LICENSE`;
const ICONS = {
  quran: '1f49a', summaries: '1f4da', evaluation: '2b50', lessons: '1f4d6', exams: '1f4dd',
  videos: '1f3ac', images: '1f5bc', obs: '1f50d', exercises: '1f4d8', sessions: '1f4c5',
  discipline: '1f468_200d_1f3eb', notifs: '1f4c4', docs: '1f4d1', results: '1f4ca', events: '1f5d3',
  prophets: '1f4dc', pay: '1f4b0', recorded: '1f3a5', logout: '21aa', live: '1f534', home: '1f3e0',
  phone: '1f4de', back: '2b05'
};
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
  'X-Content-Type-Options': 'nosniff'
};
let spriteCache = null;

function toBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

async function buildSprite() {
  const symbols = await Promise.all(Object.entries(ICONS).map(async ([name, codepoint]) => {
    const response = await fetch(`${RAW}${codepoint}.svg`);
    if (!response.ok) throw new Error(`Noto asset unavailable: ${codepoint}`);
    const svgText = await response.text();
    if (svgText.indexOf('<svg') < 0) throw new Error(`Invalid Noto SVG: ${codepoint}`);
    const marker = 'viewBox=' + String.fromCharCode(34);
    const start = svgText.indexOf(marker);
    let viewBox = '0 0 128 128';
    if (start >= 0) {
      const valueStart = start + marker.length;
      const valueEnd = svgText.indexOf(String.fromCharCode(34), valueStart);
      if (valueEnd > valueStart) viewBox = svgText.substring(valueStart, valueEnd);
    }
    const encoded = toBase64(new TextEncoder().encode(svgText));
    return `<symbol id='edu-icon-${name}' viewBox='${viewBox}'><image x='0' y='0' width='128' height='128' preserveAspectRatio='xMidYMid meet' href='data:image/svg+xml;base64,${encoded}'/></symbol>`;
  }));
  const menu = `<symbol id='edu-icon-menu' viewBox='0 0 128 128'><path d='M24 36H104M24 64H104M24 92H104' fill='none' stroke='currentColor' stroke-width='10' stroke-linecap='round'/></symbol>`;
  return `<svg xmlns='http://www.w3.org/2000/svg'><!-- Noto Emoji color artwork by Google. Source revision ${REV}; Apache-2.0. Full license: ${LICENSE_URL} -->${symbols.join('')}${menu}</svg>`;
}

Deno.serve(async (request) => {
  const url = new URL(request.url);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405, headers: CORS });
  if (url.searchParams.has('license')) {
    const license = await fetch(LICENSE_URL);
    if (!license.ok) return new Response('License temporarily unavailable', { status: 502, headers: CORS });
    return new Response(await license.text(), { headers: { ...CORS, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
  }
  try {
    if (!spriteCache) spriteCache = buildSprite().catch((error) => { spriteCache = null; throw error; });
    const sprite = await spriteCache;
    return new Response(sprite, { headers: { ...CORS, 'Content-Type': 'image/svg+xml; charset=utf-8', 'Content-Disposition': 'inline; filename=educadouz-icons.svg', 'Cache-Control': 'public, max-age=86400, s-maxage=604800' } });
  } catch (_error) {
    return new Response('Could not load the shared icon sprite', { status: 502, headers: CORS });
  }
});
