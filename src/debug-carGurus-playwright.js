import { chromium } from 'playwright';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function debugCarGurus() {
  console.log('Starting CarGurus debug script with Playwright...');
  
  // Launch browser with stealth settings
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--allow-running-insecure-content'
    ]
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    // Add extra HTTP headers to make the request appear more like a real browser
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    }
  });

  // Add stealth scripts to hide automation
  await context.addInitScript(() => {
    // Hide webdriver property
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
    
    // Add other properties to make it appear like a real browser
    window.chrome = {
      runtime: {},
    };
    
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
    
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });
  });

  const page = await context.newPage();
  
  try {
    console.log('Navigating to CarGurus search page...');
    await page.goto('https://www.cargurus.com/Cars/inventorylisting/viewDetailsFilterViewInventoryListing.action?sourceContext=carGurusHomePageModel&entitySelectingHelper.selectedEntity=&maxMileage=90000&transmissionTypes=MANUAL', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    console.log('Page loaded. Waiting for content...');
    // Wait longer for JavaScript to render content
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
    const outputPath = path.join(__dirname, '../output/cargurus-debug-playwright.html');
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
