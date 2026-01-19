const playwright = require('playwright-core');

// Store active browser sessions
const sessions = new Map();
const DEBUG_LOG_LIMIT = 50;

function addDebug(sessionId, message) {
  const session = sessions.get(sessionId);
  if (!session) return;
  const entry = `[${new Date().toISOString()}] ${message}`;
  session.debugLog = session.debugLog || [];
  session.debugLog.push(entry);
  if (session.debugLog.length > DEBUG_LOG_LIMIT) {
    session.debugLog.shift();
  }
}

function getDebugLog(sessionId) {
  const session = sessions.get(sessionId);
  return session?.debugLog ? [...session.debugLog] : [];
}

/**
 * NOTE: This scraper relies on Swiggy's current DOM structure and may break if Swiggy updates their UI.
 * The selectors used are best-effort attempts to find elements and may need updates over time.
 * Consider this a proof-of-concept implementation that demonstrates the automated login flow.
 */

/**
 * Initialize Swiggy login and wait for OTP
 * @param {string} mobileNumber - User's mobile number
 * @param {string} sessionId - Unique session identifier
 * @returns {Promise<{success: boolean, message: string, sessionId: string}>}
 */
async function initSwiggyLogin(mobileNumber, sessionId) {
  try {
    // Launch browser
    const browser = await playwright.chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    // Store session
    sessions.set(sessionId, { browser, context, page, mobileNumber, debugLog: [] });
    addDebug(sessionId, 'Browser launched in headless mode');
    addDebug(sessionId, `Session ${sessionId} created for ${mobileNumber}`);

    // Navigate to Swiggy orders page
    await page.goto('https://www.swiggy.com/my-account/orders', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    addDebug(sessionId, `Navigated to ${page.url()}`);

    // Wait a bit for the page to load
    await page.waitForTimeout(2000);

    // Check if already logged in
    const isLoggedIn = await page.evaluate(() => {
      return !document.querySelector('[data-testid="login-button"]') && 
             !document.body.innerText.includes('Login');
    });

    addDebug(sessionId, `Login state detected: ${isLoggedIn ? 'already logged in' : 'needs login'}`);

    if (isLoggedIn) {
      return {
        success: true,
        message: 'Already logged in',
        sessionId,
        needsOtp: false,
        debugLog: getDebugLog(sessionId)
      };
    }

    // Try to find and click login button
    const loginButton = await page.$('[data-testid="login-button"]').catch(() => null) ||
                        await page.$('text=Login').catch(() => null) ||
                        await page.$('button:has-text("Login")').catch(() => null);

    if (loginButton) {
      addDebug(sessionId, 'Found login button, clicking');
      await loginButton.click();
      await page.waitForTimeout(1500);
    } else {
      addDebug(sessionId, 'Login button not found, continuing to search for inputs');
    }

    // Enter mobile number
    const mobileInput = await page.$('input[type="tel"]').catch(() => null) ||
                        await page.$('input[placeholder*="phone"]').catch(() => null) ||
                        await page.$('input[placeholder*="mobile"]').catch(() => null) ||
                        await page.$('input[name="mobile"]').catch(() => null);

    if (!mobileInput) {
      addDebug(sessionId, 'Could not locate mobile number input on page');
      throw new Error('Could not find mobile number input field');
    }

    addDebug(sessionId, 'Filling mobile number into input');
    await mobileInput.fill(mobileNumber);
    await page.waitForTimeout(500);

    // Click continue/submit button
    const continueButton = await page.$('button:has-text("Continue")').catch(() => null) ||
                           await page.$('button:has-text("Send OTP")').catch(() => null) ||
                           await page.$('button[type="submit"]').catch(() => null);

    if (continueButton) {
      addDebug(sessionId, 'Clicking button to request OTP');
      await continueButton.click();
      await page.waitForTimeout(2000);
    } else {
      addDebug(sessionId, 'Continue/Send OTP button not found after entering mobile');
    }

    return {
      success: true,
      message: 'OTP sent to mobile number. Please submit OTP using /api/submit-otp endpoint',
      sessionId,
      needsOtp: true,
      debugLog: getDebugLog(sessionId)
    };

  } catch (error) {
    // Clean up session on error
    addDebug(sessionId, `Login error: ${error.message}`);
    const debugLog = getDebugLog(sessionId);
    const session = sessions.get(sessionId);
    if (session) {
      await session.browser.close().catch(() => {});
      sessions.delete(sessionId);
    }

    return {
      success: false,
      message: `Login failed: ${error.message}`,
      error: error.message,
      debugLog
    };
  }
}

/**
 * Submit OTP and verify login
 * @param {string} sessionId - Session identifier
 * @param {string} otp - OTP code
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function submitOTP(sessionId, otp) {
  try {
    const session = sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        message: 'Session not found or expired',
        debugLog: []
      };
    }

    const { page } = session;
    addDebug(sessionId, `Submitting OTP for session ${sessionId}`);

    // Find OTP input field
    const otpInput = await page.$('input[type="text"]').catch(() => null) ||
                     await page.$('input[placeholder*="OTP"]').catch(() => null) ||
                     await page.$('input[name="otp"]').catch(() => null);

    if (!otpInput) {
      addDebug(sessionId, 'Could not locate OTP input on page');
      throw new Error('Could not find OTP input field');
    }

    addDebug(sessionId, 'Filling OTP into input');
    await otpInput.fill(otp);
    await page.waitForTimeout(500);

    // Click verify/submit button
    const verifyButton = await page.$('button:has-text("Verify")').catch(() => null) ||
                         await page.$('button:has-text("Continue")').catch(() => null) ||
                         await page.$('button[type="submit"]').catch(() => null);

    if (verifyButton) {
      addDebug(sessionId, 'Clicking verify button for OTP');
      await verifyButton.click();
      await page.waitForTimeout(3000);
    } else {
      addDebug(sessionId, 'Verify button not found after entering OTP');
    }

    // Check if login was successful
    const loginSuccess = await page.evaluate(() => {
      return !document.body.innerText.includes('Invalid OTP') &&
              !document.body.innerText.includes('incorrect');
    });

    if (!loginSuccess) {
      const pagePreview = await page.evaluate(() => document.body.innerText.slice(0, 500));
      addDebug(sessionId, `OTP validation failed. Page preview: ${pagePreview}`);
    }

    addDebug(sessionId, `OTP verification result: ${loginSuccess ? 'success' : 'failure'}`);

    if (!loginSuccess) {
      return {
        success: false,
        message: 'Invalid OTP. Please try again.',
        debugLog: getDebugLog(sessionId)
      };
    }

    return {
      success: true,
      message: 'Login successful! You can now scrape orders.',
      debugLog: getDebugLog(sessionId)
    };

  } catch (error) {
    return {
      success: false,
      message: `OTP verification failed: ${error.message}`,
      error: error.message,
      debugLog: getDebugLog(sessionId)
    };
  }
}

/**
 * Scrape orders from Swiggy
 * @param {string} sessionId - Session identifier
 * @returns {Promise<{success: boolean, orders?: Array, message: string}>}
 */
async function scrapeOrders(sessionId) {
  try {
    const session = sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        message: 'Session not found or expired. Please login first.',
        debugLog: []
      };
    }

    const { page } = session;

    // Navigate to orders page if not already there
    const currentUrl = page.url();
    if (!currentUrl.includes('my-account/orders')) {
      await page.goto('https://www.swiggy.com/my-account/orders', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
    }
    addDebug(sessionId, `Arrived at URL: ${page.url()}`);

    await page.waitForTimeout(3000);

    // Scroll to load more orders
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1500);
    }
    addDebug(sessionId, 'Completed scrolling to load orders');

    // Extract order data
    const orders = await page.evaluate(() => {
      const orderElements = document.querySelectorAll('[class*="order"]');
      const extractedOrders = [];

      orderElements.forEach(orderEl => {
        try {
          // Try to extract order information
          const text = orderEl.innerText;
          
          // Extract amount (₹ symbol followed by numbers)
          const amountMatch = text.match(/₹\s*(\d+(?:,\d+)*(?:\.\d+)?)/);
          const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null;

          // Extract date
          const dateMatch = text.match(/(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/i);
          let date = null;
          if (dateMatch) {
            date = new Date(dateMatch[1]).toISOString().split('T')[0];
          }

          // Extract restaurant name (usually at the top)
          const lines = text.split('\n').filter(l => l.trim());
          const restaurant = lines.length > 0 ? lines[0] : 'Unknown';

          if (amount && date) {
            extractedOrders.push({
              date,
              amount,
              restaurant: restaurant.trim()
            });
          }
        } catch (e) {
          // Skip this order if extraction fails
        }
      });

      return extractedOrders;
    });

    addDebug(sessionId, `Order elements extracted: ${orders.length}`);

    const debugLog = getDebugLog(sessionId);
    // Clean up session after successful scrape
    await session.browser.close().catch(() => {});
    sessions.delete(sessionId);

    if (orders.length === 0) {
      return {
        success: false,
        message: 'No orders found. Please make sure you have orders in your Swiggy account.',
        orders: [],
        debugLog
      };
    }

    return {
      success: true,
      message: `Successfully scraped ${orders.length} orders`,
      orders,
      debugLog
    };

  } catch (error) {
    // Clean up session on error
    addDebug(sessionId, `Scraping error: ${error.message}`);
    const debugLog = getDebugLog(sessionId);
    const session = sessions.get(sessionId);
    if (session) {
      await session.browser.close().catch(() => {});
      sessions.delete(sessionId);
    }

    return {
      success: false,
      message: `Scraping failed: ${error.message}`,
      error: error.message,
      orders: [],
      debugLog
    };
  }
}

/**
 * Clean up a session
 * @param {string} sessionId - Session identifier
 */
async function cleanupSession(sessionId) {
  const session = sessions.get(sessionId);
  if (session) {
    await session.browser.close().catch(() => {});
    sessions.delete(sessionId);
  }
}

module.exports = {
  initSwiggyLogin,
  submitOTP,
  scrapeOrders,
  cleanupSession
};
