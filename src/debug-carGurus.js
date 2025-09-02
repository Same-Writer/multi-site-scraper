import puppeteer from 'puppeteer';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function debugCarGurus() {
  console.log('Starting CarGurus debug script...');
  
  const browser = await puppeteer.launch({
    headless: true, // Run in headless mode
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });

  const page = await browser.newPage();
  
  // Set a realistic user agent
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  try {
    console.log('Navigating to CarGurus search page...');
    await page.goto('https://www.cargurus.com/Cars/inventorylisting/viewDetailsFilterViewInventoryListing.action?sourceContext=carGurusHomePageModel&entitySelectingHelper.selectedEntity=&maxMileage=90000&transmissionTypes=MANUAL', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('Page loaded. Waiting for content...');
    // Wait a bit for JavaScript to render content
    await page.waitForTimeout(5000);
    
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
    const outputPath = path.join(__dirname, '../output/cargurus-debug.html');
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
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

// Run the debug script
debugCarGurus().catch(console.error);
