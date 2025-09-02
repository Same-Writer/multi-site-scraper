import puppeteer from 'puppeteer';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function debugCarGurus() {
  console.log('Starting CarGurus debug script in Docker environment...');
  
  // Use the Chromium executable that's installed in the Docker container
  // Configure browser to avoid detection as automated browsing
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/chromium',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--allow-running-insecure-content',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-size=1920,1080',
      '--start-maximized',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-images',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ]
  });

  const page = await browser.newPage();
  
  // Set a realistic user agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // Override webdriver property to avoid detection
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
  });
  
  // Set additional properties to make the browser appear more like a real user
  await page.evaluateOnNewDocument(() => {
    // Override other properties that might be used for detection
    window.chrome = {
      runtime: {},
      // Add other properties as needed
    };
    
    // Override navigator.plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
    
    // Override navigator.languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });
  });
  
  try {
    console.log('Navigating to CarGurus search page...');
    await page.goto('https://www.cargurus.com/Cars/inventorylisting/viewDetailsFilterViewInventoryListing.action?sourceContext=carGurusHomePageModel&entitySelectingHelper.selectedEntity=&maxMileage=90000&transmissionTypes=MANUAL', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    console.log('Page loaded. Waiting for content...');
    // Wait longer for JavaScript to render content and try to wait for specific elements
    try {
      // Wait for the body element first
      await page.waitForSelector('body', { timeout: 5000 });
      console.log('Body element found');
      
      // Try to wait for common elements that should be present on the search results page
      // We'll try multiple selectors and see if any of them appear
      const commonSelectors = [
        '[data-cg-ft]',  // CarGurus-specific attributes
        '[class*="search"]',  // Search-related elements
        '[class*="result"]',  // Result-related elements
        '[class*="listing"]',  // Listing-related elements
        'h1, h2, h3',  // Header elements
        '.container',  // Common container elements
        '#mainContent',  // Main content area
        '[id*="search"]',  // ID containing "search"
        '[id*="results"]'  // ID containing "results"
      ];
      
      let foundElement = false;
      for (const selector of commonSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          console.log(`Found element with selector: ${selector}`);
          foundElement = true;
          break;
        } catch (error) {
          // Continue to next selector
        }
      }
      
      if (!foundElement) {
        console.log('No common elements found, page may be incomplete or using anti-bot measures');
      }
    } catch (error) {
      console.log('Error waiting for elements:', error.message);
    }
    
    // Wait a bit more for JavaScript to render content
    await page.waitForTimeout(10000);
    
    // Check if we've been redirected to a CAPTCHA or error page
    const currentUrl = page.url();
    console.log('Current URL after waiting:', currentUrl);
    
    if (currentUrl.includes('captcha') || currentUrl.includes('security') || currentUrl.includes('blocked')) {
      console.log('WARNING: May have been redirected to a CAPTCHA or security page');
    }
    
    // Additional check for anti-bot measures
    const contentLength = (await page.content()).length;
    console.log('Page content length:', contentLength);
    
    if (contentLength < 2000) {
      console.log('WARNING: Page content is very short, may be blocked by anti-bot measures');
      
      // Try to evaluate some JavaScript to see if the page is functional
      try {
        const jsResult = await page.evaluate(() => {
          return {
            userAgent: navigator.userAgent,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            webdriver: navigator.webdriver,
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight
          };
        });
        console.log('JavaScript evaluation result:', JSON.stringify(jsResult, null, 2));
      } catch (error) {
        console.log('Error evaluating JavaScript:', error.message);
      }
    }
    
    // Get the page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Get the current URL
    const url = page.url();
    console.log('Current URL:', url);
    
    // Get the HTML content
    const html = await page.content();
    console.log('HTML content length:', html.length);
    
    // Save the HTML to a file for analysis
    const outputPath = path.join(__dirname, '../output/cargurus-debug-docker.html');
    await fs.writeFile(outputPath, html);
    console.log('HTML content saved to:', outputPath);
    
    // Try to find elements with data-cg-ft attributes
    const elementsWithAttributes = await page.evaluate(() => {
      const elements = document.querySelectorAll('[data-cg-ft]');
      const attributes = [];
      elements.forEach(el => {
        attributes.push({
          tagName: el.tagName,
          dataCgFt: el.getAttribute('data-cg-ft'),
          textContent: el.textContent?.substring(0, 100) + '...' || ''
        });
      });
      return attributes;
    });
    
    console.log('Elements with data-cg-ft attributes:');
    console.log(JSON.stringify(elementsWithAttributes, null, 2));
    
    // Try to find any listing-like elements
    const listingElements = await page.evaluate(() => {
      // Look for common patterns in listing containers
      const patterns = [
        '[class*="listing"]',
        '[class*="result"]',
        '[class*="card"]',
        '[data-testid*="listing"]',
        '[data-testid*="result"]',
        '[data-testid*="card"]'
      ];
      
      const results = [];
      patterns.forEach(pattern => {
        const elements = document.querySelectorAll(pattern);
        if (elements.length > 0) {
          results.push({
            selector: pattern,
            count: elements.length,
            sampleText: elements[0].textContent?.substring(0, 100) + '...' || ''
          });
        }
      });
      
      return results;
    });
    
    console.log('Listing-like elements:');
    console.log(JSON.stringify(listingElements, null, 2));
    
  } catch (error) {
    console.error('Error during debugging:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

// Run the debug script
debugCarGurus().catch(console.error);
