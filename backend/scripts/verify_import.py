#!/usr/bin/env python3
import os
import sqlite3
import sys

DB_PATH = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..', 'database', 'inventory.db'))

if not os.path.exists(DB_PATH):
    print('DB not found:', DB_PATH)
    sys.exit(2)

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

prod_count = cur.execute('SELECT COUNT(*) FROM products').fetchone()[0]
inv_count = cur.execute('SELECT COUNT(*) FROM inventory_status').fetchone()[0]

print('products_count:', prod_count)
print('inventory_status_count:', inv_count)
print('sample (latest 20 products):')
for row in cur.execute('SELECT product_id, product_name, location FROM products ORDER BY product_id DESC LIMIT 20'):
    print(row)

conn.close()
