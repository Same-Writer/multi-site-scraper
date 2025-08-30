const BaseScraper = require('./BaseScraper');
const moment = require('moment');

/**
 * Craigslist-specific scraper implementation
 */
class CraigslistScraper extends BaseScraper {
  constructor(config, siteConfig) {
    super(config, siteConfig);
  }

  /**
   * Craigslist doesn't require authentication
   */
  async authenticate() {
    // No authentication required for Craigslist
    return true;
  }

  /**
   * Navigate to Craigslist search URL and wait for content to load
   */
  async navigateToSearch(url, searchKey) {
    console.log(`Navigating to Craigslist search: ${url}`);
    
    await this.page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: this.config.scraping.timeout 
    });

    // Add human-like delay after navigation
    await this.humanDelay(1000, 3000);

    // Wait for the initial content to load - try multiple selectors
    const possibleSelectors = this.siteConfig.waitConditions.initialLoad.split(', ');
    let selectorFound = false;
    
    for (const selector of possibleSelectors) {
      try {
        await this.page.waitForSelector(
          selector.trim(), 
          { timeout: 3000 }
        );
        console.log(`Found content using selector: ${selector.trim()}`);
        selectorFound = true;
        break;
      } catch (error) {
        console.log(`Selector ${selector.trim()} not found, trying next...`);
      }
    }
    
    if (!selectorFound) {
      throw new Error(`None of the expected selectors found: ${this.siteConfig.waitConditions.initialLoad}`);
    }

    console.log('Craigslist search page loaded successfully');
  }

  /**
   * Handle Craigslist pagination (next button clicking)
   */
  async handlePagination(paginationConfig) {
    if (!paginationConfig.enabled) return;

    console.log('Handling Craigslist pagination...');
    
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

        // Check if the next button is disabled or not clickable
        const isDisabled = await this.page.evaluate((selector) => {
          const button = document.querySelector(selector);
          return !button || button.classList.contains('disabled') || !button.href;
        }, paginationConfig.nextButtonSelector);

        if (isDisabled) {
          console.log('Next button is disabled, reached end of results');
          break;
        }

        console.log(`Navigating to page ${currentPage + 1}...`);
        
        // Click the next button and wait for navigation
        await Promise.all([
          this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
          nextButton.click()
        ]);

        // Wait for new content to load - try multiple selectors
        const possibleSelectors = this.siteConfig.waitConditions.initialLoad.split(', ');
        let selectorFound = false;
        
        for (const selector of possibleSelectors) {
          try {
            await this.page.waitForSelector(
              selector.trim(), 
              { timeout: 2000 }
            );
            selectorFound = true;
            break;
          } catch (error) {
            // Continue to next selector
          }
        }
        
        if (!selectorFound) {
          console.warn(`Could not find content selectors after pagination: ${this.siteConfig.waitConditions.initialLoad}`);
        }

        // Add delay between page loads
        await this.humanDelay(2000, 4000);
        
        currentPage++;
        
      } catch (error) {
        console.warn(`Error on page ${currentPage + 1}:`, error.message);
        break;
      }
    }
    
    console.log(`Pagination completed, processed ${currentPage} pages`);
  }

  /**
   * Extract data from Craigslist search results
   */
  async extractData(searchConfig, maxListings = null) {
    const results = [];
    
    try {
      console.log('Extracting data from Craigslist...');
      
      // Extract all data using page.evaluate to avoid DOM handle issues
      const extractedData = await this.page.evaluate((config) => {
        // Debug: Try multiple possible selectors to see what's available
        const possibleContainers = [
          '.cl-search-result',
          '.result-row',
          '.cl-static-search-result',
          '.gallery .result-row',
          'li.result-row',
          '.search-result',
          '[data-pid]'
        ];
        
        console.log('Debugging container selectors:');
        possibleContainers.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          console.log(`  ${selector}: ${elements.length} elements`);
        });
        
        const containers = document.querySelectorAll(config.selectors.listingContainer);
        const results = [];
        
        console.log(`Using selector "${config.selectors.listingContainer}": Found ${containers.length} listing containers on Craigslist`);
        
        // Debug: Log the HTML structure of the first container to understand the layout
        if (containers.length > 0) {
          console.log('DEBUG: First container HTML structure:');
          console.log(containers[0].innerHTML.substring(0, 500) + '...');
          
          // Debug: Check what child elements exist
          const childElements = containers[0].querySelectorAll('*');
          const uniqueClasses = new Set();
          childElements.forEach(el => {
            if (el.className) {
              el.className.split(' ').forEach(cls => {
                if (cls.trim()) uniqueClasses.add('.' + cls.trim());
              });
            }
          });
          console.log('DEBUG: Available CSS classes in first container:', Array.from(uniqueClasses).slice(0, 20));
        }
        
        for (let i = 0; i < containers.length; i++) {
          const container = containers[i];
          const item = {};
          let skipListing = false;
          
          // Extract each configured data field
          for (const field of config.dataFields) {
            try {
              let value = null;
              
              if (field.selector === 'a' && field.attribute === 'text') {
                // For title extraction, find the first link with meaningful text
                const links = container.querySelectorAll('a');
                for (const link of links) {
                  const text = link.textContent?.trim();
                  if (text && text.length > 5) {
                    value = text;
                    break;
                  }
                }
              } else if (field.selector === 'a' && field.attribute === 'href') {
                // For URL extraction, find the first link with href
                const links = container.querySelectorAll('a');
                for (const link of links) {
                  const href = link.href;
                  const text = link.textContent?.trim();
                  if (href && text && text.length > 5) {
                    value = href;
                    break;
                  }
                }
              } else if (field.selector === '*' && field.attribute === 'text') {
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
        
        console.log(`Extracted ${results.length} valid Craigslist listings`);
        return results;
      }, searchConfig);
      
      console.log(`Extracted ${extractedData.length} raw items from Craigslist`);
      
      // Process each extracted item
      for (let i = 0; i < extractedData.length; i++) {
        const item = extractedData[i];
        
        // Apply transformations
        for (const field of searchConfig.dataFields) {
          if (field.transform && item[field.name]) {
            item[field.name] = this.transformValue(item[field.name], field.transform);
          }
        }

        // Extract detailed data if configured and enabled
        if (searchConfig.detailedScraping?.enabled) {
          try {
            const detailedData = await this.extractDetailedData(item.url, searchConfig.detailedScraping);
            Object.assign(item, detailedData);
          } catch (error) {
            console.warn(`Failed to extract detailed data for listing ${i + 1}:`, error.message);
            // Continue with basic data if detailed extraction fails
          }
        }

        // Add metadata
        item.scrapedAt = moment().toISOString();
        item.source = this.siteConfig.name.toLowerCase().replace(/\s+/g, '-');

        // Apply filters
        if (this.passesFilters(item, searchConfig.filters)) {
          results.push(item);
          console.log(`Successfully extracted Craigslist listing ${results.length}: "${item.title}" - $${item.price}`);
          
          // Check if we've reached the limit
          if (maxListings && results.length >= maxListings) {
            console.log(`Reached maxListings limit of ${maxListings} for Craigslist`);
            break;
          }
        } else {
          console.log(`Craigslist listing ${i + 1} filtered out: "${item.title}"`);
        }
        
        // Add delay between processing listings
        if (i > 0 && i % 5 === 0) {
          await this.humanDelay(500, 1000);
        }
      }

    } catch (error) {
      console.error('Error extracting data from Craigslist:', error.message);
      throw error;
    }

    return results;
  }

  /**
   * Extract detailed data by navigating to individual listing pages
   */
  async extractDetailedData(listingUrl, detailedConfig) {
    const detailedData = {};
    
    try {
      console.log(`Extracting detailed data from: ${listingUrl}`);
      
      // Get the current URL to navigate back
      const currentUrl = this.page.url();
      
      // Navigate to the detailed page
      await this.page.goto(listingUrl, { waitUntil: 'networkidle2', timeout: 15000 });
      
      // Wait for the detailed page to load
      await this.page.waitForSelector(detailedConfig.waitForSelector, { timeout: 10000 });
      
      // Extract detailed data fields
      for (const field of detailedConfig.dataFields) {
        try {
          let value = null;
          
          if (field.multiple) {
            // Handle multiple values (like images or attributes)
            const elements = await this.page.$$(field.selector);
            const values = [];
            
            for (const element of elements) {
              let elementValue = null;
              
              switch (field.attribute) {
                case 'text':
                  elementValue = await element.evaluate(el => el.textContent?.trim());
                  break;
                case 'src':
                  elementValue = await element.evaluate(el => el.src);
                  break;
                case 'href':
                  elementValue = await element.evaluate(el => el.href);
                  break;
                default:
                  elementValue = await element.evaluate((el, attr) => el.getAttribute(attr), field.attribute);
              }
              
              if (elementValue) {
                values.push(elementValue);
              }
            }
            
            value = values.length > 0 ? values : null;
          } else {
            // Handle single value
            const element = await this.page.$(field.selector);
            
            if (element) {
              switch (field.attribute) {
                case 'text':
                  value = await element.evaluate(el => el.textContent?.trim());
                  break;
                case 'src':
                  value = await element.evaluate(el => el.src);
                  break;
                case 'href':
                  value = await element.evaluate(el => el.href);
                  break;
                case 'datetime':
                  value = await element.evaluate(el => el.getAttribute('datetime'));
                  break;
                default:
                  value = await element.evaluate((el, attr) => el.getAttribute(attr), field.attribute);
              }
            }
          }
          
          // Apply transformation if specified
          if (field.transform && value) {
            value = this.transformValue(value, field.transform);
          }
          
          detailedData[field.name] = value;
          
        } catch (error) {
          if (field.required) {
            throw error;
          }
          console.warn(`Non-critical error extracting detailed field ${field.name}:`, error.message);
          detailedData[field.name] = null;
        }
      }
      
      // Navigate back to the search results
      await this.page.goto(currentUrl, { waitUntil: 'networkidle2', timeout: 15000 });
      
      // Wait for search results to reload - try multiple selectors
      const possibleSelectors = this.siteConfig.waitConditions.initialLoad.split(', ');
      let selectorFound = false;
      
      for (const selector of possibleSelectors) {
        try {
          await this.page.waitForSelector(
            selector.trim(), 
            { timeout: 2000 }
          );
          selectorFound = true;
          break;
        } catch (error) {
          // Continue to next selector
        }
      }
      
      if (!selectorFound) {
        console.warn(`Could not find content selectors after detailed scraping: ${this.siteConfig.waitConditions.initialLoad}`);
      }
      
      // Add delay to avoid being detected as bot
      await this.humanDelay(1000, 2000);
      
    } catch (error) {
      console.error('Error extracting detailed data from Craigslist:', error.message);
      // Try to navigate back to search results if we're stuck
      try {
        await this.page.goBack({ waitUntil: 'networkidle2', timeout: 10000 });
      } catch (backError) {
        console.warn('Could not navigate back to Craigslist search results:', backError.message);
      }
      throw error;
    }
    
    return detailedData;
  }
}

module.exports = CraigslistScraper;
