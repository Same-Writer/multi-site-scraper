import BaseScraper from './BaseScraper.js';
import moment from 'moment';

/**
 * CarGurus-specific scraper implementation
 */
class CarGurusScraper extends BaseScraper {
  constructor(config, siteConfig) {
    super(config, siteConfig);
  }

  /**
   * CarGurus doesn't require authentication for basic searches
   */
  async authenticate() {
    // No authentication required for basic CarGurus searches
    return true;
  }

 /**
   * Enhanced setup for CarGurus anti-detection
   */
  async setupAntiDetection() {
    // Call parent method first
    await super.setupAntiDetection();
    
    // CarGurus-specific enhancements
    await this.page.evaluateOnNewDocument(() => {
      // Additional navigator properties specific to CarGurus
      Object.defineProperty(navigator, 'platform', {
        get: () => 'MacIntel',
      });
      
      Object.defineProperty(navigator, 'vendor', {
        get: () => 'Google Inc.',
      });
      
      // Mock permissions API
      if (!navigator.permissions) {
        navigator.permissions = {
          query: () => Promise.resolve({state: 'granted'}),
        };
      }
      
      // Mock WebGL context
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(contextType) {
        if (contextType === 'webgl' || contextType === 'experimental-webgl') {
          // Return a modified WebGL context that hides automation
          const context = getContext.apply(this, arguments);
          if (context) {
            const getParameter = context.getParameter;
            context.getParameter = function(parameter) {
              if (parameter === 37445) return 'Intel Inc.';
              if (parameter === 37446) return 'Intel Iris OpenGL Engine';
              return getParameter.apply(this, arguments);
            };
          }
          return context;
        }
        return getContext.apply(this, arguments);
      };
      
      // Additional CarGurus-specific properties
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8,
      });
      
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 8,
      });
    });
  }

  /**
   * Navigate to CarGurus search URL and wait for content to load
   */
  async navigateToSearch(url, searchKey) {
    console.log(`Navigating to CarGurus search: ${url}`);
    
    // Add random delay before navigation to mimic human behavior
    await this.humanDelay(1000, 3000);
    
    await this.page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: this.config.scraping.timeout 
    });

    // Add human-like delay after navigation
    await this.humanDelay(3000, 6000);

    // Check for CAPTCHA or challenge pages
    const pageTitle = await this.page.title();
    console.log(`Page title: ${pageTitle}`);
    
    if (pageTitle.includes('Security Check') || pageTitle.includes('CAPTCHA') || pageTitle.includes('Just a moment') || pageTitle.includes('Attention')) {
      console.warn('CAPTCHA or security check detected on CarGurus page');
      // Add longer delay to allow for manual CAPTCHA solving
      await this.humanDelay(15000, 30000);
    }

    // Check for common challenge elements
    const challengeSelectors = [
      '#captcha-form',
      '.captcha-container',
      '[data-testid="challenge-form"]',
      '.g-recaptcha',
      '.captcha',
      '#challenge-form'
    ];
    
    for (const selector of challengeSelectors) {
      const element = await this.page.$(selector);
      if (element) {
        console.warn(`Challenge element detected: ${selector}`);
        // Add extra delay to allow for manual intervention or automatic solving
        await this.humanDelay(15000, 30000);
        break;
      }
    }

    // Perform human-like scrolling to simulate user interaction
    await this.humanScroll(300);
    await this.humanDelay(1000, 2000);
    await this.humanScroll(200);
    
    // Wait for the initial content to load
    try {
      await this.page.waitForSelector(
        this.siteConfig.waitConditions.initialLoad, 
        { timeout: 20000 }
      );
      console.log('CarGurus search page loaded successfully');
    } catch (error) {
      // If the primary selector fails, try alternative selectors
      const alternativeSelectors = this.siteConfig.waitConditions.alternativeSelectors || [];
      let found = false;
      
      for (const selector of alternativeSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 8000 });
          console.log(`Found content using alternative selector: ${selector}`);
          found = true;
          break;
        } catch (altError) {
          console.log(`Alternative selector ${selector} not found`);
        }
      }
      
      if (!found) {
        // Take a screenshot for debugging
        const screenshotPath = `./output/cargurus-debug-${Date.now()}.png`;
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Debug screenshot saved to: ${screenshotPath}`);
        
        console.warn(`Could not find expected content on CarGurus page using selectors: ${this.siteConfig.waitConditions.initialLoad}, ${alternativeSelectors.join(', ')}`);
        // Continue anyway instead of throwing an error
      }
    }
    
    // Additional check to ensure we're on the right page
    const currentUrl = this.page.url();
    console.log(`Current URL: ${currentUrl}`);
    if (!currentUrl.includes('cargurus.com')) {
      throw new Error(`Navigation failed - not on CarGurus domain. Current URL: ${currentUrl}`);
    }
    
    // Add final delay to ensure page is fully loaded
    await this.humanDelay(2000, 4000);
  }

  /**
   * Handle CarGurus pagination
   */
  async handlePagination(paginationConfig) {
    if (!paginationConfig.enabled) return;

    console.log('Handling CarGurus pagination...');
    
    const maxPages = paginationConfig.maxPages || 3;
    let currentPage = 1;
    
    while (currentPage < maxPages) {
      try {
        // Look for the next button
        const nextButton = await this.page.$(paginationConfig.nextButtonSelector);
        
        if (!nextButton) {
          console.log('No more pages available');
          break;
        }

        // Check if the next button is disabled
        const isDisabled = await this.page.evaluate((selector) => {
          const button = document.querySelector(selector);
          return !button || button.disabled || button.getAttribute('aria-disabled') === 'true';
        }, paginationConfig.nextButtonSelector);

        if (isDisabled) {
          console.log('Next button is disabled, reached end of results');
          break;
        }

        console.log(`Navigating to page ${currentPage + 1}...`);
        
        // Add human-like delay before clicking
        await this.humanDelay(2000, 4000);
        
        // Perform human-like mouse movements before clicking
        const buttonBox = await nextButton.boundingBox();
        if (buttonBox) {
          // Move mouse to the button
          await this.page.mouse.move(
            buttonBox.x + buttonBox.width / 2,
            buttonBox.y + buttonBox.height / 2
          );
          
          // Add small delay
          await this.humanDelay(500, 1000);
          
          // Move mouse slightly within the button to simulate human movement
          await this.page.mouse.move(
            buttonBox.x + buttonBox.width / 2 + Math.random() * 10 - 5,
            buttonBox.y + buttonBox.height / 2 + Math.random() * 10 - 5
          );
          
          // Add small delay
          await this.humanDelay(300, 700);
        }
        
        // Click the next button and wait for navigation
        await Promise.all([
          this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }),
          nextButton.click()
        ]);

        // Wait for new content to load
        await this.page.waitForSelector(
          this.siteConfig.waitConditions.initialLoad, 
          { timeout: 15000 }
        );

        // Add human-like scrolling to simulate user interaction
        await this.humanScroll(200);
        await this.humanDelay(1000, 2000);
        await this.humanScroll(150);
        
        // Add delay between page loads
        await this.humanDelay(4000, 8000);
        
        currentPage++;
        
      } catch (error) {
        console.warn(`Error on page ${currentPage + 1}:`, error.message);
        // Add delay before continuing to next iteration
        await this.humanDelay(3000, 5000);
        break;
      }
    }
    
    console.log(`Pagination completed, processed ${currentPage} pages`);
  }

  /**
   * Extract data from CarGurus search results
   */
  async extractData(searchConfig, maxListings = null) {
    const results = [];
    
    try {
      console.log('Extracting data from CarGurus...');
      
      // Extract all data using page.evaluate to avoid DOM handle issues
      const extractedData = await this.page.evaluate((config) => {
        const containers = document.querySelectorAll(config.selectors.listingContainer);
        const results = [];
        
        console.log(`Found ${containers.length} listing containers on CarGurus`);
        
        for (let i = 0; i < containers.length; i++) {
          const container = containers[i];
          const item = {};
          let skipListing = false;
          
          // Extract each configured data field
          for (const field of config.dataFields) {
            try {
              let value = null;
              
              if (field.selector === '*' && field.attribute === 'text') {
                // Special handling for wildcard selector - extract from entire container text
                value = container.textContent?.trim();
              } else {
                // Standard extraction - handle multiple selectors separated by commas
                let targetElement = null;
                const selectors = field.selector.split(',').map(s => s.trim());
                
                for (const selector of selectors) {
                  targetElement = container.querySelector(selector);
                  if (targetElement) break;
                }
                
                if (!targetElement) {
                  if (field.required) {
                    throw new Error(`Required selector not found: ${field.selector}`);
                  }
                  value = null;
                } else {
                  switch (field.attribute) {
                    case 'text':
                      value = targetElement.textContent?.trim();
                      break;
                    case 'href':
                      value = targetElement.href;
                      break;
                    case 'src':
                      value = targetElement.src;
                      break;
                    case 'datetime':
                      value = targetElement.getAttribute('datetime');
                      break;
                    default:
                      value = targetElement.getAttribute(field.attribute);
                  }
                }
              }
              
              item[field.name] = value;
              
            } catch (error) {
              console.warn(`Failed to extract ${field.name} from listing ${i + 1}:`, error.message);
              if (field.required) {
                skipListing = true;
                break;
              }
              item[field.name] = null;
            }
          }
          
          // Skip this listing if a required field failed or if it doesn't have essential data
          if (!skipListing && item.title && item.url) {
            results.push(item);
          }
        }
        
        console.log(`Extracted ${results.length} valid CarGurus listings`);
        return results;
      }, searchConfig);
      
      console.log(`Extracted ${extractedData.length} raw items from CarGurus`);
      
      // Process each extracted item
      for (let i = 0; i < extractedData.length; i++) {
        const item = extractedData[i];
        
        // Apply transformations
        for (const field of searchConfig.dataFields) {
          if (field.transform && item[field.name]) {
            item[field.name] = this.transformValue(item[field.name], field.transform);
          }
        }

        // Add metadata
        item.scrapedAt = moment().toISOString();
        item.source = this.siteConfig.name.toLowerCase().replace(/\s+/g, '-');

        // Apply filters
        if (this.passesFilters(item, searchConfig.filters)) {
          results.push(item);
          console.log(`Successfully extracted CarGurus listing ${results.length}: "${item.title}" - $${item.price}`);
          
          // Check if we've reached the limit
          if (maxListings && results.length >= maxListings) {
            console.log(`Reached maxListings limit of ${maxListings} for CarGurus`);
            break;
          }
        } else {
          console.log(`CarGurus listing ${i + 1} filtered out: "${item.title}"`);
        }
        
        // Add delay between processing listings
        if (i > 0 && i % 3 === 0) {
          await this.humanDelay(1000, 2000);
        }
      }

    } catch (error) {
      console.error('Error extracting data from CarGurus:', error.message);
      throw error;
    }

    return results;
  }
}

export default CarGurusScraper;
