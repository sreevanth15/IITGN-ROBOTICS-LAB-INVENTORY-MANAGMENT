const fs = require('fs');
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
  try{
    server = app.listen(0, () => {});
    await new Promise(resolve => setTimeout(resolve, 50));
    const port = server.address().port;
    globalThis.BASE = `http://localhost:${port}/api`;

    console.log('Server for test started on port', port);

    // Create product with explicit total
    const create = await post('/products', { product_name: 'TotalTest', category: 'Electronics', location: 'Lab', quantity_in_stock:2, quantity_in_use:3, quantity_total:5 });
    if (!create.body.product_id) throw new Error('Create failed');
    const pid = create.body.product_id;
    console.log('Created product id', pid);

    // Initial report
    const report1 = await get('/report/inventory');
    const item1 = report1.body.data.find(i=>i.product_id===pid);
    console.log('Initial:', item1);
    if (item1.quantity_total !== 5) throw new Error('Initial total mismatch');

    // Issue from reserve_stock
    const issue1 = await post('/issues', { items:[{ product_id: pid, quantity:1, source:'reserve_stock' }], user_name:'Test', user_email:'t@test' });
    if (!issue1.body.success) throw new Error('Issue failed');
    console.log('Issued 1 from reserve');

    const report2 = await get('/report/inventory');
    const item2 = report2.body.data.find(i=>i.product_id===pid);
    console.log('After issue:', item2);
    if (item2.quantity_in_stock !== 1) throw new Error('Stock not decremented correctly');
    if (item2.quantity_total !== 5) throw new Error('Total changed on issue');

    console.log('Test passed: quantity_total preserved on issue');

    // Cleanup
    await fetch(globalThis.BASE + '/products', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ product_id: pid }) });
    server.close();
  }catch(err){
    console.error('Test failed:', err.message);
    if (server) server.close();
    process.exit(1);
  }
}

run();
