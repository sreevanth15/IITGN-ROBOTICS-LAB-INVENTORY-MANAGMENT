const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database/inventory.db');

const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Failed to open DB:', err.message);
    process.exit(1);
  }
});

const productId = process.argv[2] ? parseInt(process.argv[2], 10) : null;

const queryAll = `
SELECT p.product_id, p.product_name, p.category,
       COALESCE(i.quantity_in_stock,0) AS quantity_in_stock,
       COALESCE(i.quantity_in_use,0) AS quantity_in_use,
       COALESCE(i.quantity_total,0) AS quantity_total
FROM products p
LEFT JOIN inventory_status i ON p.product_id = i.product_id
ORDER BY p.product_id;
`;

const queryOne = `
SELECT p.product_id, p.product_name, p.category,
       COALESCE(i.quantity_in_stock,0) AS quantity_in_stock,
       COALESCE(i.quantity_in_use,0) AS quantity_in_use,
       COALESCE(i.quantity_total,0) AS quantity_total
FROM products p
LEFT JOIN inventory_status i ON p.product_id = i.product_id
WHERE p.product_id = ?
LIMIT 1;
`;

const out = (row) => {
  if (!row) {
    console.log('No product found');
    process.exit(0);
  }
  console.log('Product ID\tProduct Name\tCategory\tReserve Stock\tIn Circulation\tTotal');
  console.log(`#${row.product_id}\t${row.product_name}\t${row.category}\t${row.quantity_in_stock}\t${row.quantity_in_use}\t${row.quantity_total}`);
};

if (productId) {
  db.get(queryOne, [productId], (err, row) => {
    if (err) {
      console.error('Query error:', err.message);
      process.exit(1);
    }
    out(row);
    db.close();
  });
} else {
  db.all(queryAll, [], (err, rows) => {
    if (err) {
      console.error('Query error:', err.message);
      process.exit(1);
    }
    console.log('Product ID\tProduct Name\tCategory\tReserve Stock\tIn Circulation\tTotal');
    rows.forEach(row => {
      console.log(`#${row.product_id}\t${row.product_name}\t${row.category}\t${row.quantity_in_stock}\t${row.quantity_in_use}\t${row.quantity_total}`);
    });
    db.close();
  });
}
