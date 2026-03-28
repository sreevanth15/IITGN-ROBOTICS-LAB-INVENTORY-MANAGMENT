const request = require('supertest');
const { expect } = require('chai');
const app = require('../server');

describe('API Checkout/Return Flows (E2E-like)', function() {
  this.timeout(5000);
  let productId, issueId1;

  it('creates a test product', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ product_name: 'Test API Item', description: 'test', category: 'Tools', location: 'Lab', quantity_in_stock: 5, quantity_in_use: 2 });
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('product_id');
    productId = res.body.product_id;
  });

  it('issues from reserve_stock (decrements quantity_in_stock)', async () => {
    const res = await request(app)
      .post('/api/issues')
      .send({ items: [{ product_id: productId, quantity: 2, source: 'reserve_stock' }], user_name: 'Tester', user_email: 't@test' });
    expect(res.status).to.equal(200);
    expect(res.body.issued_items).to.be.an('array');
    issueId1 = res.body.issued_items[0].issue_id;

    const report = await request(app).get('/api/report/inventory');
    const item = report.body.data.find(i => i.product_id === productId);
    expect(item.quantity_in_stock).to.equal(3);
  });

  it('issues from in_circulation (decrements quantity_in_use)', async () => {
    const res = await request(app)
      .post('/api/issues')
      .send({ items: [{ product_id: productId, quantity: 1, source: 'in_circulation' }], user_name: 'Tester', user_email: 't@test' });
    expect(res.status).to.equal(200);
    const report = await request(app).get('/api/report/inventory');
    const item = report.body.data.find(i => i.product_id === productId);
    expect(item.quantity_in_use).to.equal(3);
  });

  it('returns items to original source', async () => {
    const res = await request(app)
      .post('/api/returns')
      .send({ issue_id: issueId1, quantity_returned: 2, condition: 'good' });
    expect(res.status).to.equal(200);
    const report = await request(app).get('/api/report/inventory');
    const item = report.body.data.find(i => i.product_id === productId);
    // After returning 2 to reserve_stock, stock should be back to 5
    expect(item.quantity_in_stock).to.equal(5);
  });

  it('cleans up the test product', async () => {
    const res = await request(app)
      .delete('/api/products')
      .send({ product_id: productId });
    expect(res.status).to.equal(200);
  });
});
