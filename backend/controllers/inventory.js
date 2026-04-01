const { db, dbPromise } = require('../db');
const bcrypt = require('bcryptjs');

// Authentication Controllers
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }
        
        const user = await dbPromise.get(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        // For demo: direct password comparison (consider using bcrypt in production)
        if (user.password !== password) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        res.json({
            success: true,
            message: 'Login successful',
            user: {
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                role: user.role
            }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: err.message
        });
    }
};

// Product Controllers
exports.getAllProducts = async (req, res) => {
    try {
        const products = await dbPromise.all(`
            SELECT p.*,
                   COALESCE(i.quantity_in_use, 0) AS quantity_in_use,
                   COALESCE(i.quantity_in_stock, 0) AS quantity_in_stock,
                   COALESCE(i.quantity_total, 0) AS quantity_total,
                       p.added_by,
                       (
                           SELECT u.full_name
                           FROM transaction_history th
                           JOIN users u ON u.user_id = th.performed_by_user_id
                           WHERE th.transaction_type = 'PRODUCT_ADD' AND th.reference_id = p.product_id
                           LIMIT 1
                       ) AS added_by_full_name,
                       (
                           SELECT u.username
                           FROM transaction_history th
                           JOIN users u ON u.user_id = th.performed_by_user_id
                           WHERE th.transaction_type = 'PRODUCT_ADD' AND th.reference_id = p.product_id
                           LIMIT 1
                       ) AS added_by_username
            FROM products p
            LEFT JOIN inventory_status i ON p.product_id = i.product_id
            ORDER BY p.product_id DESC
        `);
        
        res.json({
            success: true,
            data: products
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Error fetching products',
            error: err.message
        });
    }
};

exports.addProduct = async (req, res) => {
    try {
        const { product_name, description, category, location, quantity_in_stock, quantity_in_use, quantity_total, user_id, added_by } = req.body;

        // Require added_by to be provided
        if (!product_name || !category || !added_by || (typeof added_by === 'string' && added_by.trim() === '')) {
            return res.status(400).json({
                success: false,
                message: 'Product name, category and Added By are required'
            });
        }

        // Insert product including added_by
        const result = await dbPromise.run(
            `INSERT INTO products (product_name, description, category, location, added_by) 
             VALUES (?, ?, ?, ?, ?)`,
            [product_name, description, category, location, added_by]
        );

        const product_id = result.id;

        // Initialize inventory status with both in_stock and in_use quantities
        const stock = quantity_in_stock || 0;
        const use = quantity_in_use || 0;
        const total = quantity_total || (stock + use);

        await dbPromise.run(
            `INSERT INTO inventory_status (product_id, quantity_in_stock, quantity_in_use, quantity_total) 
             VALUES (?, ?, ?, ?)`,
            [product_id, stock, use, total]
        );

        // Log transaction: product added (record who added)
        await dbPromise.run(
            `INSERT INTO transaction_history (transaction_type, product_id, quantity_change, performed_by_user_id, reference_id, reference_type, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            ['PRODUCT_ADD', product_id, stock, user_id || null, product_id, 'PRODUCT', `Product added: ${product_name}`]
        );

        res.json({
            success: true,
            message: 'Product added successfully',
            product_id: product_id
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Error adding product',
            error: err.message
        });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const { product_id, product_name, description, category, location, quantity_in_stock, quantity_in_use, quantity_total } = req.body;
        
        if (!product_id || !product_name || !category) {
            return res.status(400).json({
                success: false,
                message: 'Product ID, name, and category are required'
            });
        }
        
        // Update product
        await dbPromise.run(
            `UPDATE products SET product_name = ?, description = ?, category = ?, location = ?, updated_at = CURRENT_TIMESTAMP
             WHERE product_id = ?`,
            [product_name, description, category, location, product_id]
        );
        
        // Update inventory quantities if provided
        if (quantity_in_stock !== undefined || quantity_in_use !== undefined) {
            // Get current inventory status first (including total)
            const currentInventory = await dbPromise.get(
                'SELECT quantity_in_stock, quantity_in_use, quantity_total FROM inventory_status WHERE product_id = ?',
                [product_id]
            );

            // Old values for delta calculation
            const oldStock = currentInventory ? (currentInventory.quantity_in_stock || 0) : 0;
            const oldUse = currentInventory ? (currentInventory.quantity_in_use || 0) : 0;
            const oldTotal = currentInventory ? (currentInventory.quantity_total || 0) : 0;
            
            // Use provided values or keep current values
            const stockVal = quantity_in_stock !== undefined ? quantity_in_stock : oldStock;
            const useVal = quantity_in_use !== undefined ? quantity_in_use : oldUse;
            // Preserve existing quantity_total unless explicitly provided; when creating new record derive from stock+use
            const totalVal = quantity_total !== undefined ? quantity_total : (currentInventory ? oldTotal : (stockVal + useVal));
            
            // Update or create inventory_status if it doesn't exist
            if (currentInventory) {
                await dbPromise.run(
                    `UPDATE inventory_status 
                     SET quantity_in_stock = ?, quantity_in_use = ?, quantity_total = ?, last_updated = CURRENT_TIMESTAMP
                     WHERE product_id = ?`,
                    [stockVal, useVal, totalVal, product_id]
                );
            } else {
                await dbPromise.run(
                    `INSERT INTO inventory_status (product_id, quantity_in_stock, quantity_in_use, quantity_total)
                     VALUES (?, ?, ?, ?)`,
                    [product_id, stockVal, useVal, totalVal]
                );
            }

            // Log inventory changes if any
            const deltaStock = stockVal - oldStock;
            const deltaUse = useVal - oldUse;
            if (deltaStock !== 0) {
                await dbPromise.run(
                    `INSERT INTO transaction_history (transaction_type, product_id, quantity_change, performed_by_user_id, reference_id, reference_type, notes)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    ['PRODUCT_UPDATE_STOCK', product_id, deltaStock, null, product_id, 'PRODUCT', `Stock changed: ${oldStock} -> ${stockVal}`]
                );
            }
            if (deltaUse !== 0) {
                await dbPromise.run(
                    `INSERT INTO transaction_history (transaction_type, product_id, quantity_change, performed_by_user_id, reference_id, reference_type, notes)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    ['PRODUCT_UPDATE_USE', product_id, deltaUse, null, product_id, 'PRODUCT', `In-use changed: ${oldUse} -> ${useVal}`]
                );
            }
            const deltaTotal = totalVal - oldTotal;
            if (deltaTotal !== 0) {
                await dbPromise.run(
                    `INSERT INTO transaction_history (transaction_type, product_id, quantity_change, performed_by_user_id, reference_id, reference_type, notes)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    ['PRODUCT_UPDATE_TOTAL', product_id, deltaTotal, null, product_id, 'PRODUCT', `Total changed: ${oldTotal} -> ${totalVal}`]
                );
            }
        }
        
        res.json({
            success: true,
            message: 'Product updated successfully'
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Error updating product',
            error: err.message
        });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const { product_id } = req.body;
        
        if (!product_id) {
            return res.status(400).json({
                success: false,
                message: 'Product ID is required'
            });
        }
        
        // Log deletion before removing product (note: deleting product may cascade-remove history)
        await dbPromise.run(
            `INSERT INTO transaction_history (transaction_type, product_id, quantity_change, performed_by_user_id, reference_id, reference_type, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            ['PRODUCT_DELETE', product_id, 0, null, product_id, 'PRODUCT', `Product deleted: id ${product_id}`]
        );

        // Delete inventory status first
        await dbPromise.run(
            'DELETE FROM inventory_status WHERE product_id = ?',
            [product_id]
        );
        
        // Delete product
        await dbPromise.run(
            'DELETE FROM products WHERE product_id = ?',
            [product_id]
        );
        
        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Error deleting product',
            error: err.message
        });
    }
};

// Issue (Checkout) Controllers
exports.issueItem = async (req, res) => {
    try {
        const { items, user_name, user_email, purpose, user_id } = req.body;
        
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Items array is required'
            });
        }
        
        if (!user_name || !user_email) {
            return res.status(400).json({
                success: false,
                message: 'User name and email are required'
            });
        }

        // Require purpose for issuing items
        if (!purpose || (typeof purpose === 'string' && purpose.trim() === '')) {
            return res.status(400).json({
                success: false,
                message: 'Purpose is required when issuing items'
            });
        }
        
        // VALIDATE ALL ITEMS FIRST before processing any
        const itemsToProcess = [];
        for (const item of items) {
            const { product_id, quantity, source } = item;
            const checkoutSource = source || 'reserve_stock'; // default to reserve_stock
            
            // Skip invalid items
            if (!product_id || !quantity || quantity <= 0) {
                continue;
            }
            
            // Check current inventory
            const inventory = await dbPromise.get(
                'SELECT * FROM inventory_status WHERE product_id = ?',
                [product_id]
            );
            
            // Validate: Can only checkout from available stock in the specified source
            if (!inventory) {
                return res.status(400).json({
                    success: false,
                    message: `Product ID ${product_id} not found in inventory system`
                });
            }
            
            // Check availability based on requested source
            const availableQty = checkoutSource === 'in_circulation'
                ? (inventory.quantity_in_use || 0)
                : (inventory.quantity_in_stock || 0);

            if (availableQty < quantity) {
                const sourceLabel = checkoutSource === 'in_circulation' ? 'In Circulation' : 'Reserve Stock';
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for product ID ${product_id} in ${sourceLabel}. Available: ${availableQty}, Requested: ${quantity}`
                });
            }
            
            // If all validations pass, add to process list
            itemsToProcess.push({
                product_id,
                quantity,
                source: checkoutSource,
                inventory
            });
        }
        
        // Check if we have any valid items after filtering
        if (itemsToProcess.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid items to checkout'
            });
        }
        
        // NOW process all validated items
        const checkout_items = [];
        for (const item of itemsToProcess) {
            const { product_id, quantity, source } = item;
            
            // Create checkout record
            const checkoutResult = await dbPromise.run(
                `INSERT INTO issues (product_id, quantity_issued, issued_by_user_id, user_name, user_email, purpose, source)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [product_id, quantity, user_id || 0, user_name, user_email, purpose || 'General use', source]
            );
            
            // Update inventory based on source (decrement from the selected inventory)
            if (source === 'in_circulation') {
                await dbPromise.run(
                    `UPDATE inventory_status SET quantity_in_use = quantity_in_use - ? WHERE product_id = ?`,
                    [quantity, product_id]
                );
            } else {
                await dbPromise.run(
                    `UPDATE inventory_status SET quantity_in_stock = quantity_in_stock - ? WHERE product_id = ?`,
                    [quantity, product_id]
                );
            }

            // NOTE: Do not modify quantity_total on checkout — it represents the lab's owned total

            // Log transaction
            const sourceLabel = source === 'in_circulation' ? 'In Circulation' : 'Reserve Stock';
            await dbPromise.run(
                `INSERT INTO transaction_history (transaction_type, product_id, quantity_change, performed_by_user_id, reference_id, reference_type, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ['CHECKOUT', product_id, -quantity, user_id || 0, checkoutResult.id, 'CHECKOUT', `Checked out from ${sourceLabel} to: ${user_name}`]
            );
            
            checkout_items.push({
                issue_id: checkoutResult.id,
                product_id: product_id,
                quantity: quantity,
                source: source
            });
        }
        
        res.json({
            success: true,
            message: `${checkout_items.length} item(s) issued successfully`,
            issued_items: checkout_items
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Error issuing items',
            error: err.message
        });
    }
};

// Return Controllers
exports.returnItem = async (req, res) => {
    try {
        const { issue_id, quantity_returned, condition, notes, user_id } = req.body;

        if (!issue_id || !quantity_returned || quantity_returned <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Issue ID and valid quantity are required'
            });
        }

        // Get issue details
        const issue = await dbPromise.get(
            'SELECT * FROM issues WHERE issue_id = ?',
            [issue_id]
        );

        if (!issue) {
            return res.status(404).json({
                success: false,
                message: 'Issue not found'
            });
        }

        // Allow returning when status is 'issued' or 'partially_returned'
        if (!['issued', 'partially_returned'].includes(issue.status)) {
            return res.status(400).json({
                success: false,
                message: 'This item cannot be returned in its current status'
            });
        }

        // Use dbPromise transactions for clarity
        await dbPromise.run('BEGIN TRANSACTION;');
        let returnResult = null;
        try {
            // Validate against previous returns to prevent over-returning
            const prevReturnedRow = await dbPromise.get(
                'SELECT COALESCE(SUM(quantity_returned), 0) as returned FROM returns WHERE issue_id = ?',
                [issue_id]
            );
            const prevReturned = prevReturnedRow ? prevReturnedRow.returned : 0;

            if ((prevReturned + quantity_returned) > issue.quantity_issued) {
                throw new Error(`Return quantity exceeds issued amount. Already returned: ${prevReturned}, Issued: ${issue.quantity_issued}`);
            }

            // Create return record
            returnResult = await dbPromise.run(
                `INSERT INTO returns (issue_id, product_id, quantity_returned, condition, notes, received_by_user_id)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [issue_id, issue.product_id, quantity_returned, condition || 'good', notes || '', user_id || 0]
            );

            // Decide how to reverse the original checkout based on recorded source
            const originalSource = issue.source || 'reserve_stock';

            // Return should add back to the same inventory that was used originally
            if (originalSource === 'in_circulation') {
                // Add returned quantity back to in_circulation
                await dbPromise.run(
                    `UPDATE inventory_status SET quantity_in_use = quantity_in_use + ? WHERE product_id = ?`,
                    [quantity_returned, issue.product_id]
                );
            } else {
                // Add returned quantity back to reserve stock
                await dbPromise.run(
                    `UPDATE inventory_status SET quantity_in_stock = quantity_in_stock + ? WHERE product_id = ?`,
                    [quantity_returned, issue.product_id]
                );
            }

            // NOTE: Do not modify quantity_total on return — quantity_total is the lab's owned total

            // Determine new returned total and set issue status accordingly
            const newReturnedTotal = prevReturned + quantity_returned;
            const newStatus = newReturnedTotal >= issue.quantity_issued ? 'returned' : 'partially_returned';

            await dbPromise.run(
                `UPDATE issues SET status = ? WHERE issue_id = ?`,
                [newStatus, issue_id]
            );

            // Log transaction
            await dbPromise.run(
                `INSERT INTO transaction_history (transaction_type, product_id, quantity_change, performed_by_user_id, reference_id, reference_type, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ['RETURN', issue.product_id, quantity_returned, user_id || 0, returnResult.id, 'RETURN', `Condition: ${condition}`]
            );

            await dbPromise.run('COMMIT;');
        } catch (procErr) {
            await dbPromise.run('ROLLBACK;');
            throw procErr;
        }

        res.json({
            success: true,
            message: 'Item returned successfully',
            return_id: returnResult ? returnResult.id : null
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Error returning item',
            error: err.message
        });
    }
};

// Get pending issues
exports.getPendingIssues = async (req, res) => {
    try {
        const issues = await dbPromise.all(`
            SELECT i.*, p.product_name,
                   COALESCE((SELECT SUM(quantity_returned) FROM returns r WHERE r.issue_id = i.issue_id),0) as returned_total
            FROM issues i
            JOIN products p ON i.product_id = p.product_id
            WHERE i.status IN ('issued','partially_returned')
            ORDER BY i.issue_date DESC, i.issue_time DESC
        `);
        
        res.json({
            success: true,
            data: issues
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Error fetching issues',
            error: err.message
        });
    }
};

// Get inventory report
exports.getInventoryReport = async (req, res) => {
    try {
        const report = await dbPromise.all(`
            SELECT p.product_id, p.product_name, p.category,
                   COALESCE(i.quantity_in_use, 0) as quantity_in_use,
                   COALESCE(i.quantity_in_stock, 0) as quantity_in_stock,
                   COALESCE(i.quantity_total, 0) as quantity_total,
                   p.added_by,
                   (
                       SELECT u.full_name
                       FROM transaction_history th
                       JOIN users u ON u.user_id = th.performed_by_user_id
                       WHERE th.transaction_type = 'PRODUCT_ADD' AND th.reference_id = p.product_id
                       LIMIT 1
                   ) AS added_by_full_name,
                   (
                       SELECT u.username
                       FROM transaction_history th
                       JOIN users u ON u.user_id = th.performed_by_user_id
                       WHERE th.transaction_type = 'PRODUCT_ADD' AND th.reference_id = p.product_id
                       LIMIT 1
                   ) AS added_by_username
            FROM products p
            LEFT JOIN inventory_status i ON p.product_id = i.product_id
            ORDER BY p.category, p.product_name
        `);
        
        res.json({
            success: true,
            data: report
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Error generating report',
            error: err.message
        });
    }
};

// Activity / Transaction report
exports.getActivityReport = async (req, res) => {
    try {
        // Prefer showing the profile name (issue.user_name) for CHECKOUT/RETURN records
        // instead of the processing user's account (admin). Fall back to users.username.
        const activities = await dbPromise.all(`
            SELECT th.transaction_id,
                   th.transaction_type,
                   th.product_id,
                   p.product_name,
                   th.quantity_change,
                   th.performed_by_user_id,
                   COALESCE(
                       (CASE WHEN th.reference_type = 'CHECKOUT' THEN iss.user_name END),
                       (CASE WHEN th.reference_type = 'RETURN' THEN iss_ret.user_name END),
                       u.username
                   ) AS performed_by,
                   th.reference_id,
                   th.reference_type,
                   th.notes,
                   th.created_at
            FROM transaction_history th
            LEFT JOIN products p ON p.product_id = th.product_id
            LEFT JOIN users u ON u.user_id = th.performed_by_user_id
            LEFT JOIN issues iss ON th.reference_type = 'CHECKOUT' AND iss.issue_id = th.reference_id
            LEFT JOIN returns ret ON th.reference_type = 'RETURN' AND ret.return_id = th.reference_id
            LEFT JOIN issues iss_ret ON ret.issue_id = iss_ret.issue_id
            ORDER BY th.created_at DESC
        `);

        res.json({ success: true, data: activities });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching activity report', error: err.message });
    }
};

// === PROFILES CONTROLLERS ===
exports.getAllProfiles = async (req, res) => {
    try {
        const profiles = await dbPromise.all(`
            SELECT profile_id, user_id, name, email, phone_number, position,
                   position_type AS working_under, created_at, updated_at
            FROM profiles
            ORDER BY created_at DESC
        `);
        
        res.json({
            success: true,
            data: profiles
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Error fetching profiles',
            error: err.message
        });
    }
};

exports.addProfile = async (req, res) => {
    try {
        const { name, email, phone_number, position, working_under, user_id } = req.body;
        
        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Name and email are required'
            });
        }
        
        const result = await dbPromise.run(
            `INSERT INTO profiles (name, email, phone_number, position, position_type, user_id)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, email, phone_number || '', position || '', working_under || 'MV', user_id || null]
        );
        
        res.json({
            success: true,
            message: 'Profile added successfully',
            profile_id: result.id
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Error adding profile',
            error: err.message
        });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { profile_id, name, email, phone_number, position, working_under } = req.body;
        
        if (!profile_id) {
            return res.status(400).json({
                success: false,
                message: 'Profile ID is required'
            });
        }
        
        await dbPromise.run(
            `UPDATE profiles SET name = ?, email = ?, phone_number = ?, position = ?, position_type = ?, updated_at = CURRENT_TIMESTAMP
             WHERE profile_id = ?`,
            [name, email, phone_number, position, working_under, profile_id]
        );
        
        res.json({
            success: true,
            message: 'Profile updated successfully'
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Error updating profile',
            error: err.message
        });
    }
};

exports.deleteProfile = async (req, res) => {
    try {
        const profileId = req.params.id;
        
        if (!profileId) {
            return res.status(400).json({
                success: false,
                message: 'Profile ID is required'
            });
        }
        
        await dbPromise.run(
            `DELETE FROM profiles WHERE profile_id = ?`,
            [profileId]
        );
        
        res.json({
            success: true,
            message: 'Profile deleted successfully'
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Error deleting profile',
            error: err.message
        });
    }
};

// === CATEGORIES CONTROLLERS ===
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await dbPromise.all(`
            SELECT * FROM categories
            ORDER BY category_name ASC
        `);
        
        res.json({
            success: true,
            data: categories
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Error fetching categories',
            error: err.message
        });
    }
};

exports.addCategory = async (req, res) => {
    try {
        const { category_name, description } = req.body;
        
        if (!category_name) {
            return res.status(400).json({
                success: false,
                message: 'Category name is required'
            });
        }
        
        const result = await dbPromise.run(
            `INSERT INTO categories (category_name, description)
             VALUES (?, ?)`,
            [category_name, description || '']
        );
        
        res.json({
            success: true,
            message: 'Category added successfully',
            category_id: result.id
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Error adding category',
            error: err.message
        });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { category_id, category_name, description } = req.body;
        
        if (!category_id) {
            return res.status(400).json({
                success: false,
                message: 'Category ID is required'
            });
        }
        
        await dbPromise.run(
            `UPDATE categories SET category_name = ?, description = ?
             WHERE category_id = ?`,
            [category_name, description, category_id]
        );
        
        res.json({
            success: true,
            message: 'Category updated successfully'
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Error updating category',
            error: err.message
        });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const { category_id } = req.body;
        
        if (!category_id) {
            return res.status(400).json({
                success: false,
                message: 'Category ID is required'
            });
        }
        
        await dbPromise.run(
            `DELETE FROM categories WHERE category_id = ?`,
            [category_id]
        );
        
        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Error deleting category',
            error: err.message
        });
    }
};
