// Creates public/sample/devotions-template.xlsx, the template linked from the upload page.
import ExcelJS from 'exceljs';

const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet('Devotions');
ws.columns = [
  { header: 'Date', key: 'date', width: 13, style: { numFmt: 'dd/mm/yyyy' } },
  { header: 'Tamil Verse', key: 'ta', width: 60 },
  { header: 'Tamil Reference', key: 'taRef', width: 18 },
  { header: 'English Verse', key: 'en', width: 60 },
  { header: 'English Reference', key: 'enRef', width: 18 },
  { header: 'Caption', key: 'caption', width: 30 },
  { header: 'Theme', key: 'theme', width: 10 },
  { header: 'Background', key: 'bg', width: 30 },
];
ws.getRow(1).font = { bold: true };
ws.addRow({
  date: new Date(Date.UTC(2026, 10, 1)),
  ta: 'கர்த்தர் என் மேய்ப்பராயிருக்கிறார்; நான் தாழ்ச்சியடையேன்.',
  taRef: 'சங்கீதம் 23:1',
  en: 'The Lord is my shepherd, I lack nothing.',
  enRef: 'Psalm 23:1',
});
ws.addRow({
  date: new Date(Date.UTC(2026, 10, 2)),
  ta: 'என்னைப் பெலப்படுத்துகிற கிறிஸ்துவினாலே எல்லாவற்றையும் செய்ய எனக்குப் பெலனுண்டு.',
  taRef: 'பிலிப்பியர் 4:13',
  en: 'I can do all this through him who gives me strength.',
  enRef: 'Philippians 4:13',
  theme: 'cream',
});
ws.views = [{ state: 'frozen', ySplit: 1 }];
await wb.xlsx.writeFile('public/sample/devotions-template.xlsx');
console.log('Wrote public/sample/devotions-template.xlsx');
