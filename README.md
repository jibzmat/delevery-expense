# delevery-expense
Swiggy/Zomato expense tracker

## Overview
Track your food delivery spending habits with beautiful visualizations. Analyze your total spend, monthly breakdown, and custom date ranges.

## Features
- 📊 Upload order data via JSON file or paste JSON directly
- 💰 Calculate total spend across all orders
- 📅 Monthly spend breakdown with charts
- 🔍 Custom date range analysis
- 📈 Interactive visualizations using Chart.js
- 🎨 Beautiful, responsive UI

## Project Structure
```
delevery-expense/
├── backend/          # Node.js Express API server
│   ├── server.js     # Main server file
│   └── package.json  # Backend dependencies
├── frontend/         # React frontend application
│   ├── src/
│   │   ├── App.js    # Main React component
│   │   └── App.css   # Styling
│   └── package.json  # Frontend dependencies
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
Since Swiggy doesn't provide a direct export feature, you can:

1. **Manual Entry**: Create a JSON file with your order history manually
2. **Browser Console**: Use browser developer tools to extract order data from the Swiggy orders page
3. **Sample Data**: Use the "Load Sample Data" button to see how the app works

### Using the Application

1. **Upload Data**: 
   - Click "Choose File" to upload a JSON file, OR
   - Paste JSON data directly into the text area, OR
   - Click "Load Sample Data" to try with sample orders

2. **Overall Analysis**:
   - Click "Analyze All Orders" to see total spend, order count, average order value, and monthly breakdown

3. **Date Range Analysis**:
   - Select start and end dates
   - Click "Analyze Date Range" to see spending for that specific period

## API Endpoints

### `POST /api/analyze`
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

### `POST /api/analyze-range`
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
- CORS
- Body-parser

### Frontend
- React
- Chart.js & react-chartjs-2
- Axios
- CSS3

## Contributing
Feel free to submit issues and enhancement requests!

## License
See LICENSE file for details.
