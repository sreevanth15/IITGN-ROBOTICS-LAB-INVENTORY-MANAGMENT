const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database/inventory.db');
const issueId = process.argv[2] ? parseInt(process.argv[2], 10) : 78;

const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Failed to open DB:', err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  db.get('SELECT * FROM issues WHERE issue_id = ?', [issueId], (err, issue) => {
    if (err) { console.error('Issue query error:', err.message); return; }
    console.log('Issue:', issue);
    if (!issue) return;

    db.get('SELECT COALESCE(SUM(quantity_returned),0) as returned FROM returns WHERE issue_id = ?', [issueId], (err2, retRow) => {
      if (err2) { console.error('Returns query error:', err2.message); return; }
      console.log('Total returned for issue:', retRow.returned);

      db.get('SELECT * FROM products WHERE product_id = ?', [issue.product_id], (err3, prod) => {
        if (err3) { console.error('Product query error:', err3.message); return; }
        console.log('Product:', prod);

        db.get('SELECT * FROM inventory_status WHERE product_id = ?', [issue.product_id], (err4, inv) => {
          if (err4) { console.error('Inventory query error:', err4.message); return; }
          console.log('Inventory status:', inv);
          db.close();
        });
      });
    });
  });
});
