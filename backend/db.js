const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../database/inventory.db');

// Enable logging
const LOG_PATH = path.join(__dirname, '../database/debug.log');
function logDebug(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
    fs.appendFileSync(LOG_PATH, `[${timestamp}] ${message}\n`);
}

// Create database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        logDebug('ERROR: Error opening database: ' + err.message);
    } else {
        logDebug('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database schema if first run
function initializeDatabase() {
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    logDebug('Reading schema.sql from: ' + schemaPath);
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    logDebug('Schema file read, size: ' + schema.length + ' bytes');
    
    // Check if tables exist
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='users';", (err, rows) => {
        if (err) {
            logDebug('ERROR: Error checking tables: ' + err.message);
            return;
        }
        
        logDebug('Tables check result: ' + (rows && rows.length > 0 ? 'Users table exists' : 'Users table does not exist'));
        
        if (rows.length === 0) {
            logDebug('Starting database initialization...');
            // Run schema using exec with proper error handling
            db.serialize(() => {
                db.exec(schema, function(err) {
                    if (err) {
                        logDebug('ERROR: Error initializing database with exec: ' + err.message);
                        // Try alternative method: split and run statements individually
                        const statements = schema.split(';').filter(stmt => stmt.trim());
                        logDebug('Split schema into ' + statements.length + ' statements');
                        let currentIndex = 0;
                        
                        const runNext = () => {
                            if (currentIndex >= statements.length) {
                                logDebug('Database schema initialized successfully with fallback method');
                                return;
                            }
                            
                            const statement = statements[currentIndex].trim();
                            if (!statement) {
                                currentIndex++;
                                runNext();
                                return;
                            }
                            
                            db.run(statement + ';', (err) => {
                                if (err) {
                                    logDebug(`ERROR: Statement ${currentIndex}: ` + err.message);
                                } else {
                                    logDebug(`Executed statement ${currentIndex} successfully`);
                                }
                                currentIndex++;
                                runNext();
                            });
                        };
                        
                        runNext();
                    } else {
                        logDebug('Database schema initialized successfully');
                    }
                });
            });
        } else {
            logDebug('Database already initialized');
            // Run lightweight migrations: ensure new columns exist
            try {
                db.serialize(() => {
                    // Ensure 'source' column exists on issues table (used to track checkout source)
                    db.all("PRAGMA table_info('issues');", (err, cols) => {
                        if (err) {
                            logDebug('ERROR: Unable to read issues table info: ' + err.message);
                            return;
                        }
                        const hasSource = cols && cols.some(c => c.name === 'source');
                        if (!hasSource) {
                            logDebug("Applying migration: add 'source' column to issues table");
                            db.run("ALTER TABLE issues ADD COLUMN source TEXT DEFAULT 'reserve_stock';", (err) => {
                                if (err) logDebug('ERROR: Failed to add source column: ' + err.message);
                                else logDebug("Migration applied: 'source' column added to issues");
                            });
                        }
                    });
                    // Ensure 'added_by' column exists on products table (to store manual 'Added by' text)
                    db.all("PRAGMA table_info('products');", (err2, pcols) => {
                        if (err2) {
                            logDebug('ERROR: Unable to read products table info: ' + err2.message);
                            return;
                        }
                        const hasAddedBy = pcols && pcols.some(c => c.name === 'added_by');
                        if (!hasAddedBy) {
                            logDebug("Applying migration: add 'added_by' column to products table");
                            db.run("ALTER TABLE products ADD COLUMN added_by TEXT DEFAULT NULL;", (err) => {
                                if (err) logDebug('ERROR: Failed to add added_by column: ' + err.message);
                                else logDebug("Migration applied: 'added_by' column added to products");
                            });
                        }
                    });
                });
            } catch (merr) {
                logDebug('ERROR: Migration check failed: ' + merr.message);
            }
        }
    });
}

// Wrapper functions for async operations
const dbPromise = {
    run: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    },
    
    get: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },
    
    all: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }
};

module.exports = { db, dbPromise };
