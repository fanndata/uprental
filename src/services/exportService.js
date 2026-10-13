const { stringify } = require('csv-stringify/sync');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

function formatDate(value) {
  if (value == null) return '';
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    const hh = String(value.getHours()).padStart(2, '0');
    const mm = String(value.getMinutes()).padStart(2, '0');
    const ss = String(value.getSeconds()).padStart(2, '0');
    if (hh === '00' && mm === '00' && ss === '00') return `${y}-${m}-${d}`;
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  }
  return String(value);
}

function mapRentals(rows) {
  return rows.map((r) => ({
    id: r.id,
    car: `${r.brand} ${r.model}`,
    plate: r.plate_number,
    client: r.client_name,
    start_date: formatDate(r.start_date),
    end_date: formatDate(r.end_date),
    status: r.status,
    total_price: r.total_price,
    deposit: r.deposit,
    created_at: formatDate(r.created_at),
  }));
}

function toCsv(rows) {
  const data = mapRentals(rows);
  return stringify(data, {
    header: true,
    columns: [
      'id',
      'car',
      'plate',
      'client',
      'start_date',
      'end_date',
      'status',
      'total_price',
      'deposit',
      'created_at',
    ],
  });
}

async function toExcel(rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Rentals');
  sheet.columns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: 'Авто', key: 'car', width: 22 },
    { header: 'Номер', key: 'plate', width: 12 },
    { header: 'Клиент', key: 'client', width: 22 },
    { header: 'Начало', key: 'start_date', width: 14 },
    { header: 'Конец', key: 'end_date', width: 14 },
    { header: 'Статус', key: 'status', width: 12 },
    { header: 'Сумма', key: 'total_price', width: 12 },
    { header: 'Депозит', key: 'deposit', width: 12 },
    { header: 'Создано', key: 'created_at', width: 20 },
  ];
  mapRentals(rows).forEach((row) => sheet.addRow(row));
  return workbook.xlsx.writeBuffer();
}

function toPdf(rows) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(16).text('Отчёт по арендам автомобилей', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10);

    if (!rows.length) {
      doc.text('Нет данных для выгрузки.');
    } else {
      rows.forEach((r) => {
        doc.text(
          `#${r.id} | ${r.brand} ${r.model} (${r.plate_number}) | ${r.client_name} | ${r.start_date} — ${r.end_date} | ${r.status} | ${r.total_price} руб.`
        );
        doc.moveDown(0.4);
      });
    }

    doc.end();
  });
}

module.exports = { toCsv, toExcel, toPdf };
