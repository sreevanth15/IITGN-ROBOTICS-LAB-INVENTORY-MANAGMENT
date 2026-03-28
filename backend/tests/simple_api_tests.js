const fs = require('fs');
// dynamic base resolved at runtime
const app = require('../server');

let server = null;

async function post(path, body){
  const base = (globalThis.BASE && globalThis.BASE !== 'null') ? globalThis.BASE : ((process.env.BASE_URL && process.env.BASE_URL !== 'null') ? process.env.BASE_URL : 'http://localhost:3000/api');
  const res = await fetch(base + path, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body) });
  const json = await res.json();
  return { status: res.status, body: json };
}

async function get(path){
  const base = (globalThis.BASE && globalThis.BASE !== 'null') ? globalThis.BASE : ((process.env.BASE_URL && process.env.BASE_URL !== 'null') ? process.env.BASE_URL : 'http://localhost:3000/api');
  const res = await fetch(base + path);
  const json = await res.json();
  return { status: res.status, body: json };
}

async function run(){
  const out = { ok:true, steps: [] };
  try{
    // Start temporary server on random available port
    await new Promise(resolve => { server = app.listen(0, () => resolve()); });
    const port = server.address().port;
    globalThis.BASE = `http://localhost:${port}/api`;
    console.log('Test server started on port', port);
    // Create product
    const create = await post('/products', { product_name: 'SimpleTest', category: 'Tools', location: 'Lab', quantity_in_stock:5, quantity_in_use:2 });
    out.steps.push({ create });
    if (!create.body.product_id) throw new Error('Create failed');
    const pid = create.body.product_id;

    // Issue from reserve_stock
    const issue1 = await post('/issues', { items:[{ product_id: pid, quantity:2, source:'reserve_stock' }], user_name:'Simple', user_email:'s@t' });
    out.steps.push({ issue1 });
    if (!issue1.body.success) throw new Error('Issue1 failed');

    // Report
    const report1 = await get('/report/inventory');
    out.steps.push({ report1 });
    const item1 = report1.body.data.find(i=>i.product_id===pid);
    if (item1.quantity_in_stock !== 3) throw new Error('stock not decremented correctly');

    // Issue from in_circulation
    const issue2 = await post('/issues', { items:[{ product_id: pid, quantity:1, source:'in_circulation' }], user_name:'Simple', user_email:'s@t' });
    out.steps.push({ issue2 });
    const report2 = await get('/report/inventory');
    const item2 = report2.body.data.find(i=>i.product_id===pid);
    // in_circulation should decrement only quantity_in_use: initial 2 -> 1
    if (item2.quantity_in_use !== 1) throw new Error('in_use not decremented correctly');

    // Return
    const issueId = issue1.body.issued_items && issue1.body.issued_items[0] && issue1.body.issued_items[0].issue_id;
    const ret = await post('/returns', { issue_id: issueId, quantity_returned:2 });
    out.steps.push({ ret });
    const final = await get('/report/inventory');
    const itemFinal = final.body.data.find(i=>i.product_id===pid);
    if (itemFinal.quantity_in_stock !== 5) throw new Error('return did not restore stock');

    // Cleanup
    const baseCleanup = (globalThis.BASE && globalThis.BASE !== 'null') ? globalThis.BASE : ((process.env.BASE_URL && process.env.BASE_URL !== 'null') ? process.env.BASE_URL : 'http://localhost:3000/api');
    const del = await fetch(baseCleanup + '/products', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ product_id: pid }) });
    out.steps.push({ del: del.status });

    fs.writeFileSync('simple-api-result.json', JSON.stringify(out, null, 2));
    console.log('Simple API tests passed');
    await new Promise(resolve => server.close(resolve));
  }catch(err){
    out.ok = false; out.error = err.message; fs.writeFileSync('simple-api-result.json', JSON.stringify(out, null, 2));
    console.error('Simple API tests failed:', err.message);
    if (server) await new Promise(resolve => server.close(resolve));
    process.exit(1);
  }
}

run();
