import React, { useState } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import './App.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

function App() {
  const [orders, setOrders] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [rangeAnalysis, setRangeAnalysis] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (Array.isArray(data)) {
            setOrders(data);
            setError('');
          } else {
            setError('Invalid JSON format. Please upload an array of orders.');
          }
        } catch (err) {
          setError('Error parsing JSON file: ' + err.message);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleTextInput = (event) => {
    try {
      const data = JSON.parse(event.target.value);
      if (Array.isArray(data)) {
        setOrders(data);
        setError('');
      } else {
        setError('Invalid JSON format. Please provide an array of orders.');
      }
    } catch (err) {
      // User is still typing, don't show error yet
    }
  };

  const analyzeOrders = async () => {
    if (orders.length === 0) {
      setError('Please add orders first');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_URL}/api/analyze`, { orders });
      setAnalysis(response.data);
    } catch (err) {
      setError('Error analyzing orders: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const analyzeRange = async () => {
    if (orders.length === 0) {
      setError('Please add orders first');
      return;
    }

    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_URL}/api/analyze-range`, {
        orders,
        startDate,
        endDate
      });
      setRangeAnalysis(response.data);
    } catch (err) {
      setError('Error analyzing date range: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const loadSampleData = () => {
    const sampleOrders = [
      { date: '2024-01-15', amount: 350, restaurant: 'Pizza Place' },
      { date: '2024-01-20', amount: 280, restaurant: 'Burger Joint' },
      { date: '2024-02-05', amount: 420, restaurant: 'Chinese Express' },
      { date: '2024-02-14', amount: 890, restaurant: 'Fine Dining' },
      { date: '2024-02-28', amount: 310, restaurant: 'Taco Stand' },
      { date: '2024-03-10', amount: 450, restaurant: 'Italian Bistro' },
      { date: '2024-03-22', amount: 380, restaurant: 'Sushi Bar' },
      { date: '2024-04-05', amount: 290, restaurant: 'Cafe Corner' },
      { date: '2024-04-18', amount: 510, restaurant: 'BBQ House' },
      { date: '2024-05-02', amount: 340, restaurant: 'Thai Kitchen' },
      { date: '2024-05-20', amount: 460, restaurant: 'Mediterranean Grill' },
      { date: '2024-06-08', amount: 390, restaurant: 'Mexican Cantina' }
    ];
    setOrders(sampleOrders);
    setError('');
  };

  const getMonthlyChartData = () => {
    if (!analysis?.monthlySpend) return null;

    const months = Object.keys(analysis.monthlySpend).sort();
    const values = months.map(month => analysis.monthlySpend[month]);

    return {
      labels: months,
      datasets: [
        {
          label: 'Monthly Spend (₹)',
          data: values,
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
      ],
    };
  };

  const getRangeChartData = () => {
    if (!rangeAnalysis?.monthlySpend) return null;

    const months = Object.keys(rangeAnalysis.monthlySpend).sort();
    const values = months.map(month => rangeAnalysis.monthlySpend[month]);

    return {
      labels: months,
      datasets: [
        {
          label: 'Monthly Spend in Range (₹)',
          data: values,
          backgroundColor: 'rgba(153, 102, 255, 0.6)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 1,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Spend Analysis',
      },
    },
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🍔 Swiggy Expense Tracker</h1>
        <p className="subtitle">Track your food delivery spending habits</p>
      </header>

      <div className="container">
        <section className="input-section">
          <h2>📊 Upload Your Orders</h2>
          <p className="info-text">
            Upload your Swiggy order data as JSON. Each order should have: date, amount, and optionally restaurant name.
          </p>
          
          <div className="input-methods">
            <div className="input-method">
              <h3>Upload JSON File</h3>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="file-input"
              />
            </div>

            <div className="input-method">
              <h3>Or Paste JSON Data</h3>
              <textarea
                placeholder='[{"date": "2024-01-15", "amount": 350, "restaurant": "Restaurant Name"}]'
                onChange={handleTextInput}
                className="json-input"
                rows="6"
              />
            </div>

            <div className="input-method">
              <h3>Or Try Sample Data</h3>
              <button onClick={loadSampleData} className="btn btn-secondary">
                Load Sample Data
              </button>
            </div>
          </div>

          {orders.length > 0 && (
            <div className="orders-count">
              ✅ {orders.length} orders loaded
            </div>
          )}

          {error && <div className="error">{error}</div>}
        </section>

        {orders.length > 0 && (
          <>
            <section className="analysis-section">
              <h2>📈 Overall Analysis</h2>
              <button
                onClick={analyzeOrders}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? 'Analyzing...' : 'Analyze All Orders'}
              </button>

              {analysis && (
                <div className="results">
                  <div className="stats-grid">
                    <div className="stat-card">
                      <h3>Total Spend</h3>
                      <p className="stat-value">₹{analysis.totalSpend}</p>
                    </div>
                    <div className="stat-card">
                      <h3>Total Orders</h3>
                      <p className="stat-value">{analysis.orderCount}</p>
                    </div>
                    <div className="stat-card">
                      <h3>Average Order Value</h3>
                      <p className="stat-value">₹{analysis.averageOrderValue}</p>
                    </div>
                    {analysis.dateRange && (
                      <div className="stat-card">
                        <h3>Date Range</h3>
                        <p className="stat-value-small">
                          {analysis.dateRange.start} to {analysis.dateRange.end}
                        </p>
                      </div>
                    )}
                  </div>

                  {getMonthlyChartData() && (
                    <div className="chart-container">
                      <h3>Monthly Spend Breakdown</h3>
                      <Bar data={getMonthlyChartData()} options={chartOptions} />
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="range-section">
              <h2>📅 Date Range Analysis</h2>
              <div className="date-inputs">
                <div className="date-input-group">
                  <label>Start Date:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="date-input"
                  />
                </div>
                <div className="date-input-group">
                  <label>End Date:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="date-input"
                  />
                </div>
              </div>

              <button
                onClick={analyzeRange}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? 'Analyzing...' : 'Analyze Date Range'}
              </button>

              {rangeAnalysis && (
                <div className="results">
                  <div className="stats-grid">
                    <div className="stat-card">
                      <h3>Total Spend in Range</h3>
                      <p className="stat-value">₹{rangeAnalysis.totalSpend}</p>
                    </div>
                    <div className="stat-card">
                      <h3>Orders in Range</h3>
                      <p className="stat-value">{rangeAnalysis.orderCount}</p>
                    </div>
                  </div>

                  {getRangeChartData() && (
                    <div className="chart-container">
                      <h3>Monthly Spend in Selected Range</h3>
                      <Bar data={getRangeChartData()} options={chartOptions} />
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <footer className="App-footer">
        <p>Made for tracking Swiggy/Zomato expenses 🍕</p>
      </footer>
    </div>
  );
}

export default App;
