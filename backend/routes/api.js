const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory');

// Authentication
router.post('/login', inventoryController.login);

// Products
router.get('/products', inventoryController.getAllProducts);
router.post('/products', inventoryController.addProduct);
router.put('/products', inventoryController.updateProduct);
router.delete('/products', inventoryController.deleteProduct);

// Issues (Checkouts)
router.post('/issues', inventoryController.issueItem);
router.get('/issues/pending', inventoryController.getPendingIssues);

// Returns
router.post('/returns', inventoryController.returnItem);

// Reports
router.get('/report/inventory', inventoryController.getInventoryReport);
router.get('/report/activity', inventoryController.getActivityReport);

// Profiles
router.get('/profiles', inventoryController.getAllProfiles);
router.post('/profiles', inventoryController.addProfile);
router.put('/profiles', inventoryController.updateProfile);
router.delete('/profiles/:id', inventoryController.deleteProfile);

// Categories
router.get('/categories', inventoryController.getAllCategories);
router.post('/categories', inventoryController.addCategory);
router.put('/categories', inventoryController.updateCategory);
router.delete('/categories', inventoryController.deleteCategory);

module.exports = router;
