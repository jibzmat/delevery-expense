const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const { initSwiggyLogin, submitOTP, scrapeOrders, cleanupSession } = require('./swiggy-scraper');

const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiting for login endpoints to prevent abuse
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: 'Too many login attempts from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 OTP attempts per windowMs
  message: 'Too many OTP attempts from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Helper function to parse date from various formats
function parseDate(dateStr) {
  return new Date(dateStr);
}

// Helper function to calculate monthly spend
function calculateMonthlySpend(orders) {
  const monthlyData = {};
  
  orders.forEach(order => {
    if (order.date && order.amount) {
      const date = parseDate(order.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = 0;
      }
      monthlyData[monthKey] += parseFloat(order.amount);
    }
  });
  
  return monthlyData;
}

// Helper function to calculate spend in date range
function calculateSpendInRange(orders, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return orders
    .filter(order => {
      const orderDate = parseDate(order.date);
      return orderDate >= start && orderDate <= end;
    })
    .reduce((total, order) => total + parseFloat(order.amount), 0);
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Initialize Swiggy login
app.post('/api/swiggy/login', loginLimiter, async (req, res) => {
  try {
    const { mobileNumber } = req.body;
    
    if (!mobileNumber) {
      return res.status(400).json({ error: 'Mobile number is required' });
    }

    // Generate session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const result = await initSwiggyLogin(mobileNumber, sessionId);
    res.json(result);
  } catch (error) {
    console.error('Error in Swiggy login:', error);
    res.status(500).json({ error: 'Login failed', message: error.message });
  }
});

// Submit OTP
app.post('/api/swiggy/submit-otp', otpLimiter, async (req, res) => {
  try {
    const { sessionId, otp } = req.body;
    
    if (!sessionId || !otp) {
      return res.status(400).json({ error: 'Session ID and OTP are required' });
    }

    const result = await submitOTP(sessionId, otp);
    res.json(result);
  } catch (error) {
    console.error('Error submitting OTP:', error);
    res.status(500).json({ error: 'OTP verification failed', message: error.message });
  }
});

// Scrape orders from Swiggy
app.post('/api/swiggy/scrape-orders', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const result = await scrapeOrders(sessionId);
    res.json(result);
  } catch (error) {
    console.error('Error scraping orders:', error);
    res.status(500).json({ error: 'Order scraping failed', message: error.message });
  }
});

// Cancel/cleanup session
app.post('/api/swiggy/cancel-session', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    await cleanupSession(sessionId);
    res.json({ success: true, message: 'Session cleaned up' });
  } catch (error) {
    console.error('Error cleaning up session:', error);
    res.status(500).json({ error: 'Cleanup failed', message: error.message });
  }
});

// Analyze orders
app.post('/api/analyze', (req, res) => {
  try {
    const { orders } = req.body;
    
    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ error: 'Orders array is required' });
    }
    
    // Calculate total spend
    const totalSpend = orders.reduce((sum, order) => sum + parseFloat(order.amount || 0), 0);
    
    // Calculate monthly spend
    const monthlySpend = calculateMonthlySpend(orders);
    
    // Calculate average order value
    const averageOrderValue = orders.length > 0 ? totalSpend / orders.length : 0;
    
    // Find date range
    const dates = orders.map(o => parseDate(o.date)).filter(d => !isNaN(d));
    const minDate = dates.length > 0 ? new Date(Math.min(...dates)) : null;
    const maxDate = dates.length > 0 ? new Date(Math.max(...dates)) : null;
    
    res.json({
      totalSpend: totalSpend.toFixed(2),
      monthlySpend,
      averageOrderValue: averageOrderValue.toFixed(2),
      orderCount: orders.length,
      dateRange: {
        start: minDate ? minDate.toISOString().split('T')[0] : null,
        end: maxDate ? maxDate.toISOString().split('T')[0] : null
      }
    });
  } catch (error) {
    console.error('Error analyzing orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Analyze orders in specific date range
app.post('/api/analyze-range', (req, res) => {
  try {
    const { orders, startDate, endDate } = req.body;
    
    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ error: 'Orders array is required' });
    }
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }
    
    const spendInRange = calculateSpendInRange(orders, startDate, endDate);
    const filteredOrders = orders.filter(order => {
      const orderDate = parseDate(order.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return orderDate >= start && orderDate <= end;
    });
    
    const monthlySpend = calculateMonthlySpend(filteredOrders);
    
    res.json({
      totalSpend: spendInRange.toFixed(2),
      orderCount: filteredOrders.length,
      monthlySpend,
      dateRange: {
        start: startDate,
        end: endDate
      }
    });
  } catch (error) {
    console.error('Error analyzing date range:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
