import BaseScraper from './scrapers/BaseScraper.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load configuration files
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/default.json'), 'utf8'));
const siteConfig = {
  "name": "Test Site",
  "baseUrl": "https://example.com"
};

async function debugBaseScraper() {
  console.log('Starting base scraper debug script...');
  
  // Override some config settings for debugging
  config.scraping.headless = false; // Run in non-headless mode for better debugging
  config.scraping.timeout = 3000;
  
  let scraper = null;
  
  try {
    // Initialize the base scraper
    scraper = new BaseScraper(config, siteConfig);
    await scraper.initialize();
    
    console.log('Base scraper initialized successfully');
    console.log(`Viewport: ${config.scraping.viewport.width}x${config.scraping.viewport.height}`);
    
    // Test navigation to a simple page
    console.log('Navigating to example.com...');
    await scraper.page.goto('https://example.com', { 
      waitUntil: 'networkidle2',
      timeout: config.scraping.timeout 
    });
    
    // Wait a bit to observe the page
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Get page information
    const title = await scraper.page.title();
    console.log('Page title:', title);
    
    const url = scraper.page.url();
    console.log('Current URL:', url);
    
    // Take a screenshot
    const screenshotPath = path.join(__dirname, '../output/base-scraper-debug.png');
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
debugBaseScraper().catch(console.error);
