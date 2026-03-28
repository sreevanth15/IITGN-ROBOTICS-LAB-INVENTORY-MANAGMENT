-- IITGN Robotics Lab Inventory Management System Database Schema

-- Users table for login authentication
CREATE TABLE users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Profiles table for detailed user information
CREATE TABLE profiles (
    profile_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone_number TEXT,
    position TEXT,
    position_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Products table for inventory items
CREATE TABLE products (
    product_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    unit TEXT,
    location TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Categories table for organizing items
CREATE TABLE categories (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inventory status tracking
CREATE TABLE inventory_status (
    status_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    quantity_in_use INTEGER DEFAULT 0,
    quantity_in_stock INTEGER DEFAULT 0,
    quantity_total INTEGER DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);

-- Issues (Checkouts) - When items are taken out
CREATE TABLE issues (
    issue_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    quantity_issued INTEGER NOT NULL,
    issued_by_user_id INTEGER NOT NULL,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    purpose TEXT,
    issue_date DATE DEFAULT CURRENT_DATE,
    issue_time TIME DEFAULT CURRENT_TIME,
    expected_return_date DATE,
    status TEXT DEFAULT 'issued',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (issued_by_user_id) REFERENCES users(user_id)
);

-- Returns - When items are returned
CREATE TABLE returns (
    return_id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity_returned INTEGER NOT NULL,
    condition TEXT,
    notes TEXT,
    return_date DATE DEFAULT CURRENT_DATE,
    return_time TIME DEFAULT CURRENT_TIME,
    received_by_user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (issue_id) REFERENCES issues(issue_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (received_by_user_id) REFERENCES users(user_id)
);

-- Transaction history for audit trail
CREATE TABLE transaction_history (
    transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_type TEXT,
    product_id INTEGER NOT NULL,
    quantity_change INTEGER,
    performed_by_user_id INTEGER,
    reference_id INTEGER,
    reference_type TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by_user_id) REFERENCES users(user_id)
);

-- Insert default admin user (username: admin, password: admin123)
INSERT INTO users (username, password, email, full_name, role) VALUES ('admin', 'admin123', 'admin@iitgn-robotics.lab', 'Admin User', 'admin');

-- Insert default categories
INSERT INTO categories (category_name, description) VALUES 
('Electronics', 'Electronic components'),
('Mechanical', 'Mechanical parts'),
('Tools', 'Tools and equipment'),
('Consumables', 'Consumable items'),
('Other', 'Other items');

-- Create indexes for better performance
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_inventory_product ON inventory_status(product_id);
CREATE INDEX idx_issues_product ON issues(product_id);
CREATE INDEX idx_issues_user ON issues(issued_by_user_id);
CREATE INDEX idx_returns_issue ON returns(issue_id);
CREATE INDEX idx_history_product ON transaction_history(product_id);
CREATE INDEX idx_categories_name ON categories(category_name);
CREATE INDEX idx_profiles_user ON profiles(user_id);
