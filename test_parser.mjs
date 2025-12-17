import Papa from 'papaparse';

function parseDirectoryCsv(csvText) {
  const parseResult = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (parseResult.errors.length > 0) {
    const error = parseResult.errors[0];
    throw new Error(`CSV parsing error: ${error.message}`);
  }

  const data = parseResult.data;
  if (data.length === 0) throw new Error("CSV must include 'email' header");

  const firstRow = data[0];
  const headers = Object.keys(firstRow).map((h) => h.toLowerCase());
  if (!headers.includes('email')) {
    throw new Error("CSV must include 'email' header");
  }

  const rows = data.map((row, idx) => {
    const emailKey = Object.keys(row).find((k) => k.toLowerCase() === 'email');
    const typeKey = Object.keys(row).find((k) => k.toLowerCase() === 'contact_type');

    return {
      email: emailKey ? (row[emailKey] ?? '').trim() : '',
      contact_type: typeKey ? (row[typeKey] ?? '').trim() || 'parent_guardian' : 'parent_guardian',
      rowNumber: idx + 2,
    };
  });

  return { rows, rowCount: rows.length };
}

console.log('=== Test: CSV with commas in quoted fields ===');
const csv1 = `email,contact_type
"john.doe@example.com","parent, guardian"
"jane.smith@test.com","teacher, staff"`;

const result1 = parseDirectoryCsv(csv1);
console.log('✓ Parsed successfully:', result1.rowCount, 'rows');
console.log('  Row 1 email:', result1.rows[0].email);
console.log('  Row 1 type:', result1.rows[0].contact_type);
console.log('  Row 2 type:', result1.rows[1].contact_type);

if (result1.rows[0].contact_type === 'parent, guardian') {
  console.log('✓ SUCCESS: Comma in field preserved correctly!');
} else {
  console.log('✗ FAIL: Comma not preserved');
}

console.log('\n=== Test: CSV with only email column ===');
const csv2 = `email
user1@example.com`;
const result2 = parseDirectoryCsv(csv2);
console.log('✓ Parsed successfully');
console.log('  Default type:', result2.rows[0].contact_type);
if (result2.rows[0].contact_type === 'parent_guardian') {
  console.log('✓ SUCCESS: Default contact_type applied!');
}
