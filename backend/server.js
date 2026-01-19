const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

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
