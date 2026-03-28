// API Configuration
const API_URL = 'http://localhost:3000/api';

// Global State
let currentUser = null;
let selectedItems = [];
let allProducts = [];
let allProfiles = [];
let allCategories = [];

// === Authentication ===
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username')?.value;
    const password = document.getElementById('password')?.value;
    
    if (!username || !password) {
        showError('Username and password are required');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('user', JSON.stringify(currentUser));
            window.location.href = '/dashboard.html';
        } else {
            showError(data.message || 'Login failed');
        }
    } catch (err) {
        showError('Network error: ' + err.message);
    }
}

function handleLogout() {
    localStorage.removeItem('user');
    window.location.href = '/';
}

// === Dashboard Initialization ===
function initializeDashboard() {
    const userStr = localStorage.getItem('user');
    
    if (!userStr) {
        window.location.href = '/';
        return;
    }
    
    currentUser = JSON.parse(userStr);
    updateUserInfo();
    loadAllData();
    setupNavigation();
}

function updateUserInfo() {
    const nameEl = document.querySelector('.user-info .name');
    const roleEl = document.querySelector('.user-info .role');
    
    if (nameEl) nameEl.textContent = currentUser.full_name;
    if (roleEl) roleEl.textContent = currentUser.role;
}

// === Load All Data ===
async function loadAllData() {
    try {
        await Promise.all([
            loadProducts(),
            loadProfiles(),
            loadCategories()
        ]);
    } catch (err) {
        showError('Failed to load data: ' + err.message);
    }
}

// === Navigation ===
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');
            showSection(section);
            
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
    
    if (navLinks.length > 0) {
        navLinks[0].click();
    }
    
    // Setup config tab buttons
    const configTabBtns = document.querySelectorAll('.config-tab-btn');
    configTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');
            showConfigTab(tabName);
            
            configTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
        
        if (sectionId === 'inventory-list') {
            displayInventoryByFolder();
        } else if (sectionId === 'pending-returns') {
            loadPendingIssues();
        } else if (sectionId === 'report') {
            loadInventoryReport();
            loadActivityReport();
        } else if (sectionId === 'config') {
            if (!document.querySelector('.config-tab-btn.active')) {
                document.querySelector('.config-tab-btn').click();
            }
        }
    }
}

function showConfigTab(tabName) {
    document.querySelectorAll('.config-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const tab = document.getElementById(tabName);
    if (tab) {
        tab.classList.add('active');
        
        if (tabName === 'categories-tab') {
            displayCategories();
        } else if (tabName === 'profiles-tab') {
            displayProfiles();
        } else if (tabName === 'products-tab') {
            loadProducts().then(() => displayProducts());  // Refresh data before displaying
        }
    }
}

// === Product Management ===
async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        const data = await response.json();
        
        if (data.success) {
            allProducts = data.data;
        }
    } catch (err) {
        showError('Failed to load products: ' + err.message);
    }
}

function displayInventoryByFolder() {
    // ===== IN CIRCULATION INVENTORY (Independent) =====
    const inUseContainer = document.getElementById('inventory-in-use');
    const inUseProducts = allProducts; // Show ALL products in this inventory
    
    let inUseHTML = '';
    if (inUseProducts.length === 0) {
        inUseHTML = '<p class="text-muted">No items</p>';
    } else {
        // Group by category
        const inUseCategoryMap = {};
        inUseProducts.forEach(product => {
            const category = product.category || 'Uncategorized';
            if (!inUseCategoryMap[category]) {
                inUseCategoryMap[category] = [];
            }
            inUseCategoryMap[category].push(product);
        });
        
        inUseHTML = '<div class="inventory-categories">';
        Object.keys(inUseCategoryMap).sort().forEach((category, index) => {
            const categoryId = `in-use-category-${category.replace(/\s+/g, '-').toLowerCase()}`;
            inUseHTML += `
                <div class="category-section">
                    <div class="category-header" onclick="toggleCategory('${categoryId}', event)">
                        <span class="category-toggle">▶</span>
                        <span class="category-name">📁 ${category}</span>
                        <span class="category-count">(${inUseCategoryMap[category].length} items)</span>
                    </div>
                    <div id="${categoryId}" class="category-items" style="display: ${index === 0 ? 'grid' : 'none'}; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; margin-top: 15px;">
            `;
            
            inUseCategoryMap[category].forEach(product => {
                const stockQty = product.quantity_in_use || 0;
                const isOutOfStock = stockQty === 0;
                const disabledAttr = isOutOfStock ? 'disabled' : '';
                const dimmedStyle = isOutOfStock ? 'opacity: 0.5;' : '';
                
                inUseHTML += `
                    <div style="padding: 15px; border: 1px solid #e5e7eb; border-radius: 6px; background-color: #fff; ${dimmedStyle}">
                        <input type="checkbox" class="checkout-checkbox" value="${product.product_id}" data-name="${product.product_name}" data-category="${product.category}" data-source="in_circulation" data-available="${stockQty}" data-max-quantity="${stockQty}" ${disabledAttr}>
                        <label style="margin-left: 8px; font-weight: 500; cursor: ${isOutOfStock ? 'default' : 'pointer'};">
                            ${product.product_name}
                        </label>
                        <div style="margin-top: 10px; font-size: 13px; color: #6b7280;">
                            <div>📁 In Circulation: ${stockQty}</div>
                            <div style="color: ${isOutOfStock ? '#dc2626' : '#059669'}; font-weight: ${isOutOfStock ? 'bold' : 'normal'};">${isOutOfStock ? '⚠️ Stock: 0' : '✓ In Stock: ' + stockQty}</div>
                            <div>Location: ${product.location || 'N/A'}</div>
                        </div>
                        <input type="number" min="1" value="1" max="${stockQty}" class="checkout-quantity" data-product-id="${product.product_id}" style="width: 100%; margin-top: 10px; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px;" ${disabledAttr}>
                    </div>
                `;
            });
            
            inUseHTML += '</div></div>';
        });
        inUseHTML += '</div>';
    }
    
    if (inUseContainer) {
        inUseContainer.innerHTML = inUseHTML;
    }
    
    // ===== RESERVE STOCK INVENTORY (Independent) =====
    const extraContainer = document.getElementById('inventory-extra');
    const extraProducts = allProducts; // Show ALL products in this inventory
    
    let extraHTML = '';
    if (extraProducts.length === 0) {
        extraHTML = '<p class="text-muted">No items</p>';
    } else {
        // Group by category
        const extraCategoryMap = {};
        extraProducts.forEach(product => {
            const category = product.category || 'Uncategorized';
            if (!extraCategoryMap[category]) {
                extraCategoryMap[category] = [];
            }
            extraCategoryMap[category].push(product);
        });
        
        extraHTML = '<div class="inventory-categories">';
        Object.keys(extraCategoryMap).sort().forEach((category, index) => {
            const categoryId = `extra-category-${category.replace(/\s+/g, '-').toLowerCase()}`;
            extraHTML += `
                <div class="category-section">
                    <div class="category-header" onclick="toggleCategory('${categoryId}', event)">
                        <span class="category-toggle">▶</span>
                        <span class="category-name">📁 ${category}</span>
                        <span class="category-count">(${extraCategoryMap[category].length} items)</span>
                    </div>
                    <div id="${categoryId}" class="category-items" style="display: ${index === 0 ? 'grid' : 'none'}; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; margin-top: 15px;">
            `;
            
            extraCategoryMap[category].forEach(product => {
                const stockQty = product.quantity_in_stock || 0;
                const isOutOfStock = stockQty === 0;
                const disabledAttr = isOutOfStock ? 'disabled' : '';
                const dimmedStyle = isOutOfStock ? 'opacity: 0.5;' : '';
                
                extraHTML += `
                    <div style="padding: 15px; border: 1px solid #e5e7eb; border-radius: 6px; background-color: #fff; ${dimmedStyle}">
                        <input type="checkbox" class="checkout-checkbox" value="${product.product_id}" data-name="${product.product_name}" data-category="${product.category}" data-source="reserve_stock" data-available="${stockQty}" data-max-quantity="${stockQty}" ${disabledAttr}>
                        <label style="margin-left: 8px; font-weight: 500; cursor: ${isOutOfStock ? 'default' : 'pointer'};">
                            ${product.product_name}
                        </label>
                        <div style="margin-top: 10px; font-size: 13px; color: #6b7280;">
                            <div>📁 Reserve Stock: ${stockQty}</div>
                            <div style="color: ${isOutOfStock ? '#dc2626' : '#059669'}; font-weight: ${isOutOfStock ? 'bold' : 'normal'};">${isOutOfStock ? '⚠️ Stock: 0' : '✓ In Stock: ' + stockQty}</div>
                            <div>Location: ${product.location || 'N/A'}</div>
                        </div>
                        <input type="number" min="1" value="1" max="${stockQty}" class="checkout-quantity" data-product-id="${product.product_id}" style="width: 100%; margin-top: 10px; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px;" ${disabledAttr}>
                    </div>
                `;
            });
            
            extraHTML += '</div></div>';
        });
        extraHTML += '</div>';
    }
    
    if (extraContainer) {
        extraContainer.innerHTML = extraHTML;
    }
    
    // Setup checkbox listeners for BOTH inventories
    document.querySelectorAll('.checkout-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', updateCheckoutSelection);
    });
    
    // Setup quantity input listeners for BOTH inventories
    document.querySelectorAll('.checkout-quantity').forEach(input => {
        input.addEventListener('change', function() {
            const maxQuantity = parseInt(this.getAttribute('max'));
            const currentValue = parseInt(this.value) || 1;
            
            if (currentValue > maxQuantity) {
                showError(`Maximum available: ${maxQuantity}`);
                this.value = maxQuantity;
            }
            if (currentValue < 1) {
                this.value = 1;
            }
            updateCheckoutSelection();
        });
        
        input.addEventListener('input', function() {
            const value = parseInt(this.value) || 0;
            if (value < 1) return;
            
            const maxQuantity = parseInt(this.getAttribute('max'));
            if (value > maxQuantity) {
                this.value = maxQuantity;
            }
        });
    });
}

// Toggle Category Expansion/Collapse
function toggleCategory(categoryId, event) {
    event.preventDefault();
    const categoryItems = document.getElementById(categoryId);
    const categoryHeader = event.currentTarget;
    const categoryToggle = categoryHeader.querySelector('.category-toggle');
    
    if (categoryItems) {
        const isVisible = categoryItems.style.display !== 'none';
        categoryItems.style.display = isVisible ? 'none' : 'grid';
        categoryToggle.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(90deg)';
        categoryToggle.style.transition = 'transform 0.3s ease';
    }
}

function updateCheckoutSelection() {
    const checkboxes = document.querySelectorAll('.checkout-checkbox:checked');
    selectedItems = [];
    let hasErrors = false;
    
    checkboxes.forEach(checkbox => {
        const productId = checkbox.value;
        const source = checkbox.getAttribute('data-source') || 'reserve_stock'; // in_circulation or reserve_stock
        const quantityInput = document.querySelector(`.checkout-quantity[data-product-id="${productId}"]`);
        let quantity = parseInt(quantityInput.value) || 1;
        
        // Use data-max-quantity if available, otherwise use data-available
        let maxAvailable = parseInt(checkbox.getAttribute('data-max-quantity'));
        if (isNaN(maxAvailable)) {
            maxAvailable = parseInt(checkbox.getAttribute('data-available')) || 0;
        }
        
        // Validate quantity doesn't exceed available stock
        if (quantity > maxAvailable) {
            showError(`Cannot checkout ${quantity} units of ${checkbox.getAttribute('data-name')}. Only ${maxAvailable} available.`);
            quantity = maxAvailable;
            quantityInput.value = maxAvailable;
            hasErrors = true;
        }
        
        if (maxAvailable === 0) {
            showError(`${checkbox.getAttribute('data-name')} is out of stock`);
            checkbox.checked = false;
            hasErrors = true;
            return;
        }
        
        selectedItems.push({
            product_id: productId,
            product_name: checkbox.getAttribute('data-name'),
            category: checkbox.getAttribute('data-category'),
            quantity: quantity,
            source: source  // Track which inventory this is from
        });
    });
    
    // Show/hide checkout section
    const checkoutSection = document.getElementById('checkout-section');
    if (selectedItems.length > 0) {
        checkoutSection.style.display = 'block';
        updateCheckoutItemsList();
    } else {
        checkoutSection.style.display = 'none';
    }
}

function updateCheckoutItemsList() {
    const container = document.getElementById('checkout-items-list');
    if (!container) return;
    
    if (selectedItems.length === 0) {
        container.innerHTML = '<p class="text-muted">No items selected</p>';
        return;
    }
    
    let html = '<table style="width: 100%;"><thead><tr><th>Product</th><th>Category</th><th>From</th><th>Qty</th><th>Action</th></tr></thead><tbody>';
    
    selectedItems.forEach((item, index) => {
        const sourceLabel = item.source === 'in_circulation' ? 'In Circulation' : 'Reserve Stock';
        html += `
            <tr>
                <td>${item.product_name}</td>
                <td>${item.category}</td>
                <td>${sourceLabel}</td>
                <td>${item.quantity}</td>
                <td><button type="button" onclick="removeCheckoutItem(${index})" class="btn btn-small" style="background-color: #fee2e2; color: #dc2626; padding: 4px 8px;">Remove</button></td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function removeCheckoutItem(index) {
    selectedItems.splice(index, 1);
    
    document.querySelectorAll('.checkout-checkbox:checked').forEach((checkbox, i) => {
        if (i === index) {
            checkbox.checked = false;
        }
    });
    
    updateCheckoutSelection();
}

function clearCheckoutSelection() {
    selectedItems = [];
    document.querySelectorAll('.checkout-checkbox').forEach(cb => {
        cb.checked = false;
    });
    document.getElementById('checkout-section').style.display = 'none';
}



// === Checkout from Inventory List ===
async function handleCheckoutSubmit(event) {
    event.preventDefault();
    
    const userName = document.getElementById('checkout-user-name').value.trim();
    const userEmail = document.getElementById('checkout-user-email').value.trim();
    
    if (!userName || !userEmail) {
        showError('Please select a profile or enter user details');
        return;
    }
    
    if (selectedItems.length === 0) {
        showError('Please select at least one item');
        return;
    }
    
    // Validate all quantities before checkout - check based on source
    for (const item of selectedItems) {
        const product = allProducts.find(p => p.product_id === parseInt(item.product_id));
        if (!product) {
            showError(`Product ${item.product_name} not found`);
            return;
        }
        
        // Validate based on checkout source
        const availableQty = item.source === 'in_circulation' 
            ? (product.quantity_in_use || 0) 
            : (product.quantity_in_stock || 0);
        
        if (item.quantity > availableQty) {
            const sourceLabel = item.source === 'in_circulation' ? 'In Circulation' : 'Reserve Stock';
            showError(`Insufficient stock for ${item.product_name} in ${sourceLabel}. Available: ${availableQty}, Requested: ${item.quantity}`);
            return;
        }
        
        if (item.quantity <= 0) {
            showError(`Invalid quantity for ${item.product_name}`);
            return;
        }
    }
    
    // Group items by source to process them correctly
    const itemsBySource = {};
    selectedItems.forEach(item => {
        const source = item.source || 'reserve_stock';
        if (!itemsBySource[source]) {
            itemsBySource[source] = [];
        }
        itemsBySource[source].push({
            product_id: item.product_id,
            quantity: item.quantity
        });
    });
    
    try {
        const response = await fetch(`${API_URL}/issues`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: selectedItems.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    source: item.source || 'reserve_stock'  // Include source for each item
                })),
                user_name: userName,
                user_email: userEmail,
                purpose: document.getElementById('checkout-purpose').value,
                user_id: currentUser.user_id
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess(data.message);
            document.getElementById('checkout-form').reset();
            selectedItems = [];
            clearCheckoutSelection();
            loadProducts();
        } else {
            showError(data.message || 'Failed to checkout items');
        }
    } catch (err) {
        showError('Error: ' + err.message);
    }
}

// === Profile Management ===
async function loadProfiles() {
    try {
        const response = await fetch(`${API_URL}/profiles`);
        const data = await response.json();
        
        if (data.success) {
            allProfiles = data.data;
            populateCheckoutProfileDropdown();
        }
    } catch (err) {
        showError('Failed to load profiles: ' + err.message);
    }
}

function populateCheckoutProfileDropdown() {
    const select = document.getElementById('checkout-profile');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Select a Profile --</option>';
    
    allProfiles.forEach(profile => {
        const option = document.createElement('option');
        option.value = profile.profile_id;
        option.textContent = `${profile.name} (${profile.working_under})`;
        select.appendChild(option);
    });
    
    select.addEventListener('change', onCheckoutProfileSelected);
}

function onCheckoutProfileSelected() {
    const select = document.getElementById('checkout-profile');
    const profileId = select.value;
    
    const profile = allProfiles.find(p => p.profile_id == profileId);
    
    if (profile) {
        document.getElementById('checkout-user-name').value = profile.name;
        document.getElementById('checkout-user-email').value = profile.email;
        document.getElementById('checkout-user-phone').value = profile.phone_number || '';
        document.getElementById('checkout-user-position').value = `${profile.position} (${profile.working_under})`;
    } else {
        document.getElementById('checkout-user-name').value = '';
        document.getElementById('checkout-user-email').value = '';
        document.getElementById('checkout-user-phone').value = '';
        document.getElementById('checkout-user-position').value = '';
    }
}

function displayProfiles() {
    const container = document.getElementById('profiles-list');
    if (!container) return;
    
    if (allProfiles.length === 0) {
        container.innerHTML = '<p class="text-muted">No profiles created yet</p>';
        return;
    }
    
    let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">';
    
    allProfiles.forEach(profile => {
        html += `
            <div style="padding: 15px; border: 1px solid #e5e7eb; border-radius: 6px; background-color: #f9fafb;">
                <h4 style="margin-top: 0;">${profile.name}</h4>
                <div style="font-size: 13px; color: #6b7280;">
                    <div><strong>Email:</strong> ${profile.email}</div>
                    <div><strong>Phone:</strong> ${profile.phone_number || 'N/A'}</div>
                    <div><strong>Position:</strong> ${profile.position || 'N/A'}</div>
                    <div><strong>Working Under:</strong> ${profile.working_under}</div>
                </div>
                <div style="margin-top: 12px; display: flex; gap: 8px;">
                    <button type="button" onclick="openEditProfileModal(${profile.profile_id})" class="btn btn-small" style="flex: 1; background-color: #3b82f6; color: white; padding: 6px 8px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        ✎ Edit
                    </button>
                    <button type="button" onclick="deleteProfile(${profile.profile_id})" class="btn btn-small" style="flex: 1; background-color: #dc2626; color: white; padding: 6px 8px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        🗑 Delete
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function openEditProfileModal(profileId) {
    const profile = allProfiles.find(p => p.profile_id === profileId);
    if (!profile) return;
    
    document.getElementById('edit-profile-id').value = profile.profile_id;
    document.getElementById('edit-profile-name').value = profile.name;
    document.getElementById('edit-profile-email').value = profile.email;
    document.getElementById('edit-profile-phone').value = profile.phone_number || '';
    document.getElementById('edit-profile-position').value = profile.position || '';
    document.getElementById('edit-profile-working-under').value = profile.working_under;
    
    document.getElementById('edit-profile-modal').style.display = 'block';
}

function closeEditProfileModal() {
    document.getElementById('edit-profile-modal').style.display = 'none';
    document.getElementById('edit-profile-form').reset();
}

async function handleUpdateProfileSubmit(event) {
    event.preventDefault();
    
    const profileId = document.getElementById('edit-profile-id').value;
    
    try {
        const response = await fetch(`${API_URL}/profiles`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                profile_id: profileId,
                name: document.getElementById('edit-profile-name').value,
                email: document.getElementById('edit-profile-email').value,
                phone_number: document.getElementById('edit-profile-phone').value,
                position: document.getElementById('edit-profile-position').value,
                working_under: document.getElementById('edit-profile-working-under').value
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Profile updated successfully');
            closeEditProfileModal();
            loadProfiles();
        } else {
            showError(data.message || 'Failed to update profile');
        }
    } catch (err) {
        showError('Error: ' + err.message);
    }
}

async function deleteProfile(profileId) {
    if (!confirm('Are you sure you want to delete this profile? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/profiles/${profileId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Profile deleted successfully');
            loadProfiles();
        } else {
            showError(data.message || 'Failed to delete profile');
        }
    } catch (err) {
        showError('Error: ' + err.message);
    }
}

async function handleAddProfileSubmit(event) {
    event.preventDefault();
    
    try {
        const response = await fetch(`${API_URL}/profiles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: document.getElementById('profile-name').value,
                email: document.getElementById('profile-email').value,
                phone_number: document.getElementById('profile-phone').value,
                position: document.getElementById('profile-position').value,
                working_under: document.getElementById('profile-working-under').value,
                user_id: currentUser.user_id
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Profile added successfully');
            document.getElementById('add-profile-form').reset();
            loadProfiles();
        } else {
            showError(data.message || 'Failed to add profile');
        }
    } catch (err) {
        showError('Error: ' + err.message);
    }
}

// === Category Management ===
async function loadCategories() {
    try {
        const response = await fetch(`${API_URL}/categories`);
        const data = await response.json();
        
        if (data.success) {
            allCategories = data.data;
            populateCategoryDropdown();
        }
    } catch (err) {
        showError('Failed to load categories: ' + err.message);
    }
}

function populateCategoryDropdown() {
    const select = document.getElementById('new-product-category');
    if (!select) return;
    
    select.innerHTML = '';
    
    allCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.category_name;
        option.textContent = category.category_name;
        select.appendChild(option);
    });
}

function displayCategories() {
    const container = document.getElementById('categories-list');
    if (!container) return;
    
    if (allCategories.length === 0) {
        container.innerHTML = '<p class="text-muted">No categories created yet</p>';
        return;
    }
    
    let html = '<table style="width: 100%;"><thead><tr><th>Category</th><th>Description</th><th>Action</th></tr></thead><tbody>';
    
    allCategories.forEach(category => {
        html += `
            <tr>
                <td><strong>${category.category_name}</strong></td>
                <td>${category.description || 'N/A'}</td>
                <td><button type="button" onclick="deleteCategory(${category.category_id})" class="btn btn-small" style="background-color: #fee2e2; color: #dc2626; padding: 4px 8px;">Delete</button></td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

async function deleteCategory(categoryId) {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
        const response = await fetch(`${API_URL}/categories`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category_id: categoryId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Category deleted successfully');
            loadCategories();
        } else {
            showError(data.message || 'Failed to delete category');
        }
    } catch (err) {
        showError('Error: ' + err.message);
    }
}

async function handleAddCategorySubmit(event) {
    event.preventDefault();
    
    try {
        const response = await fetch(`${API_URL}/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                category_name: document.getElementById('category-name').value,
                description: document.getElementById('category-description').value
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Category added successfully');
            document.getElementById('add-category-form').reset();
            loadCategories();
        } else {
            showError(data.message || 'Failed to add category');
        }
    } catch (err) {
        showError('Error: ' + err.message);
    }
}

// === Product Management ===
function displayProducts() {
    const container = document.getElementById('products-list');
    if (!container) return;
    
    if (allProducts.length === 0) {
        container.innerHTML = '<p class="text-muted">No products created yet</p>';
        return;
    }
    
    let html = '<div style="margin-bottom: 15px;">';
    html += '<button type="button" onclick="loadProducts().then(() => displayProducts())" class="btn" style="background-color: #059669; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">🔄 Refresh Products</button>';
    html += '</div>';
    
    html += '<table style="width: 100%; border-collapse: collapse;"><thead><tr><th>Product</th><th>Category</th><th>Location</th><th>Reserve Stock</th><th>In Circulation</th><th>Actions</th></tr></thead><tbody>';
    
    allProducts.forEach(product => {
        html += `
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px;"><strong>${product.product_name}</strong></td>
                <td style="padding: 12px;">${product.category || 'N/A'}</td>
                <td style="padding: 12px;">${product.location || 'N/A'}</td>
                <td style="padding: 12px;">${product.quantity_in_stock || 0}</td>
                <td style="padding: 12px;">${product.quantity_in_use || 0}</td>
                <td style="padding: 12px;">
                    <button type="button" onclick="openEditProductModal(${product.product_id})" class="btn btn-small" style="background-color: #3b82f6; color: white; padding: 4px 8px; margin-right: 4px;">✎ Edit</button>
                    <button type="button" onclick="deleteProduct(${product.product_id})" class="btn btn-small" style="background-color: #dc2626; color: white; padding: 4px 8px;">🗑 Delete</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function openEditProductModal(productId) {
    const product = allProducts.find(p => p.product_id === productId);
    if (!product) return;
    
    document.getElementById('edit-product-id').value = product.product_id;
    document.getElementById('edit-product-name').value = product.product_name;
    document.getElementById('edit-product-category').value = product.category || '';
    document.getElementById('edit-product-location').value = product.location || '';
    document.getElementById('edit-product-description').value = product.description || '';
    document.getElementById('edit-product-stock').value = product.quantity_in_stock || 0;
    document.getElementById('edit-product-in-use').value = product.quantity_in_use || 0;
    
    // Populate category dropdown
    const categorySelect = document.getElementById('edit-product-category');
    categorySelect.innerHTML = '';
    allCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.category_name;
        option.textContent = category.category_name;
        categorySelect.appendChild(option);
    });
    categorySelect.value = product.category || '';
    
    document.getElementById('edit-product-modal').style.display = 'block';
}

function closeEditProductModal() {
    document.getElementById('edit-product-modal').style.display = 'none';
    document.getElementById('edit-product-form').reset();
}

async function handleEditProductSubmit(event) {
    event.preventDefault();
    
    const productId = document.getElementById('edit-product-id').value;
    
    try {
        const response = await fetch(`${API_URL}/products`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                product_id: productId,
                product_name: document.getElementById('edit-product-name').value,
                description: document.getElementById('edit-product-description').value,
                category: document.getElementById('edit-product-category').value,
                location: document.getElementById('edit-product-location').value,
                quantity_in_stock: parseInt(document.getElementById('edit-product-stock').value) || 0,
                quantity_in_use: parseInt(document.getElementById('edit-product-in-use').value) || 0
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Product updated successfully');
            closeEditProductModal();
            loadProducts();
        } else {
            showError(data.message || 'Failed to update product');
        }
    } catch (err) {
        showError('Error: ' + err.message);
    }
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product? This cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/products`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: productId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Product deleted successfully');
            loadProducts();
        } else {
            showError(data.message || 'Failed to delete product');
        }
    } catch (err) {
        showError('Error: ' + err.message);
    }
}

// === Returns ===
async function loadPendingIssues() {
    try {
        const response = await fetch(`${API_URL}/issues/pending`);
        const data = await response.json();
        
        if (data.success) {
            displayPendingIssues(data.data);
        }
    } catch (err) {
        showError('Failed to load pending issues: ' + err.message);
    }
}

function displayPendingIssues(issues) {
    const container = document.getElementById('pending-issues-list');
    if (!container) return;
    
    if (issues.length === 0) {
        container.innerHTML = '<p class="text-muted" style="padding: 20px;">No pending issues</p>';
        return;
    }
    
    let html = '<table>' +
        '<thead><tr>' +
        '<th>Issue ID</th>' +
        '<th>Product</th>' +
        '<th>Quantity</th>' +
        '<th>Returned</th>' +
        '<th>Remaining</th>' +
        '<th>Checked Out To</th>' +
        '<th>Date</th>' +
        '<th>Status</th>' +
        '<th>Action</th>' +
        '</tr></thead>' +
        '<tbody>';
    
    issues.forEach(issue => {
        const returned = issue.returned_total || 0;
        const remaining = Math.max(0, (issue.quantity_issued || 0) - returned);
        const statusLabel = issue.status === 'partially_returned' ? 'Partially returned' : (issue.status === 'issued' ? 'Issued' : issue.status);

        html += `
            <tr>
                <td class="product-id">#${issue.issue_id}</td>
                <td>${issue.product_name}</td>
                <td>${issue.quantity_issued}</td>
                <td>${returned}</td>
                <td>${remaining}</td>
                <td>${issue.user_name} (${issue.user_email})</td>
                <td>${issue.issue_date}</td>
                <td>${statusLabel}</td>
                <td>
                    <button class="btn btn-success" onclick="openReturnModal(${issue.issue_id}, ${remaining}, '${issue.product_name}')" ${remaining === 0 ? 'disabled' : ''}>
                        Return
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function openReturnModal(issueId, quantity, productName) {
    const modal = document.getElementById('return-modal');
    if (!modal) return;
    const remaining = quantity;
    document.getElementById('return-issue-id').value = issueId;
    document.getElementById('return-max-quantity').textContent = remaining;
    document.getElementById('return-product-name').textContent = productName;
    document.getElementById('return-quantity').max = remaining;
    document.getElementById('return-quantity').value = remaining;
    document.getElementById('return-condition').value = 'good';
    
    modal.style.display = 'block';
}

function closeReturnModal() {
    const modal = document.getElementById('return-modal');
    if (modal) modal.style.display = 'none';
}

async function handleReturnSubmit(event) {
    event.preventDefault();
    
    const issueId = parseInt(document.getElementById('return-issue-id').value);
    const quantity = parseInt(document.getElementById('return-quantity').value);
    const condition = document.getElementById('return-condition').value;
    const notes = document.getElementById('return-notes').value;
    
    if (!issueId || !quantity || quantity <= 0) {
        showError('Invalid return information');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/returns`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                issue_id: issueId,
                quantity_returned: quantity,
                condition: condition,
                notes: notes,
                user_id: currentUser.user_id
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess(data.message);
            closeReturnModal();
            await loadPendingIssues();
            await loadProducts();
            // If inventory list is visible, re-render it so counts update immediately
            if (document.getElementById('inventory-list') && document.getElementById('inventory-list').classList.contains('active')) {
                displayInventoryByFolder();
            }
        } else {
            showError(data.message || 'Failed to process return');
        }
    } catch (err) {
        showError('Network error: ' + err.message);
    }
}

// === Reports ===
async function loadInventoryReport() {
    try {
        const response = await fetch(`${API_URL}/report/inventory`);
        const data = await response.json();
        
        if (data.success) {
            displayInventoryReport(data.data);
        }
    } catch (err) {
        showError('Failed to load report: ' + err.message);
    }
}

// Activity report (add/update/issue/return etc.)
async function loadActivityReport() {
    try {
        const response = await fetch(`${API_URL}/report/activity`);
        const data = await response.json();
        if (data.success) {
            displayActivityReport(data.data);
        }
    } catch (err) {
        showError('Failed to load activity report: ' + err.message);
    }
}

function displayActivityReport(rows) {
    const container = document.getElementById('activity-report');
    if (!container) return;

    if (!rows || rows.length === 0) {
        container.innerHTML = '<p class="text-muted">No recent activity</p>';
        return;
    }

    let html = '<table><thead><tr><th>Date</th><th>Type</th><th>Product</th><th>Change</th><th>By</th><th>Notes</th></tr></thead><tbody>';

    rows.forEach(r => {
        const date = r.created_at || '';
        const type = r.transaction_type || '';
        const product = r.product_name || `#${r.product_id}` || '';
        const change = (r.quantity_change !== null && r.quantity_change !== undefined) ? r.quantity_change : '';
        const by = r.performed_by || '';
        const notes = r.notes || '';

        html += `<tr>
            <td>${date}</td>
            <td>${type}</td>
            <td>${product}</td>
            <td>${change}</td>
            <td>${by}</td>
            <td>${notes}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function displayInventoryReport(report) {
    const container = document.getElementById('inventory-report');
    if (!container) return;
    
    if (report.length === 0) {
        container.innerHTML = '<p class="text-muted">No items in inventory</p>';
        return;
    }
    
    let html = '<table><thead><tr><th>Product ID</th><th>Product Name</th><th>Category</th><th>Reserve Stock</th><th>In Circulation</th><th>Total</th></tr></thead><tbody>';
    
    report.forEach(item => {
        html += `
            <tr>
                <td>#${item.product_id}</td>
                <td>${item.product_name}</td>
                <td>${item.category || 'N/A'}</td>
                <td>${item.quantity_in_stock}</td>
                <td>${item.quantity_in_use}</td>
                <td>${item.quantity_total}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// === Add Product ===
async function handleAddProductSubmit(event) {
    event.preventDefault();
    
    try {
        const locationType = document.getElementById('new-product-location-type').value;
        const quantity = parseInt(document.getElementById('new-product-quantity').value) || 1;
        
        // Set quantity_in_stock or quantity_in_use based on selection
        let quantity_in_stock = 0;
        let quantity_in_use = 0;
        
        if (locationType === 'stock') {
            quantity_in_stock = quantity;
        } else if (locationType === 'use') {
            quantity_in_use = quantity;
        }
        
        const response = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                product_name: document.getElementById('new-product-name').value,
                description: document.getElementById('new-product-description').value,
                category: document.getElementById('new-product-category').value,
                location: document.getElementById('new-product-location').value,
                quantity_in_stock: quantity_in_stock,
                quantity_in_use: quantity_in_use,
                quantity_total: quantity
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Product added successfully');
            document.getElementById('add-product-form').reset();
            loadProducts();
        } else {
            showError(data.message || 'Failed to add product');
        }
    } catch (err) {
        showError('Error: ' + err.message);
    }
}

// === Messages ===
function showError(message) {
    const container = document.querySelector('.error-message');
    if (!container) return;
    
    container.textContent = message;
    container.style.display = 'block';
    container.style.color = '#dc2626';
    container.style.backgroundColor = '#fee2e2';
    container.style.padding = '12px 15px';
    container.style.borderRadius = '6px';
    container.style.marginBottom = '20px';
    
    setTimeout(() => {
        container.style.display = 'none';
    }, 5000);
}

function showSuccess(message) {
    const container = document.querySelector('.success-message');
    if (!container) return;
    
    container.textContent = message;
    container.style.display = 'block';
    container.style.color = '#059669';
    container.style.backgroundColor = '#d1fae5';
    container.style.padding = '12px 15px';
    container.style.borderRadius = '6px';
    container.style.marginBottom = '20px';
    
    setTimeout(() => {
        container.style.display = 'none';
    }, 5000);
}

// === Auto-update Date/Time ===
function updateDateTime() {
    const now = new Date();
    const date = now.toLocaleDateString('en-IN');
    const time = now.toLocaleTimeString('en-IN');
    
    const dateEl = document.getElementById('auto-date');
    const timeEl = document.getElementById('auto-time');
    const checkoutDateEl = document.getElementById('checkout-auto-date');
    const checkoutTimeEl = document.getElementById('checkout-auto-time');
    
    if (dateEl) dateEl.textContent = date;
    if (timeEl) timeEl.textContent = time;
    if (checkoutDateEl) checkoutDateEl.textContent = date;
    if (checkoutTimeEl) checkoutTimeEl.textContent = time;
}

// === Form Event Listeners ===
document.addEventListener('DOMContentLoaded', () => {
    // Login page
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Dashboard
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', handleCheckoutSubmit);
    }
    
    const addProductForm = document.getElementById('add-product-form');
    if (addProductForm) {
        addProductForm.addEventListener('submit', handleAddProductSubmit);
    }
    
    const addProfileForm = document.getElementById('add-profile-form');
    if (addProfileForm) {
        addProfileForm.addEventListener('submit', handleAddProfileSubmit);
    }
    
    const editProfileForm = document.getElementById('edit-profile-form');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', handleUpdateProfileSubmit);
    }
    
    const addCategoryForm = document.getElementById('add-category-form');
    if (addCategoryForm) {
        addCategoryForm.addEventListener('submit', handleAddCategorySubmit);
    }
    
    const editProductForm = document.getElementById('edit-product-form');
    if (editProductForm) {
        editProductForm.addEventListener('submit', handleEditProductSubmit);
    }
    
    const returnForm = document.getElementById('return-form');
    if (returnForm) {
        returnForm.addEventListener('submit', handleReturnSubmit);
    }
    
    const logoutBtn = document.querySelector('.btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Initialize dashboard if on dashboard page
    if (document.querySelector('.dashboard')) {
        initializeDashboard();
        updateDateTime();
        setInterval(updateDateTime, 1000);
    }
});
