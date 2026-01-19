# delevery-expense
Swiggy/Zomato expense tracker

## Overview
Track your food delivery spending habits with beautiful visualizations. Analyze your total spend, monthly breakdown, and custom date ranges.

## Features
- 🔐 **Automated Swiggy Login**: Login with OTP and automatically scrape your order history
- 📊 Upload order data via JSON file or paste JSON directly
- 💰 Calculate total spend across all orders
- 📅 Monthly spend breakdown with charts
- 🔍 Custom date range analysis
- 📈 Interactive visualizations using Chart.js
- 🎨 Beautiful, responsive UI
- 🤖 Headless browser automation using Playwright

## Project Structure
```
delevery-expense/
├── backend/              # Node.js Express API server
│   ├── server.js         # Main server file
│   ├── swiggy-scraper.js # Swiggy web scraping module
│   └── package.json      # Backend dependencies
├── frontend/             # React frontend application
│   ├── src/
│   │   ├── App.js        # Main React component
│   │   └── App.css       # Styling
│   └── package.json      # Frontend dependencies
└── README.md
```

## Setup and Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Backend Setup
```bash
cd backend
npm install
npm start
```
The backend server will start on `http://localhost:5000`

### Frontend Setup
```bash
cd frontend
npm install
npm start
```
The frontend will start on `http://localhost:3000`

## Usage

### Data Format
Your order data should be in JSON format with the following structure:
```json
[
  {
    "date": "2024-01-15",
    "amount": 350,
    "restaurant": "Pizza Place"
  },
  {
    "date": "2024-02-20",
    "amount": 480,
    "restaurant": "Burger Joint"
  }
]
```

### Getting Your Swiggy Order Data

#### Option 1: Automated Scraping (Recommended)
1. Click on **"Login to Swiggy"** in the application
2. Enter your 10-digit mobile number registered with Swiggy
3. Click **"Send OTP"**
4. Check your mobile for the OTP from Swiggy
5. Enter the OTP and click **"Verify OTP"**
6. The application will automatically scrape your order history from Swiggy
7. Your orders will be loaded and ready for analysis!

**Note**: This feature uses headless browser automation to fetch your orders securely. Your credentials are not stored.

#### Option 2: Manual Upload
1. **JSON File Upload**: Upload a JSON file with your order history
2. **Paste JSON**: Copy and paste JSON data directly
3. **Sample Data**: Use the "Load Sample Data" button to see how the app works

### Using the Application

1. **Upload Data**: 
   - Click "Choose File" to upload a JSON file, OR
   - Paste JSON data directly into the text area, OR
   - Click "Load Sample Data" to try with sample orders

2. **Swiggy Login** (Alternative):
   - Enter your mobile number and click "Send OTP"
   - Enter the OTP you receive and click "Verify OTP"
   - Wait for orders to be automatically scraped from Swiggy

3. **Overall Analysis**:
   - Click "Analyze All Orders" to see total spend, order count, average order value, and monthly breakdown

4. **Date Range Analysis**:
   - Select start and end dates
   - Click "Analyze Date Range" to see spending for that specific period

## API Endpoints

### Swiggy Scraping Endpoints

#### `POST /api/swiggy/login`
Initialize Swiggy login and send OTP.

**Request Body:**
```json
{
  "mobileNumber": "9876543210"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "session_xxx",
  "needsOtp": true,
  "message": "OTP sent to mobile number"
}
```

#### `POST /api/swiggy/submit-otp`
Verify OTP and complete login.

**Request Body:**
```json
{
  "sessionId": "session_xxx",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful"
}
```

#### `POST /api/swiggy/scrape-orders`
Scrape orders from Swiggy after successful login.

**Request Body:**
```json
{
  "sessionId": "session_xxx"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully scraped 24 orders",
  "orders": [
    {"date": "2024-01-15", "amount": 350, "restaurant": "Pizza Place"}
  ]
}
```

### Analysis Endpoints

#### `POST /api/analyze`
Analyze all orders and get spending statistics.

**Request Body:**
```json
{
  "orders": [
    {"date": "2024-01-15", "amount": 350, "restaurant": "Pizza Place"}
  ]
}
```

**Response:**
```json
{
  "totalSpend": "350.00",
  "monthlySpend": {
    "2024-01": 350
  },
  "averageOrderValue": "350.00",
  "orderCount": 1,
  "dateRange": {
    "start": "2024-01-15",
    "end": "2024-01-15"
  }
}
```

#### `POST /api/analyze-range`
Analyze orders within a specific date range.

**Request Body:**
```json
{
  "orders": [...],
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}
```

## Technologies Used

### Backend
- Node.js
- Express.js
- Playwright-core (for web scraping)
- CORS
- Body-parser

### Frontend
- React 18
- Chart.js & react-chartjs-2
- Axios
- CSS3

## Security & Privacy
- User credentials are never stored on the server
- Browser sessions are temporary and cleaned up after scraping
- All scraping is done server-side using headless browser automation
- OTP verification happens directly with Swiggy

## Contributing
Feel free to submit issues and enhancement requests!

## License
See LICENSE file for details.
