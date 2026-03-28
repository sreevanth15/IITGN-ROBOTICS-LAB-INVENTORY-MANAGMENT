const { dbPromise } = require('../db');

async function inspect(issueId) {
  try {
    const issue = await dbPromise.get('SELECT * FROM issues WHERE issue_id = ?', [issueId]);
    console.log('Issue:', issue);
    if (!issue) return;
    const returns = await dbPromise.get('SELECT COALESCE(SUM(quantity_returned),0) as returned FROM returns WHERE issue_id = ?', [issueId]);
    console.log('Total returned for issue:', returns.returned);
    const product = await dbPromise.get('SELECT * FROM products WHERE product_id = ?', [issue.product_id]);
    console.log('Product:', product);
    const inv = await dbPromise.get('SELECT * FROM inventory_status WHERE product_id = ?', [issue.product_id]);
    console.log('Inventory status:', inv);
  } catch (err) {
    console.error('Error inspecting:', err.message);
    process.exit(1);
  }
}

const id = process.argv[2] ? parseInt(process.argv[2], 10) : 78;
inspect(id).then(()=>process.exit(0));
