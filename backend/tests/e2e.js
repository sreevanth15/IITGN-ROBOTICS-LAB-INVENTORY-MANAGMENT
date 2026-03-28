const fs = require('fs');

const BASE = process.env.BASE_URL || 'http://localhost:3000/api';

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch (e) { body = text; }
  return { status: res.status, body };
}

async function run() {
  const results = {};

  // 1. Create product
  const prodPayload = {
    product_name: 'E2E Test Item',
    description: 'End-to-end test item',
    category: 'Tools',
    location: 'Test Lab',
    quantity_in_stock: 5,
    quantity_in_use: 2
  };
  results.create = await req('/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prodPayload) });
  if (!results.create.body || !results.create.body.product_id) {
    fs.writeFileSync('e2e-result.json', JSON.stringify({ error: 'Create product failed', results }, null, 2));
    console.error('Create product failed', results.create);
    process.exit(1);
  }
  const productId = results.create.body.product_id;
  results.productId = productId;

  // 2. Checkout from reserve_stock (stock -> in_use)
  const issue1 = { items: [ { product_id: productId, quantity: 2, source: 'reserve_stock' } ], user_name: 'E2E', user_email: 'e2e@test', purpose: 'E2E' };
  results.checkout1 = await req('/issues', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(issue1) });

  // 3. Inventory report
  results.report1 = await req('/report/inventory');

  // 4. Checkout from in_circulation (in_use -> stock)
  const issue2 = { items: [ { product_id: productId, quantity: 1, source: 'in_circulation' } ], user_name: 'E2E', user_email: 'e2e@test', purpose: 'E2E' };
  results.checkout2 = await req('/issues', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(issue2) });

  // 5. Inventory report
  results.report2 = await req('/report/inventory');

  // 6. Return the first issue if created
  const issueId1 = results.checkout1.body && results.checkout1.body.issued_items && results.checkout1.body.issued_items[0] && results.checkout1.body.issued_items[0].issue_id;
  if (issueId1) {
    const ret = { issue_id: issueId1, quantity_returned: 2, condition: 'good', notes: 'e2e return' };
    results.return1 = await req('/returns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ret) });
  }

  // 7. Final report
  results.finalReport = await req('/report/inventory');

  // 8. Cleanup product
  results.delete = await req('/products', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product_id: productId }) });

  fs.writeFileSync('e2e-result.json', JSON.stringify(results, null, 2));
  console.log('E2E finished, results written to e2e-result.json');
}

run().catch(err => {
  console.error('E2E script error', err);
  fs.writeFileSync('e2e-result.json', JSON.stringify({ error: err.message }, null, 2));
  process.exit(1);
});
