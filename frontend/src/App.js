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
  const DEBUG_LOG_LIMIT = 50;
  const [orders, setOrders] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [rangeAnalysis, setRangeAnalysis] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Swiggy login state
  const [mobileNumber, setMobileNumber] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [otp, setOtp] = useState('');
  const [loginStep, setLoginStep] = useState('initial'); // initial, otp, scraping
  const [scrapingStatus, setScrapingStatus] = useState('');
  const [debugLog, setDebugLog] = useState([]);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const updateDebugLog = (payload, fallbackMessage) => {
    if (payload?.debugLog && Array.isArray(payload.debugLog)) {
      setDebugLog(payload.debugLog);
      return;
    }

    if (fallbackMessage) {
      setDebugLog((prev) => {
        const next = [...prev, fallbackMessage];
        return next.slice(-DEBUG_LOG_LIMIT);
      });
    }
  };

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

  // Swiggy login functions
  const handleSwiggyLogin = async () => {
    if (!mobileNumber || mobileNumber.length !== 10 || !/^\d{10}$/.test(mobileNumber)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    setError('');
    setScrapingStatus('Initiating login...');
    setDebugLog([]);

    try {
      const response = await axios.post(`${API_URL}/api/swiggy/login`, { mobileNumber });
      updateDebugLog(response.data);
      
      if (response.data.success) {
        setSessionId(response.data.sessionId);
        
        if (response.data.needsOtp) {
          setLoginStep('otp');
          setScrapingStatus('OTP sent to your mobile number. Please enter it below.');
        } else {
          // Already logged in, proceed to scraping
          setLoginStep('scraping');
          await handleScrapeOrders(response.data.sessionId);
        }
      } else {
        setError(response.data.message || 'Login failed');
        setScrapingStatus('');
      }
    } catch (err) {
      setError('Login failed: ' + (err.response?.data?.error || err.message));
      setScrapingStatus('');
      updateDebugLog(err.response?.data, `Frontend: login failed - ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOTP = async () => {
    if (!otp || otp.length < 4) {
      setError('Please enter a valid OTP');
      return;
    }

    setLoading(true);
    setError('');
    setScrapingStatus('Verifying OTP...');

    try {
      const response = await axios.post(`${API_URL}/api/swiggy/submit-otp`, {
        sessionId,
        otp
      });
      updateDebugLog(response.data);

      if (response.data.success) {
        setLoginStep('scraping');
        setScrapingStatus('OTP verified! Scraping your orders...');
        await handleScrapeOrders(sessionId);
      } else {
        setError(response.data.message || 'Invalid OTP');
        setScrapingStatus('');
      }
    } catch (err) {
      setError('OTP verification failed: ' + (err.response?.data?.error || err.message));
      setScrapingStatus('');
      updateDebugLog(err.response?.data, `Frontend: OTP verification failed - ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleScrapeOrders = async (sid) => {
    setLoading(true);
    setError('');
    setScrapingStatus('Scraping orders from Swiggy... This may take a minute.');

    try {
      const response = await axios.post(`${API_URL}/api/swiggy/scrape-orders`, {
        sessionId: sid
      });
      updateDebugLog(response.data);

      if (response.data.success && response.data.orders) {
        setOrders(response.data.orders);
        setScrapingStatus(`Successfully loaded ${response.data.orders.length} orders!`);
        setLoginStep('initial');
        setMobileNumber('');
        setOtp('');
        setSessionId('');
      } else {
        setError(response.data.message || 'Failed to scrape orders');
        setScrapingStatus('');
      }
    } catch (err) {
      setError('Scraping failed: ' + (err.response?.data?.error || err.message));
      setScrapingStatus('');
      updateDebugLog(err.response?.data, `Frontend: scraping failed - ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelLogin = async () => {
    if (sessionId) {
      try {
        await axios.post(`${API_URL}/api/swiggy/cancel-session`, { sessionId });
      } catch (err) {
        console.error('Error canceling session:', err);
      }
    }
    setLoginStep('initial');
    setMobileNumber('');
    setOtp('');
    setSessionId('');
    setScrapingStatus('');
    setError('');
    setDebugLog([]);
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
          <h2>📊 Get Your Orders</h2>
          <p className="info-text">
            Login to Swiggy to automatically fetch your orders, or upload/paste order data manually.
          </p>
          
          <div className="input-methods">
            <div className="input-method swiggy-login">
              <h3>🔐 Login to Swiggy</h3>
              
              {loginStep === 'initial' && (
                <div className="login-form">
                  <input
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    maxLength="10"
                    className="mobile-input"
                  />
                  <button 
                    onClick={handleSwiggyLogin} 
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    {loading ? 'Connecting...' : 'Send OTP'}
                  </button>
                </div>
              )}

              {loginStep === 'otp' && (
                <div className="otp-form">
                  <input
                    type="text"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength="6"
                    className="otp-input"
                  />
                  <div className="otp-buttons">
                    <button 
                      onClick={handleSubmitOTP} 
                      disabled={loading}
                      className="btn btn-primary"
                    >
                      {loading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                    <button 
                      onClick={handleCancelLogin}
                      disabled={loading}
                      className="btn btn-cancel"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {loginStep === 'scraping' && (
                <div className="scraping-status">
                  <div className="spinner"></div>
                  <p>Scraping your orders...</p>
                </div>
              )}

              {scrapingStatus && (
                <div className="status-message">
                  {scrapingStatus}
                </div>
              )}

              {debugLog.length > 0 && (
                <div className="debug-panel">
                  <div className="debug-panel__header">
                    <span>Debug info</span>
                    <button
                      type="button"
                      className="btn-text"
                      onClick={() => setDebugLog([])}
                      disabled={loading}
                    >
                      Clear
                    </button>
                  </div>
                  <ul className="debug-list">
                    {debugLog.map((line, idx) => (
                      <li key={idx}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

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
