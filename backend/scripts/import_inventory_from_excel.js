#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const { db, dbPromise } = require('../db');

const argv = process.argv.slice(2);
if (!argv[0]) {
    console.error('Usage: node import_inventory_from_excel.js <file.xlsx> [--sheet SheetName] [--addedBy "Name"]');
    process.exit(1);
}

const filePath = path.resolve(argv[0]);
let sheetName = null;
let addedBy = 'importer';

for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--sheet' && argv[i+1]) { sheetName = argv[i+1]; i++; }
    else if (argv[i] === '--addedBy' && argv[i+1]) { addedBy = argv[i+1]; i++; }
}

if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(1);
}

console.log('Reading workbook:', filePath);
const workbook = XLSX.readFile(filePath);
const wsName = sheetName || workbook.SheetNames[0];
if (!wsName) {
    console.error('No sheets found in workbook');
    process.exit(1);
}

const worksheet = workbook.Sheets[wsName];
const rows = XLSX.utils.sheet_to_json(worksheet, { defval: null });

if (!rows || rows.length === 0) {
    console.log('No rows to import');
    process.exit(0);
}

// Helper to map header keys
function buildKeyMap(sampleRow) {
    const map = {};
    Object.keys(sampleRow).forEach(raw => {
        const k = raw.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
        map[k] = raw;
    });
    return map;
}

function getVal(row, keyMap, candidates) {
    for (const c of candidates) {
        const nk = c.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (nk in keyMap) return row[keyMap[nk]];
    }
    return null;
}

const candidates = {
    product_name: ['productname','product','item','name'],
    description: ['description','desc','details'],
    category: ['category','cat'],
    unit: ['unit','uom'],
    location: ['location','shelf','shelflocation','shelfno','shelfnumber'],
    quantity_in_stock: ['quantity','qty','quantityinstock','instock','stock','count'],
    quantity_in_use: ['quantityinuse','inuse','incirculation','circulation'],
    quantity_total: ['quantitytotal','total','qtytotal']
};

async function upsertRow(row, keyMap) {
    const rawName = getVal(row, keyMap, candidates.product_name);
    const product_name = rawName ? String(rawName).trim() : null;
    if (!product_name) {
        throw new Error('Missing product name');
    }
    const description = getVal(row, keyMap, candidates.description) || '';
    const category = getVal(row, keyMap, candidates.category) || '';
    const unit = getVal(row, keyMap, candidates.unit) || '';
    const location = (getVal(row, keyMap, candidates.location) || '') || '';

    const rawStock = getVal(row, keyMap, candidates.quantity_in_stock);
    const rawUse = getVal(row, keyMap, candidates.quantity_in_use);
    const rawTotal = getVal(row, keyMap, candidates.quantity_total);

    const quantity_in_stock = rawStock !== null && rawStock !== '' ? Number(rawStock) : null;
    const quantity_in_use = rawUse !== null && rawUse !== '' ? Number(rawUse) : null;
    const quantity_total = rawTotal !== null && rawTotal !== '' ? Number(rawTotal) : null;

    // Check existing product by name+location
    const existing = await dbPromise.get('SELECT * FROM products WHERE product_name = ? AND location = ? LIMIT 1', [product_name, location]);
    if (existing) {
        await dbPromise.run('UPDATE products SET description = ?, category = ?, unit = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?', [description, category, unit, existing.product_id]);
        const inv = await dbPromise.get('SELECT * FROM inventory_status WHERE product_id = ?', [existing.product_id]);
        if (inv) {
            const stock = quantity_in_stock !== null ? quantity_in_stock : (inv.quantity_in_stock || 0);
            const use = quantity_in_use !== null ? quantity_in_use : (inv.quantity_in_use || 0);
            const total = quantity_total !== null ? quantity_total : (stock + use);
            await dbPromise.run('UPDATE inventory_status SET quantity_in_stock = ?, quantity_in_use = ?, quantity_total = ?, last_updated = CURRENT_TIMESTAMP WHERE product_id = ?', [stock, use, total, existing.product_id]);
        } else {
            const stock = quantity_in_stock || 0;
            const use = quantity_in_use || 0;
            const total = quantity_total || (stock + use);
            await dbPromise.run('INSERT INTO inventory_status (product_id, quantity_in_stock, quantity_in_use, quantity_total) VALUES (?, ?, ?, ?)', [existing.product_id, stock, use, total]);
        }
        return { action: 'updated', product_id: existing.product_id };
    } else {
        const result = await dbPromise.run('INSERT INTO products (product_name, description, category, unit, location, added_by) VALUES (?, ?, ?, ?, ?, ?)', [product_name, description, category, unit, location, addedBy]);
        const product_id = result.id;
        const stock = quantity_in_stock || 0;
        const use = quantity_in_use || 0;
        const total = quantity_total || (stock + use);
        await dbPromise.run('INSERT INTO inventory_status (product_id, quantity_in_stock, quantity_in_use, quantity_total) VALUES (?, ?, ?, ?)', [product_id, stock, use, total]);
        await dbPromise.run('INSERT INTO transaction_history (transaction_type, product_id, quantity_change, performed_by_user_id, reference_id, reference_type, notes) VALUES (?, ?, ?, ?, ?, ?, ?)', ['PRODUCT_ADD', product_id, stock, null, product_id, 'PRODUCT', `Imported product ${product_name}`]);
        return { action: 'inserted', product_id };
    }
}

(async () => {
    const keyMap = buildKeyMap(rows[0]);
    let inserted = 0, updated = 0, skipped = 0, errors = 0;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
            const res = await upsertRow(row, keyMap);
            if (res.action === 'inserted') inserted++;
            else if (res.action === 'updated') updated++;
        } catch (err) {
            errors++;
            console.error(`Row ${i+1} skipped: ${err.message}`);
        }
    }

    console.log(`Import complete. Inserted: ${inserted}, Updated: ${updated}, Errors: ${errors}`);
    process.exit(0);
})();
