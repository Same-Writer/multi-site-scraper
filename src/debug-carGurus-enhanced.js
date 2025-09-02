import CarGurusScraper from './scrapers/CarGurusScraper.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load configuration files
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/default.json'), 'utf8'));
const siteConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../sites/cargurus.json'), 'utf8'));

async function debugCarGurusEnhanced() {
  console.log('Starting enhanced CarGurus debug script...');
  
  // Override some config settings for debugging
  config.scraping.headless = false; // Run in non-headless mode for better debugging
  config.scraping.timeout = 30000;
  
  let scraper = null;
  
  try {
    // Initialize the enhanced CarGurus scraper
    scraper = new CarGurusScraper(config, siteConfig);
    await scraper.initialize();
    
    console.log('Scraper initialized with enhanced settings');
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
    
    // Get page content for analysis
    const content = await scraper.page.content();
    console.log('Page content length:', content.length);
    
    // Try to find listing containers
    const listingContainers = await scraper.page.$$(siteConfig.searchConfig[searchKey].selectors.listingContainer);
    console.log(`Found ${listingContainers.length} listing containers`);
    
    // Try to find any elements with data-cg-ft attributes
    const cgElements = await scraper.page.$$('.cg-ft');
    console.log(`Found ${cgElements.length} elements with cg-ft class`);
    
    // Try to find any elements with data-cg-ft attributes
    const dataCgElements = await scraper.page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-cg-ft]')).length;
    });
    console.log(`Found ${dataCgElements} elements with data-cg-ft attributes`);
    
    if (listingContainers.length > 0) {
      // Extract data from first few listings
      const results = await scraper.extractData(siteConfig.searchConfig[searchKey], 5);
      console.log(`Extracted ${results.length} listings:`);
      console.log(JSON.stringify(results, null, 2));
    }
    
    // Take a screenshot
    const screenshotPath = path.join(__dirname, '../output/cargurus-enhanced-debug.png');
    await scraper.page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved to: ${screenshotPath}`);
    
  } catch (error) {
    console.error('Error during debugging:', error.message);
    console.error(error.stack);
  } finally {
    if (scraper) {
      await scraper.close();
      console.log('Scraper closed.');
    }
  }
}

// Run the debug script
debugCarGurusEnhanced().catch(console.error);
