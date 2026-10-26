// Builds the HTML for one devotion image (1080x1350, Instagram portrait).
// Rendered to JPEG by render.mjs using Playwright.

const PALETTE = {
  wine: '#3A0B16',
  maroon: '#751428',
  rust: '#B04E1C',
  apricot: '#F2B78E',
  cream: '#F8EFDD',
  gold: '#C29A45',
  white: '#FFFFFF',
};

// Each theme only uses text/background pairs from the approved CPWT pairings (>= 4.5:1).
const THEMES = {
  wine: {
    background: `radial-gradient(ellipse at 50% 30%, ${PALETTE.maroon} 0%, ${PALETTE.wine} 70%)`,
    verse: PALETTE.cream,
    secondary: PALETTE.apricot,
    reference: PALETTE.apricot,
    date: PALETTE.apricot,
    rule: PALETTE.gold,
  },
  cream: {
    background: `linear-gradient(160deg, ${PALETTE.cream} 0%, #F3E4C8 100%)`,
    verse: PALETTE.wine,
    secondary: PALETTE.maroon,
    reference: PALETTE.maroon,
    date: PALETTE.maroon,
    rule: PALETTE.rust,
  },
  maroon: {
    background: `linear-gradient(200deg, ${PALETTE.maroon} 0%, #5A0F20 100%)`,
    verse: PALETTE.white,
    secondary: PALETTE.apricot,
    reference: PALETTE.apricot,
    date: PALETTE.apricot,
    rule: PALETTE.apricot,
  },
  photo: {
    background: PALETTE.wine,
    verse: PALETTE.cream,
    secondary: PALETTE.apricot,
    reference: PALETTE.apricot,
    date: PALETTE.apricot,
    rule: PALETTE.gold,
  },
};

export const THEME_NAMES = ['wine', 'cream', 'maroon'];

const escape = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function formatDates(isoDate) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  const opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' };
  return {
    tamil: new Intl.DateTimeFormat('ta-IN', opts).format(d),
    english: new Intl.DateTimeFormat('en-AU', opts).format(d),
  };
}

/**
 * @param {object} d
 * @param {string} d.date            ISO date, e.g. 2026-11-01
 * @param {string} [d.verseTamil]
 * @param {string} [d.referenceTamil]
 * @param {string} [d.verseEnglish]
 * @param {string} [d.referenceEnglish]
 * @param {string} d.churchName
 * @param {string} [d.theme]         wine | cream | maroon | photo
 * @param {string} [d.backgroundUrl] photo for the "photo" theme
 * @param {string} [d.logoDataUrl]   church logo as a data: URL
 */
export function buildHtml(d) {
  const theme = THEMES[d.theme] || THEMES.wine;
  const dates = formatDates(d.date);
  const hasTamil = Boolean(d.verseTamil);
  const hasEnglish = Boolean(d.verseEnglish);

  const photoLayer =
    d.theme === 'photo' && d.backgroundUrl
      ? `<div class="photo" style="background-image:url('${escape(d.backgroundUrl)}')"></div><div class="shade"></div>`
      : '';

  return `<!doctype html>
<html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Tamil:wght@500;700&family=Noto+Sans+Tamil:wght@500;700&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Montserrat:wght@500;600;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1080px; height: 1350px; }
  body { position: relative; overflow: hidden; background: ${theme.background}; }
  .photo { position: absolute; inset: 0; background-size: cover; background-position: center; }
  .shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(58,11,22,.55) 0%, rgba(58,11,22,.82) 55%, rgba(58,11,22,.95) 100%); }
  .frame { position: absolute; inset: 40px 40px 170px; border: 2px solid ${theme.rule}; opacity: .55; }
  .content { position: absolute; inset: 0 0 130px; display: flex; flex-direction: column; padding: 110px 110px 90px; }
  .date { text-align: center; color: ${theme.date}; }
  .date .ta { font: 700 34px 'Noto Sans Tamil', sans-serif; }
  .date .en { font: 600 24px Montserrat, sans-serif; letter-spacing: 3px; text-transform: uppercase; margin-top: 10px; }
  .rule { width: 120px; height: 3px; background: ${theme.rule}; margin: 36px auto 0; }
  .verses { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 40px; overflow: hidden; text-align: center; }
  .verse-ta { font-family: 'Noto Serif Tamil', serif; font-weight: 500; color: ${theme.verse}; line-height: 1.55; }
  .verse-en { font-family: 'Cormorant Garamond', serif; font-style: italic; font-weight: 500; color: ${hasTamil ? theme.secondary : theme.verse}; line-height: 1.3; }
  .ref { margin-top: 14px; font-style: normal; color: ${theme.reference}; }
  .verse-ta .ref { font: 700 0.62em 'Noto Sans Tamil', sans-serif; }
  .verse-en .ref { font: 600 0.62em Montserrat, sans-serif; letter-spacing: 2px; }
  .footer { position: absolute; left: 0; right: 0; bottom: 0; height: 130px; background: ${PALETTE.wine}; border-top: 6px solid ${PALETTE.rust};
            display: flex; align-items: center; justify-content: center; gap: 24px; }
  .footer img { height: 96px; }
  .footer .name { color: ${PALETTE.cream}; font: 700 34px Montserrat, sans-serif; letter-spacing: 4px; text-transform: uppercase; }
</style></head>
<body>
  ${photoLayer}
  <div class="frame"></div>
  <div class="content">
    <div class="date">
      <div class="ta">${escape(dates.tamil)}</div>
      <div class="en">${escape(dates.english)}</div>
      <div class="rule"></div>
    </div>
    <div class="verses" id="verses">
      ${hasTamil ? `<div class="verse-ta" id="ta">“${escape(d.verseTamil)}”${d.referenceTamil ? `<div class="ref">${escape(d.referenceTamil)}</div>` : ''}</div>` : ''}
      ${hasEnglish ? `<div class="verse-en" id="en">“${escape(d.verseEnglish)}”${d.referenceEnglish ? `<div class="ref">${escape(d.referenceEnglish)}</div>` : ''}</div>` : ''}
    </div>
  </div>
  <div class="footer">
    ${d.logoDataUrl ? `<img src="${d.logoDataUrl}" alt="">` : ''}
    <div class="name">${escape(d.churchName)}</div>
  </div>
<script>
  // Shrink the verse text until it fits the space between the date and the footer.
  window.fitText = () => {
    const box = document.getElementById('verses');
    const ta = document.getElementById('ta');
    const en = document.getElementById('en');
    let size = ${hasTamil ? 60 : 72};
    const apply = () => {
      if (ta) ta.style.fontSize = size + 'px';
      if (en) en.style.fontSize = (ta ? size * 0.8 : size) + 'px';
    };
    apply();
    while (box.scrollHeight > box.clientHeight && size > 22) { size -= 2; apply(); }
    return size;
  };
</script>
</body></html>`;
}
