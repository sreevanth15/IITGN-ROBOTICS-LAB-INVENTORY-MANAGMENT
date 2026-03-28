# IITGN Robotics Lab - Inventory Management System

A comprehensive, user-friendly inventory management system designed for the IITGN Robotics Lab. Features real-time tracking of equipment, automated date/time recording, and easy item checkout/return processes.

## Features

✅ **Authentication System**
- Secure login with username and password
- Default admin account for initial setup

✅ **Inventory Management**
- Real-time inventory tracking
- Two-section view: "In Use" and "In Stock"
- Product categorization and automatic ID generation

✅ **Issue (Checkout) System**
- Multi-item selection with checkboxes
- Quantity specification per item
- User information capture (name, email)
- **Automatic date and time recording**
- Purpose tracking for audit trail

✅ **Return Management**
- Easy return processing for issued items
- Condition tracking (Good, Damaged, Needs Repair, Lost)
- Return notes for documentation

✅ **Product Management**
- Add new products with auto-incrementing product IDs
- Category-based organization
- Location/storage tracking
- Unit specification

✅ **Reporting**
- Complete inventory status report
- Summary statistics
- Transaction history tracking

✅ **User Experience**
- Modern, responsive UI
- Professional styling suitable for lab environment
- Real-time status updates
- Intuitive navigation

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **Responsive Design**: Mobile-friendly

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

### Step 1: Install Dependencies

```bash
cd c:\Users\vanth\Desktop\inventory\backend
npm install
```

### Step 2: Initialize Database

The database will be automatically initialized on first run with the schema from `database/schema.sql`.

### Step 3: Start the Server

```bash
npm start
```

The server will run on `http://localhost:3000`

### Step 4: Access the Application

Open your browser and go to:
```
http://localhost:3000
```

## Login Credentials (Demo)

**Default Admin Account:**
- Username: `admin`
- Password: `admin123`

⚠️ **Important**: Change these credentials in production!

## Project Structure

```
inventory/
├── frontend/
│   ├── index.html              # Login page
│   ├── dashboard.html          # Main dashboard
│   ├── css/
│   │   └── style.css           # Styling
│   └── js/
│       └── app.js              # Frontend logic
├── backend/
│   ├── server.js               # Express server
│   ├── db.js                   # Database configuration
│   ├── package.json            # Dependencies
│   ├── routes/
│   │   └── api.js              # API routes
│   └── controllers/
│       └── inventory.js        # Business logic
└── database/
    └── schema.sql              # Database schema
```

## Database Schema

### Users Table
- `user_id` (Primary Key, Auto-increment)
- `username`, `password`, `email`, `full_name`, `role`
- Tracks system users and permissions

### Products Table
- `product_id` (Primary Key, Auto-increment)
- `product_name`, `description`, `category`, `unit`, `location`
- Main product catalog

### Inventory Status Table
- Tracks quantities in-use and in-stock for each product
- Real-time inventory levels

### Issues (Checkout) Table
- `issue_id`, `product_id`, `quantity_issued`
- `user_name`, `user_email`, `issue_date`, `issue_time`
- Automatic timestamp recording
- Status tracking (issued/returned)

### Returns Table
- `return_id`, `issue_id`, `product_id`, `quantity_returned`
- `condition`, `notes`, `return_date`, `return_time`
- Tracks all returned items with condition

### Transaction History Table
- Audit trail of all operations
- Reference tracking for issues/returns

## API Endpoints

### Authentication
- `POST /api/login` - User login

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Add new product

### Issues (Checkouts)
- `POST /api/issues` - Issue items
- `GET /api/issues/pending` - Get pending checkouts

### Returns
- `POST /api/returns` - Process item return

### Reports
- `GET /api/report/inventory` - Get inventory report

## Usage Guide

### 1. **Login**
- Use default credentials or create new user
- Navigate to dashboard

### 2. **View Inventory**
- Go to "Inventory Status"
- View items in-use and in-stock separately
- Unavailable items shown in dim color

### 3. **Issue Items**
- Navigate to "Issue Items"
- Select items with checkboxes
- Specify quantities (cannot exceed available)
- Enter your name and email
- Add purpose (optional)
- Date and time auto-recorded
- Click "Issue Selected Items"

### 4. **Return Items**
- Go to "Returns"
- Find pending issue
- Click "Return" button
- Specify quantity and condition
- Add notes if needed
- Process return

### 5. **Add New Product**
- Go to "Add Product"
- Fill product details
- Product ID auto-generated
- Category, unit required
- Initial quantity optional

### 6. **View Reports**
- Check "Report" section
- See full inventory summary
- Total counts for in-use and in-stock

## Key Features Explained

### Auto-Recorded Date & Time
When issuing items, the current date and time are automatically captured:
- Date format: Based on system locale
- Time format: 24-hour with seconds
- Stored in database for audit trail

### Unavailable Items
Items with zero total quantity appear:
- Dimmed/grayed out in the issue interface
- Disabled checkbox (cannot select)
- Clear visual indicator

### Product Auto-Increment
New products automatically receive:
- Unique product_id (auto-increment)
- Easy future additions without manual ID assignment
- All products tracked with IDs

### Quantity Validation
System ensures:
- Cannot issue more than available
- Quantity input bounded by available stock
- Real-time inventory updates

## Troubleshooting

### Server won't start
- Check if port 3000 is available
- Change PORT in `.env` if needed
- Ensure Node.js is installed

### Database not initializing
- Delete `database/inventory.db` to reset
- Re-run `npm start`
- Check file permissions in database folder

### Frontend not loading
- Verify backend is running
- Check browser console for errors
- Ensure API_URL in `app.js` matches server URL

### Items not appearing
- Go to "Add Product" and add items first
- Ensure products have quantities
- Refresh page if cached

## Future Enhancements

- [ ] User role-based access control (Labs, Faculty, Admin)
- [ ] Email notifications for issued items
- [ ] Barcode/QR code integration
- [ ] Equipment maintenance history
- [ ] Cost tracking and budgeting
- [ ] Advanced reporting with charts
- [ ] Multi-lab support
- [ ] Mobile app (React Native)
- [ ] Integration with IIT-G systems

## Security Considerations

⚠️ For Production:
1. Use environment variables for sensitive data
2. Hash passwords (bcrypt is already imported)
3. Implement JWT authentication
4. Use HTTPS
5. Add CORS restrictions
6. Implement rate limiting
7. Regular database backups
8. SQL injection prevention (parameterized queries already used)

## Support & Contributions

For the IITGN Robotics Lab team:
- Document all custom additions
- Follow SQL naming conventions
- Test thoroughly before deployment
- Keep database backups

## License

This system is designed specifically for IITGN Robotics Lab. Please contact lab administration for usage terms.

---

**Version**: 1.0.0  
**Last Updated**: March 2026  
**Built for**: IITGN Robotics Lab, IIT Gandhinagar
