const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database/inventory.db');

const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Failed to open DB:', err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  db.get(`SELECT COALESCE(SUM(quantity_in_stock),0) AS sum_stock, COALESCE(SUM(quantity_in_use),0) AS sum_use FROM inventory_status`, (err, row) => {
    if (err) {
      console.error('Query error:', err.message);
      process.exit(1);
    }
    console.log('SUM(quantity_in_stock):', row.sum_stock);
    console.log('SUM(quantity_in_use):', row.sum_use);
  });

  console.log('Sample products (latest 20):');
  db.all(`SELECT p.product_id, p.product_name, p.location, i.quantity_in_stock, i.quantity_in_use FROM products p JOIN inventory_status i ON p.product_id = i.product_id ORDER BY p.product_id DESC LIMIT 20`, [], (err, rows) => {
    if (err) {
      console.error('Query error:', err.message);
      process.exit(1);
    }
    rows.forEach(r => console.log(r));
    db.close();
  });
});
