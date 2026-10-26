import ExcelJS from 'exceljs';
import { isIsoDate } from './dates';
import { THEMES } from './config';

// Header names are matched loosely (case and spacing don't matter).
const HEADERS = {
  date: ['date', 'தேதி'],
  verse_tamil: ['tamil verse', 'verse tamil', 'tamil', 'வசனம்'],
  reference_tamil: ['tamil reference', 'reference tamil', 'tamil ref'],
  verse_english: ['english verse', 'verse english', 'english', 'verse'],
  reference_english: ['english reference', 'reference english', 'english ref', 'reference', 'ref'],
  caption: ['caption', 'post caption'],
  theme: ['theme', 'style'],
  background_url: ['background', 'background url', 'photo', 'image url'],
};

const norm = (s) => String(s ?? '').toLowerCase().replace(/[\s_]+/g, ' ').trim();

function cellText(value) {
  if (value == null) return '';
  if (value instanceof Date) return value;
  if (typeof value === 'object') {
    if (value.richText) return value.richText.map((r) => r.text).join('');
    if (value.text) return String(value.text);
    if (value.result != null) return cellText(value.result);
    if (value.hyperlink) return String(value.hyperlink);
  }
  return String(value).trim();
}

// Accepts real Excel dates, 2026-11-01, and Australian-style 1/11/2026 or 01-11-2026.
function toIsoDate(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  if (isIsoDate(s)) return s;
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    const iso = `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    if (isIsoDate(iso)) return iso;
  }
  return null;
}

/**
 * Reads the first worksheet. Returns { rows, errors } where each row has the database column names.
 */
export async function parseDevotionWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { rows: [], errors: ['The file has no worksheets.'] };

  const headerRow = sheet.getRow(1);
  const columns = {};
  headerRow.eachCell((cell, col) => {
    const h = norm(cellText(cell.value));
    for (const [field, names] of Object.entries(HEADERS)) {
      if (!columns[field] && names.includes(h)) columns[field] = col;
    }
  });

  const errors = [];
  if (!columns.date) errors.push('No "Date" column found in the first row.');
  if (!columns.verse_tamil && !columns.verse_english) errors.push('No verse column found ("Tamil Verse" or "English Verse").');
  if (errors.length) return { rows: [], errors };

  const rows = [];
  const seen = new Set();
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const get = (field) => (columns[field] ? cellText(row.getCell(columns[field]).value) : '');
    const rawDate = get('date');
    if (!rawDate && !get('verse_tamil') && !get('verse_english')) return; // blank line

    const date = toIsoDate(rawDate);
    if (!date) {
      errors.push(`Row ${rowNumber}: couldn't read the date "${rawDate}".`);
      return;
    }
    if (seen.has(date)) {
      errors.push(`Row ${rowNumber}: ${date} appears more than once; only the first is used.`);
      return;
    }
    const item = { date };
    for (const field of Object.keys(HEADERS)) {
      if (field !== 'date') item[field] = String(get(field) || '').trim();
    }
    if (!item.verse_tamil && !item.verse_english) {
      errors.push(`Row ${rowNumber} (${date}): the verse is empty.`);
      return;
    }
    item.theme = item.theme.toLowerCase();
    if (item.theme && ![...THEMES, 'photo'].includes(item.theme)) {
      errors.push(`Row ${rowNumber} (${date}): unknown theme "${item.theme}", using automatic.`);
      item.theme = '';
    }
    seen.add(date);
    rows.push(item);
  });

  return { rows, errors };
}
