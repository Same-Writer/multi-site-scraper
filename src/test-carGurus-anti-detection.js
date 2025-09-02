import CarGurusScraper from './scrapers/CarGurusScraper.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load configuration files
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/default.json'), 'utf8'));
const siteConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../sites/cargurus.json'), 'utf8'));

async function testCarGurusAntiDetection() {
  console.log('Testing CarGurus anti-detection measures...');
  
  // Override some config settings for testing
  config.scraping.headless = false; // Run in non-headless mode for better debugging
  config.scraping.timeout = 30000; // Increase timeout for better reliability
  
  let scraper = null;
  
  try {
    // Initialize the enhanced CarGurus scraper
    scraper = new CarGurusScraper(config, siteConfig);
    await scraper.initialize();
    
    console.log('Scraper initialized with enhanced anti-detection measures');
    console.log(`Viewport: ${config.scraping.viewport.width}x${config.scraping.viewport.height}`);
    
    // Test navigation to CarGurus search page
    const testUrl = 'https://www.cargurus.com/Cars/inventorylisting/viewDetailsFilterViewInventoryListing.action?sourceContext=carGurusHomePageModel&entitySelectingHelper.selectedEntity=&maxMileage=90000&transmissionTypes=MANUAL';
    const searchKey = 'bmw_z3';
    
    console.log(`Navigating to: ${testUrl}`);
    await scraper.navigateToSearch(testUrl, searchKey);
    
    // Wait a bit to observe the page
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Get page information
    const title = await scraper.page.title();
    console.log('Page title:', title);
    
    const url = scraper.page.url();
    console.log('Current URL:', url);
    
    // Get page content length
    const content = await scraper.page.content();
    console.log('Page content length:', content.length);
    
    // Check for CAPTCHA or security pages
    if (title.includes('Security Check') || title.includes('CAPTCHA') || title.includes('Just a moment') || title.includes('Attention')) {
      console.warn('CAPTCHA or security check detected!');
    } else {
      console.log('No CAPTCHA or security check detected');
    }
    
    // Try to find listing containers
    const listingContainers = await scraper.page.$$(siteConfig.searchConfig[searchKey].selectors.listingContainer);
    console.log(`Found ${listingContainers.length} listing containers`);
    
    // Try to find any elements with data-cg-ft attributes
    const dataCgElements = await scraper.page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-cg-ft]')).length;
    });
    console.log(`Found ${dataCgElements} elements with data-cg-ft attributes`);
    
    // Try to find any elements that might indicate search results
    const searchResultElements = await scraper.page.evaluate(() => {
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
    
    console.log('Search result-like elements:');
    console.log(JSON.stringify(searchResultElements, null, 2));
    
    if (listingContainers.length > 0 || dataCgElements > 0) {
      console.log('Successfully loaded CarGurus search results page');
      
      // Extract data from first few listings
      const results = await scraper.extractData(siteConfig.searchConfig[searchKey], 3);
      console.log(`Extracted ${results.length} listings:`);
      
      if (results.length > 0) {
        console.log('Sample listing data:');
        console.log(JSON.stringify(results[0], null, 2));
      }
    } else {
      console.warn('No listing containers found - may be blocked by anti-bot measures');
      
      // Take a screenshot for debugging
      const screenshotPath = path.join(__dirname, '../output/cargurus-test-debug.png');
      await scraper.page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Debug screenshot saved to: ${screenshotPath}`);
    }
    
 } catch (error) {
    console.error('Error during testing:', error.message);
    console.error(error.stack);
    
    // Take a screenshot for debugging
    if (scraper && scraper.page) {
      const screenshotPath = path.join(__dirname, '../output/cargurus-error-debug.png');
      await scraper.page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Error screenshot saved to: ${screenshotPath}`);
    }
  } finally {
    if (scraper) {
      await scraper.close();
      console.log('Scraper closed.');
    }
  }
}

// Run the test script
testCarGurusAntiDetection().catch(console.error);
