# Architecture & Design Document

## System Overview

The IITGN Robotics Lab Inventory Management System is a full-stack web application designed to manage equipment and component inventory. It provides real-time tracking, easy checkout/return processes, and comprehensive reporting.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Browser                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Frontend (HTML/CSS/JavaScript)                          ││
│  │ - Login Interface                                       ││
│  │ - Dashboard with Navigation                            ││
│  │ - Dynamic Forms & Tables                               ││
│  │ - Real-time UI Updates                                 ││
│  └─────────────────────────────────────────────────────────┘│
│                           ↕ HTTP/JSON
│                    http://localhost:3000
└─────────────────────────────────────────────────────────────┘
                             ↕
┌─────────────────────────────────────────────────────────────┐
│                    Node.js + Express Server                 │
│  ┌──────────────────────────────────────────────────────────┤
│  │ API Routes (/api/*)                                      │
│  │ - Authentication endpoints                              │
│  │ - Product management                                    │
│  │ - Issue/Return processing                               │
│  │ - Report generation                                     │
│  └──────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┤
│  │ Controllers (Business Logic)                             │
│  │ - Inventory operations                                  │
│  │ - Data validation                                       │
│  │ - Transaction processing                                │
│  └──────────────────────────────────────────────────────────┤
│                         ↕
│  ┌──────────────────────────────────────────────────────────┤
│  │ Database Layer (SQLite)                                  │
│  │ - Connection pooling                                    │
│  │ - Promise-based queries                                 │
│  │ - Transaction handling                                  │
│  └──────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘
                             ↕
┌─────────────────────────────────────────────────────────────┐
│              SQLite Database (inventory.db)                 │
│  - Users Table (Authentication)                            │
│  - Products Table (Catalog)                                │
│  - Inventory Status Table (Current Stock)                  │
│  - Issues Table (Checkouts)                                │
│  - Returns Table (Returns)                                 │
│  - Transaction History (Audit Trail)                       │
└─────────────────────────────────────────────────────────────┘
```

## Database Design

### 1. Users Table
```sql
user_id (INT, PK, AI)
├── username (TEXT, UNIQUE, NOT NULL)
├── password (TEXT, NOT NULL)
├── email (TEXT, UNIQUE, NOT NULL)
├── full_name (TEXT, NOT NULL)
├── role (TEXT, DEFAULT 'user')
└── created_at (DATETIME)
```

**Purpose**: Authentication and access control

### 2. Products Table
```sql
product_id (INT, PK, AI)
├── product_name (TEXT, NOT NULL)
├── description (TEXT)
├── category (TEXT)
├── unit (TEXT)
├── location (TEXT)
├── created_at (DATETIME)
└── updated_at (DATETIME)
```

**Purpose**: Master catalog of all inventory items
**Key Feature**: Auto-increment product_id for easy future additions

### 3. Inventory Status Table
```sql
status_id (INT, PK, AI)
├── product_id (INT, FK)
├── quantity_in_use (INT, DEFAULT 0)
├── quantity_in_stock (INT, DEFAULT 0)
├── quantity_total (INT, DEFAULT 0)
└── last_updated (DATETIME)
```

**Purpose**: Real-time inventory level tracking
**Logic**: 
- `quantity_in_use` = items currently checked out
- `quantity_in_stock` = items available but not in use
- `quantity_total` = sum of both

### 4. Issues Table (Checkouts)
```sql
issue_id (INT, PK, AI)
├── product_id (INT, FK)
├── quantity_issued (INT, NOT NULL)
├── issued_by_user_id (INT, FK)
├── user_name (TEXT, NOT NULL)
├── user_email (TEXT, NOT NULL)
├── purpose (TEXT)
├── issue_date (DATE) ← AUTO RECORDED
├── issue_time (TIME) ← AUTO RECORDED
├── expected_return_date (DATE)
├── status (TEXT, DEFAULT 'issued')
└── created_at (DATETIME)
```

**Purpose**: Track all item checkouts
**Key Features**:
- Automatic date/time recording
- User identification (name + email)
- Status tracking (issued → returned)
- Audit trail timestamp

### 5. Returns Table
```sql
return_id (INT, PK, AI)
├── issue_id (INT, FK)
├── product_id (INT, FK)
├── quantity_returned (INT, NOT NULL)
├── condition (TEXT)
├── notes (TEXT)
├── return_date (DATE) ← AUTO RECORDED
├── return_time (TIME) ← AUTO RECORDED
├── received_by_user_id (INT, FK)
└── created_at (DATETIME)
```

**Purpose**: Track all item returns
**Condition Options**:
- good
- damaged
- needs-repair
- lost

### 6. Transaction History Table
```sql
transaction_id (INT, PK, AI)
├── transaction_type (TEXT)
├── product_id (INT, FK)
├── quantity_change (INT)
├── performed_by_user_id (INT, FK)
├── reference_id (INT)
├── reference_type (TEXT)
├── notes (TEXT)
└── created_at (DATETIME)
```

**Purpose**: Audit trail of all operations
**Transaction Types**: ISSUE, RETURN, ADD, UPDATE

## API Endpoints

### Authentication
```
POST /api/login
Request: { username, password }
Response: { success, user: { user_id, username, email, role } }
```

### Products
```
GET /api/products
Response: [ { product_id, product_name, quantity_in_use, quantity_in_stock... } ]

POST /api/products
Request: { product_name, category, unit, location, quantity_in_stock }
Response: { success, product_id }
```

### Issues (Checkouts)
```
POST /api/issues
Request: { 
  items: [ { product_id, quantity }, ... ],
  user_name, 
  user_email, 
  purpose,
  user_id 
}
Response: { success, issued_items: [...] }

GET /api/issues/pending
Response: [ { issue_id, product_id, quantity_issued, user_name, status... } ]
```

### Returns
```
POST /api/returns
Request: { issue_id, quantity_returned, condition, notes, user_id }
Response: { success, return_id }
```

### Reports
```
GET /api/report/inventory
Response: [ { product_id, product_name, quantity_in_use, quantity_in_stock, quantity_total... } ]
```

## Frontend Components

### 1. Login Page (index.html)
- Simple, centered design
- Error/success messages
- Demo credentials display
- Responsive on all devices

### 2. Dashboard (dashboard.html)
- **Sidebar Navigation**: Sticky menu for section switching
- **Header**: User info and logout button
- **Main Content**: Dynamic section display

### Sections
1. **Inventory Status**
   - Two tables: Items In Use, Items In Stock
   - Real-time updates
   - Product ID highlighting

2. **Issue Items**
   - Product checkbox list
   - Auto-disable unavailable items
   - Selected items summary with quantity inputs
   - User form (name, email)
   - Auto-recorded date/time display
   - Purpose field

3. **Returns**
   - Pending issues table
   - Modal for return processing
   - Condition selection
   - Notes field

4. **Add Product**
   - Product form with validation
   - Category dropdown
   - Auto-increment product ID generation
   - Success confirmation with ID

5. **Report**
   - Complete inventory snapshot
   - Summary statistics
   - Category-based sorting
   - Export-ready format

## Frontend JavaScript Flow

```
App Initialization
├── Check localStorage for user
├── If no user → Redirect to login
└── If user exists → Initialize dashboard
    ├── Load all products
    ├── Setup navigation handlers
    ├── Setup form listeners
    └── Display default section

User Interaction
├── Select products/quantities
├── Fill forms
├── Submit
│   ├── Validate input
│   ├── Fetch API
│   ├── Show success/error
│   ├── Reload data
│   └── Update UI
└── Navigate between sections
    ├── Hide all sections
    ├── Show selected section
    └── Load section data if needed
```

## Backend Request Processing

```
API Request → Express Router
├── Route Matching
├── Middleware (CORS, body-parser)
└── Controller Handler
    ├── Input Validation
    ├── Business Logic
    │   ├── Database Query
    │   ├── Data Manipulation
    │   ├── Inventory Updates
    │   └── Transaction Logging
    ├── Error Handling
    └── JSON Response
        ├── { success: true, data }
        └── { success: false, message }
```

## Key Features Implementation

### 1. Auto-recorded Date/Time
Files involved: `backend/controllers/inventory.js`, `database/schema.sql`

```sql
-- Database records automatically
issue_date DATE DEFAULT CURRENT_DATE
issue_time TIME DEFAULT CURRENT_TIME

-- Frontend displays current time
JavaScript: new Date().toLocaleDateString('en-IN')
```

### 2. Unavailable Item Detection
Files involved: `backend/controllers/inventory.js`, `frontend/js/app.js`

```javascript
// Calculate total availability
const total = (product.quantity_in_stock || 0) + (product.quantity_in_use || 0);
const isUnavailable = total === 0;

// Disable checkbox if unavailable
input.disabled = isUnavailable
```

### 3. Product Auto-Increment
SQLite native feature:
```sql
product_id INTEGER PRIMARY KEY AUTOINCREMENT
-- Automatically generates: 1, 2, 3, 4...
```

### 4. Inventory Transactions
Files involved: `backend/controllers/inventory.js`

```javascript
// When issuing: stock → in_use
UPDATE inventory_status 
SET quantity_in_stock = quantity_in_stock - ?,
    quantity_in_use = quantity_in_use + ?

// When returning: in_use → stock
UPDATE inventory_status 
SET quantity_in_use = quantity_in_use - ?,
    quantity_in_stock = quantity_in_stock + ?
```

### 5. User Authentication
Files involved: `backend/controllers/inventory.js`, `frontend/js/app.js`

```javascript
// Login stores user in localStorage
localStorage.setItem('user', JSON.stringify(currentUser))

// Dashboard checks on load
const userStr = localStorage.getItem('user')
if (!userStr) window.location.href = '/'
```

## Error Handling

### Frontend (app.js)
```javascript
showError(message)    // Display error alert for 5 seconds
showSuccess(message)  // Display success alert for 5 seconds
```

### Backend (controllers/inventory.js)
```javascript
try {
    // Validation
    if (!data) throw new Error('Missing data')
    
    // Database operations
    const result = await dbPromise.run(sql, params)
    
    // Return success
    res.json({ success: true })
    
} catch (err) {
    res.status(500).json({
        success: false,
        message: err.message,
        error: process.env.NODE_ENV === 'development' ? err : undefined
    })
}
```

## Security Implemented

✅ **Already in place**:
- SQL injection prevention (parameterized queries)
- CORS enabled
- Request body parsing with limits
- Separate environment variables (.env)
- Async/await for error prevention

⚠️ **Todo for production**:
- Password hashing (bcryptjs imported, not yet used)
- JWT tokens instead of localStorage
- HTTPS/SSL certificates
- Rate limiting
- Input sanitization
- HTTPS-only cookies
- CSRF protection

## Performance Optimizations

1. **Database Indexes**
   - On frequently queried columns
   - Product queries, user lookups, etc.

2. **Lazy Loading**
   - Load products only when needed
   - Sections render on-demand

3. **Connection Pooling**
   - SQLite handles single connection efficiently
   - Production: migrate to PostgreSQL with pooling

4. **Frontend Caching**
   - localStorage for user session
   - Reduce re-authentication

## Scalability Considerations

**Current**: Single SQLite database, suitable for <1000 users

**For larger scale**:
1. Migrate to PostgreSQL
2. Implement connection pooling
3. Add caching layer (Redis)
4. Separate read/write APIs
5. Implement pagination for large datasets
6. Add search/filter optimization
7. Consider microservices architecture

## Testing Scenarios

### 1. Basic Workflow
- [ ] Login
- [ ] Add product
- [ ] Verify in inventory
- [ ] Issue items
- [ ] Check inventory update
- [ ] Return items
- [ ] Verify inventory returned to stock

### 2. Edge Cases
- [ ] Issue more than available → Error
- [ ] Issue with empty name/email → Error
- [ ] Return more than issued → Error
- [ ] Logout and login → Session restored
- [ ] Same item issued multiple times → Tracked separately

### 3. Data Validation
- [ ] Product ID auto-increments correctly
- [ ] Quantities never negative
- [ ] Dates format correctly
- [ ] Emails validated
- [ ] Quantities are integers

## Future Enhancement Opportunities

1. **User Roles**
   - Admin (full access)
   - Faculty (can issue/return)
   - Lab Tech (can manage inventory)

2. **Barcode/QR Code**
   - Scan instead of manual selection
   - Faster checkouts

3. **Email Notifications**
   - Checkout confirmation
   - Return reminders

4. **Maintenance Tracking**
   - Equipment service history
   - Maintenance schedules

5. **Cost Analysis**
   - Equipment cost tracking
   - Usage analytics
   - ROI calculation

6. **Multi-Lab Support**
   - Multiple lab inventories
   - Inter-lab transfers

7. **Mobile App**
   - Native iOS/Android
   - Offline mode

8. **Advanced Analytics**
   - Usage trends
   - Most borrowed items
   - Equipment utilization

---

This architecture provides a robust, scalable foundation for the IITGN Robotics Lab inventory management needs.
