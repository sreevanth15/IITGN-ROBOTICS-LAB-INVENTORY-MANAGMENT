#!/usr/bin/env node
const { db, dbPromise } = require('../db');

function usage() {
  console.log('Usage: node transfer_reserve_to_in_circulation.js --all | --location <loc> | --product-ids <id,id> [--amount <n|all>] [--dry-run]');
  console.log('Examples:');
  console.log('  node transfer_reserve_to_in_circulation.js --all');
  console.log('  node transfer_reserve_to_in_circulation.js --location "Shelf A" --dry-run');
  console.log('  node transfer_reserve_to_in_circulation.js --product-ids 12,14 --amount 5');
  process.exit(0);
}

const argv = process.argv.slice(2);
if (argv.length === 0) usage();

const opts = { all: false, location: null, productIds: null, dryRun: false, amount: null };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--all') opts.all = true;
  else if (a === '--location' && argv[i+1]) { opts.location = argv[++i]; }
  else if (a === '--product-ids' && argv[i+1]) { opts.productIds = argv[++i].split(',').map(x => parseInt(x, 10)).filter(Boolean); }
  else if (a === '--dry-run') opts.dryRun = true;
  else if (a === '--amount' && argv[i+1]) { opts.amount = argv[++i]; if (opts.amount !== 'all') opts.amount = Number(opts.amount); }
  else usage();
}

if (!opts.all && !opts.location && !opts.productIds) {
  console.error('Error: must specify --all, --location, or --product-ids');
  usage();
}

(async () => {
  try {
    let where = 'i.quantity_in_stock > 0';
    const params = [];
    if (opts.productIds) {
      where += ' AND p.product_id IN (' + opts.productIds.map(() => '?').join(',') + ')';
      params.push(...opts.productIds);
    }
    if (opts.location) {
      where += ' AND p.location = ?';
      params.push(opts.location);
    }

    const sql = `
      SELECT p.product_id, p.product_name, p.location,
             COALESCE(i.quantity_in_stock,0) AS quantity_in_stock,
             COALESCE(i.quantity_in_use,0) AS quantity_in_use
      FROM products p
      JOIN inventory_status i ON p.product_id = i.product_id
      WHERE ${where}
      ORDER BY p.product_id`;

    const products = await dbPromise.all(sql, params);
    if (!products || products.length === 0) {
      console.log('No products matched the filter (or no reserve stock).');
      process.exit(0);
    }

    let movedCount = 0;
    let movedTotal = 0;
    const details = [];

    for (const p of products) {
      const avail = p.quantity_in_stock || 0;
      if (avail <= 0) continue;
      let moveQty;
      if (opts.amount === null || opts.amount === 'all') moveQty = avail;
      else moveQty = Math.min(avail, Number(opts.amount));
      if (moveQty <= 0) continue;

      if (opts.dryRun) {
        details.push({ product_id: p.product_id, product_name: p.product_name, location: p.location, from: avail, move: moveQty });
        movedCount++;
        movedTotal += moveQty;
        continue;
      }

      // execute transactional move
      await dbPromise.run('BEGIN TRANSACTION;');
      try {
        await dbPromise.run('UPDATE inventory_status SET quantity_in_stock = quantity_in_stock - ?, quantity_in_use = quantity_in_use + ?, last_updated = CURRENT_TIMESTAMP WHERE product_id = ?', [moveQty, moveQty, p.product_id]);
        await dbPromise.run(
          `INSERT INTO transaction_history (transaction_type, product_id, quantity_change, performed_by_user_id, reference_id, reference_type, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          ['TRANSFER_RESERVE_OUT', p.product_id, -moveQty, null, p.product_id, 'TRANSFER', `Moved ${moveQty} from reserve to in_circulation (location: ${p.location})`]
        );
        await dbPromise.run(
          `INSERT INTO transaction_history (transaction_type, product_id, quantity_change, performed_by_user_id, reference_id, reference_type, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          ['TRANSFER_IN_CIRCULATION', p.product_id, moveQty, null, p.product_id, 'TRANSFER', `Moved ${moveQty} from reserve to in_circulation (location: ${p.location})`]
        );
        await dbPromise.run('COMMIT;');
        movedCount++;
        movedTotal += moveQty;
        details.push({ product_id: p.product_id, product_name: p.product_name, location: p.location, from: avail, moved: moveQty });
      } catch (err) {
        await dbPromise.run('ROLLBACK;');
        console.error(`Failed for product ${p.product_id} - ${p.product_name}:`, err.message);
      }
    }

    console.log(`Operation complete. Products touched: ${movedCount}, Total moved: ${movedTotal}`);
    if (opts.dryRun) {
      console.log('Dry run details:');
      details.forEach(d => console.log(d));
    } else {
      console.log('Sample of changes:');
      details.slice(0, 20).forEach(d => console.log(d));
    }
    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(2);
  }
})();
