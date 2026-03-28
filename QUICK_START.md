# Quick Start Guide - IITGN Robotics Lab Inventory System

## ⚡ Quick Setup (5 minutes)

### 1. Open PowerShell and navigate to the backend folder:
```powershell
cd "c:\Users\vanth\Desktop\inventory\backend"
```

### 2. Install dependencies:
```powershell
npm install
```

This will install:
- express (web framework)
- sqlite3 (database)
- cors (cross-origin requests)
- body-parser (request parsing)

### 3. Start the application:
```powershell
npm start
```

You should see:
```
Connected to SQLite database
Database schema initialized successfully
Server running on http://localhost:3000
```

### 4. Open the application:
Visit in your browser: **http://localhost:3000**

### 5. Login with demo credentials:
- **Username**: admin
- **Password**: admin123

## 📊 What You'll See

### Login Page
- Professional IITGN Robotics Lab branding
- Demo credentials displayed
- Error handling for invalid login

### Dashboard
Has 5 main sections:

1. **📦 Inventory Status**
   - Items Currently In Use
   - Items In Stock
   - All items show Product ID, Name, Category, Unit

2. **📤 Issue Items** (Checkout)
   - Select items with checkboxes
   - Specify quantities
   - Enter your name and email
   - **Date & time auto-recorded**
   - See selected items before submitting

3. **📥 Returns**
   - See all pending checkouts
   - Click "Return" to process returns
   - Track item condition (Good, Damaged, etc.)

4. **➕ Add Product**
   - Add new items to inventory
   - Product ID auto-generated
   - Choose category, unit, quantity
   - Add storage location

5. **📊 Report**
   - View complete inventory
   - See totals for each product
   - Summary statistics

## 🧪 Test Workflow

### Step 1: Add a Product
1. Go to "➕ Add Product"
2. Fill in:
   - Product Name: "Servo Motor"
   - Category: "Motors"
   - Unit: "Piece"
   - Location: "Shelf A1"
   - Initial Quantity: "5"
3. Click "Add Product"
4. You'll see Product ID (auto-generated, e.g., #1)

### Step 2: Check Inventory
1. Go to "📦 Inventory Status"
2. Should see "Servo Motor" in "Items In Stock"

### Step 3: Issue Items
1. Go to "📤 Issue Items"
2. Find and check "Servo Motor" checkbox
3. Change quantity to 2
4. Enter your name and email
5. Click "Issue Selected Items"
6. Notice: Date/Time auto-recorded!

### Step 4: Check Updated Inventory
1. Go back to "📦 Inventory Status"
2. "Items In Use" now shows 2 Servo Motors
3. "Items In Stock" shows 3 remaining

### Step 5: Return Items
1. Go to "📥 Returns"
2. See pending issue for Servo Motor
3. Click "Return" button
4. Set quantity and condition, click "Process Return"
5. Items moved back to stock

### Step 6: View Report
1. Go to "📊 Report"
2. See complete inventory summary
3. Shows In Use, In Stock, and Totals

## 🎯 Key Features to Try

✅ **Multi-Select Checkout**
- Select multiple items at once
- Each with different quantities
- Process all together

✅ **Unavailable Items**
- Try adding product with 0 quantity
- Won't show up as issuable
- Appears dimmed in list

✅ **Data Validation**
- Try issuing more than available
- Try invalid email
- App shows clear error messages

✅ **Real-time Updates**
- Add product
- Check inventory updates
- Issue items
- Return items
- Everything reflected instantly

## 🛠️ Development Tips

### Database Reset
If you want to start fresh:
1. Close the server (Ctrl+C)
2. Delete `database/inventory.db`
3. Restart with `npm start`
4. Database recreates with schema

### View Database
To see actual data stored:
1. Install SQLite Browser: https://sqlitebrowser.org/
2. Open `database/inventory.db`
3. Browse tables and data

### Check Server Logs
All operations logged to console:
- Product added/issued/returned
- Errors shown with details
- Timestamps for debugging

## 📱 Mobile & Responsive

The system works on:
- Desktop (optimal)
- Tablet
- Mobile (portrait and landscape)
- All modern browsers (Chrome, Firefox, Safari, Edge)

Try resizing your browser window to see responsive design!

## ⚙️ Backend Port

By default, server runs on port **3000**.

If this port is in use:
1. Edit `backend/.env`
2. Change: `PORT=3001`
3. Restart server
4. Visit: `http://localhost:3001`

## 🐛 Common Issues

### "Server error" when submitting?
- Check PowerShell for detailed error message
- Most common: port already in use

### Can't login?
- Username: exactly "admin" (lowercase)
- Password: exactly "admin123"
- Click login, not just press Enter

### No products showing?
- Add product first using "Add Product" section
- Product needs quantity > 0 to appear

### Date/Time not updating?
- Refresh page to see latest time
- Check system timezone settings

## 📞 Need Help?

1. **Check browser console**: F12 → Console tab
2. **Check server logs**: PowerShell window running server
3. **Read README.md**: Full documentation
4. **Check database**: Use SQLite Browser

## 🚀 What's Next?

After testing prototype:
1. Provide feedback on UI/UX
2. Request feature changes
3. Add custom product categories
4. Setup on lab network
5. Create additional user accounts
6. Customize branding/colors

Feedback will help refine the system!

---

**Happy Testing! 🤖**
