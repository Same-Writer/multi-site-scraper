const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const ChangeDetector = require('./ChangeDetector');
const crypto = require('crypto');

class ScrapingEngine {
  constructor(config) {
    this.config = config;
    this.browser = null;
    this.page = null;
    this.changeDetector = new ChangeDetector(config);
  }

  async initialize(siteConfig = null) {
    console.log('Initializing scraping engine...');
    
    // Enhanced Docker-compatible Puppeteer configuration with advanced anti-detection
    const puppeteerArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-blink-features=AutomationControlled',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-field-trial-config',
      '--disable-hang-monitor',
      '--disable-ipc-flooding-protection',
      '--disable-popup-blocking',
      '--disable-prompt-on-repost',
      '--disable-sync',
      '--force-color-profile=srgb',
      '--metrics-recording-only',
      '--no-crash-upload',
      '--no-default-browser-check',
      '--no-pings',
      '--password-store=basic',
      '--use-mock-keychain',
      '--disable-component-extensions-with-background-pages',
      '--disable-default-apps',
      '--mute-audio',
      '--no-zygote',
      '--disable-background-networking'
    ];

    // Add user data directory for session persistence if enabled
    if (siteConfig?.antiDetection?.sessionPersistence) {
      const userDataDir = path.join(__dirname, '../../data/browser-sessions', this.generateSessionId(siteConfig));
      await fs.ensureDir(userDataDir);
      puppeteerArgs.push(`--user-data-dir=${userDataDir}`);
    }

    this.browser = await puppeteer.launch({
      headless: this.config.scraping.headless,
      args: puppeteerArgs,
      defaultViewport: null, // Will set custom viewport later
      executablePath: process.env.DOCKER_ENV ? '/usr/bin/chromium' : undefined,
      ignoreDefaultArgs: ['--enable-automation'],
      slowMo: Math.random() * 100 + 50 // Random delay between actions
    });

    this.page = await this.browser.newPage();
    
    // Advanced anti-detection measures
    await this.setupAdvancedAntiDetection(siteConfig);
    
    console.log('Scraping engine initialized successfully with advanced anti-detection measures');
  }

  async setupAdvancedAntiDetection(siteConfig) {
    // Remove automation indicators
    await this.page.evaluateOnNewDocument(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      
      // Override the `plugins` property to use a custom getter
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      
      // Override the `languages` property to use a custom getter
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
      
      // Override the `permissions` property to avoid detection
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );

      // Mock chrome runtime
      window.chrome = {
        runtime: {}
      };

      // Hide automation indicators
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
    });

    // Set realistic user agent with rotation if enabled
    const userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    ];
    
    const randomUserAgent = siteConfig?.antiDetection?.userAgentRotation ? 
      userAgents[Math.floor(Math.random() * userAgents.length)] :
      userAgents[0];
    
    await this.page.setUserAgent(randomUserAgent);
    
    // Set viewport with randomization if enabled
    let viewport = this.config.scraping.viewport;
    if (siteConfig?.antiDetection?.viewportRandomization) {
      viewport = {
        width: this.config.scraping.viewport.width + Math.floor(Math.random() * 200) - 100,
        height: this.config.scraping.viewport.height + Math.floor(Math.random() * 200) - 100
      };
    }
    await this.page.setViewport(viewport);
    
    // Set enhanced headers
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0'
    });

    // Enable request interception for advanced anti-detection
    await this.page.setRequestInterception(true);
    this.page.on('request', (req) => {
      // Block unnecessary resources to speed up and reduce detection
      if (req.resourceType() === 'stylesheet' || req.resourceType() === 'font') {
        req.abort();
      } else {
        req.continue();
      }
    });
  }

  generateSessionId(siteConfig) {
    const siteName = siteConfig?.name || 'default';
    const hash = crypto.createHash('md5').update(siteName + Date.now()).digest('hex');
    return `${siteName.toLowerCase().replace(/\s+/g, '-')}-${hash.substring(0, 8)}`;
  }

  async authenticateIfRequired(siteConfig) {
    if (!siteConfig.authentication?.required) {
      return true;
    }

    console.log('Authentication required, logging in to Facebook...');
    
    try {
      // Navigate to login page with extended timeout
      console.log('Navigating to Facebook login page...');
      await this.page.goto(siteConfig.authentication.loginUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 45000 
      });

      // Wait for login form to be visible
      console.log('Waiting for login form...');
      await this.page.waitForSelector(siteConfig.authentication.selectors.emailInput, { 
        visible: true, 
        timeout: 15000 
      });
      
      // Add human-like delay
      await this.humanDelay(2000, 4000);

      // Clear any existing content and fill email
      console.log('Filling email field...');
      await this.page.click(siteConfig.authentication.selectors.emailInput, { clickCount: 3 });
      await this.page.type(siteConfig.authentication.selectors.emailInput, siteConfig.authentication.credentials.username, {
        delay: Math.random() * 100 + 50
      });
      
      await this.humanDelay(1000, 2000);
      
      // Clear any existing content and fill password
      console.log('Filling password field...');
      await this.page.click(siteConfig.authentication.selectors.passwordInput, { clickCount: 3 });
      await this.page.type(siteConfig.authentication.selectors.passwordInput, siteConfig.authentication.credentials.password, {
        delay: Math.random() * 100 + 50
      });

      await this.humanDelay(1000, 2000);

      // Click login button
      console.log('Clicking login button...');
      await Promise.race([
        this.page.click(siteConfig.authentication.selectors.loginButton),
        this.page.keyboard.press('Enter')
      ]);

      // Wait for navigation or success indicator with multiple fallbacks
      console.log('Waiting for login success...');
      
      try {
        // Try multiple success indicators
        await Promise.race([
          this.page.waitForSelector(siteConfig.authentication.selectors.successIndicator, { timeout: 20000 }),
          this.page.waitForSelector('[data-testid="royal_login_form"]', { hidden: true, timeout: 20000 }),
          this.page.waitForSelector('[role="main"]', { timeout: 20000 }),
          this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 })
        ]);
      } catch (waitError) {
        // Check if we're already logged in by looking for Facebook-specific elements
        const isLoggedIn = await this.page.evaluate(() => {
          return document.querySelector('[data-pagelet="LeftRail"]') !== null ||
                 document.querySelector('[role="main"]') !== null ||
                 document.querySelector('[data-testid="facebook"]') !== null ||
                 !document.querySelector('[data-testid="royal_login_form"]');
        });
        
        if (!isLoggedIn) {
          // Check for common login errors
          const hasError = await this.page.evaluate(() => {
            const errorSelectors = [
              '[data-testid="royal_login_form"] div[role="alert"]',
              '.login_error_box',
              '[id*="error"]'
            ];
            return errorSelectors.some(selector => document.querySelector(selector));
          });
          
          if (hasError) {
            const errorText = await this.page.evaluate(() => {
              const errorElement = document.querySelector('[data-testid="royal_login_form"] div[role="alert"]') ||
                                 document.querySelector('.login_error_box') ||
                                 document.querySelector('[id*="error"]');
              return errorElement ? errorElement.textContent.trim() : 'Unknown login error';
            });
            throw new Error(`Facebook login error: ${errorText}`);
          } else {
            throw new Error('Login timeout - could not verify successful authentication');
          }
        }
      }

      // Additional wait after login
      console.log('Login successful, waiting for page to stabilize...');
      await this.humanDelay(
        siteConfig.authentication.waitAfterLogin || 3000,
        (siteConfig.authentication.waitAfterLogin || 3000) + 2000
      );

      // Handle any post-login popups or notifications
      try {
        await this.handlePostLoginPopups();
      } catch (popupError) {
        console.warn('Could not handle post-login popups:', popupError.message);
      }

      console.log('Successfully authenticated with Facebook');
      return true;

    } catch (error) {
      console.error('Facebook authentication failed:', error.message);
      
      // Take a screenshot for debugging
      try {
        await this.page.screenshot({ path: 'debug-facebook-login-error.png', fullPage: true });
        console.log('Debug screenshot saved as debug-facebook-login-error.png');
      } catch (screenshotError) {
        console.warn('Could not take debug screenshot:', screenshotError.message);
      }
      
      throw new Error(`Failed to authenticate with Facebook: ${error.message}`);
    }
  }

  async handlePostLoginPopups() {
    // Handle common Facebook post-login popups
    const popupSelectors = [
      '[aria-label="Close"]',
      '[data-testid="cookie-policy-manage-dialog"] button',
      '[role="dialog"] button[aria-label="Close"]',
      'div[role="dialog"] div[aria-label="Close"]'
    ];

    for (const selector of popupSelectors) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          console.log(`Closing popup with selector: ${selector}`);
          await element.click();
          await this.humanDelay(500, 1000);
        }
      } catch (error) {
        // Ignore popup handling errors
        continue;
      }
    }
  }

  async humanDelay(min = 500, max = 1500) {
    const delay = Math.random() * (max - min) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async humanType(selector, text) {
    await this.page.waitForSelector(selector, { timeout: 10000 });
    await this.page.click(selector);
    await this.humanDelay(100, 300);
    
    // Type with human-like delays between characters
    for (const char of text) {
      await this.page.keyboard.type(char);
      await this.humanDelay(50, 150);
    }
  }

  async humanClick(selector) {
    await this.page.waitForSelector(selector, { timeout: 10000 });
    
    // Add slight mouse movement before clicking
    const element = await this.page.$(selector);
    const box = await element.boundingBox();
    
    if (box) {
      // Move to a random point within the element
      const x = box.x + Math.random() * box.width;
      const y = box.y + Math.random() * box.height;
      
      await this.page.mouse.move(x, y);
      await this.humanDelay(100, 300);
      await this.page.mouse.click(x, y);
    } else {
      await this.page.click(selector);
    }
  }

  async humanScroll(distance = null) {
    const scrollDistance = distance || Math.random() * 500 + 300;
    
    // Simulate human-like scrolling with multiple small scrolls
    const steps = Math.floor(scrollDistance / 100);
    
    for (let i = 0; i < steps; i++) {
      await this.page.evaluate((step) => {
        window.scrollBy(0, step);
      }, 100);
      await this.humanDelay(50, 150);
    }
  }

  async scrapeUrl(url, siteConfig, searchKey, maxListingsPerSite = null) {
    if (!this.page) {
      throw new Error('Scraping engine not initialized. Call initialize() first.');
    }

    console.log(`Starting scrape of: ${url}`);
    
    try {
      // Authenticate if required (e.g., for Facebook)
      await this.authenticateIfRequired(siteConfig);

      // Navigate to the URL with enhanced delays for anti-detection
      await this.page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: this.config.scraping.timeout 
      });

      // Add human-like delay after navigation
      await this.humanDelay(1000, 3000);

      // Wait for the initial content to load
      await this.page.waitForSelector(
        siteConfig.waitConditions.initialLoad, 
        { timeout: siteConfig.waitConditions.timeout }
      );

      // Handle scroll-based pagination if enabled (for Facebook Marketplace)
      const searchConfig = siteConfig.searchConfig[searchKey];
      if (searchConfig.pagination?.scrollToLoad) {
        await this.handleScrollPagination(searchConfig.pagination);
      }

      // Extract data from the page
      const results = await this.extractData(searchConfig, siteConfig, maxListingsPerSite);

      console.log(`Extracted ${results.length} items from ${url}`);
      return results;

    } catch (error) {
      console.error(`Error scraping ${url}:`, error.message);
      throw error;
    }
  }

  async handleScrollPagination(paginationConfig) {
    console.log('Handling scroll-based pagination...');
    
    const maxScrolls = paginationConfig.maxScrolls || 3;
    const scrollDelay = paginationConfig.scrollDelay || 2000;
    
    for (let i = 0; i < maxScrolls; i++) {
      console.log(`Scroll ${i + 1}/${maxScrolls}`);
      
      // Get current listing count
      const beforeCount = await this.page.evaluate((selector) => {
        return document.querySelectorAll(selector).length;
      }, paginationConfig.listingSelector || '[data-testid="marketplace-search-result-item"]');
      
      // Scroll down with human-like behavior
      await this.humanScroll();
      
      // Wait for new content to load
      await this.humanDelay(scrollDelay, scrollDelay + 1000);
      
      // Check if new listings loaded
      const afterCount = await this.page.evaluate((selector) => {
        return document.querySelectorAll(selector).length;
      }, paginationConfig.listingSelector || '[data-testid="marketplace-search-result-item"]');
      
      console.log(`Listings before scroll: ${beforeCount}, after scroll: ${afterCount}`);
      
      // If no new listings loaded, we've reached the end
      if (afterCount === beforeCount) {
        console.log('No new listings loaded, stopping pagination');
        break;
      }
      
      // Add extra delay between scrolls to avoid detection
      await this.humanDelay(1000, 2000);
    }
  }

  async extractData(searchConfig, siteConfig, maxListingsPerSite = null) {
    const results = [];
    
    try {
      // Extract all data using pure page.evaluate to avoid DOM handle issues
      const extractedData = await this.page.evaluate((config) => {
        const containers = document.querySelectorAll(config.selectors.listingContainer);
        const results = [];
        
        console.log(`Found ${containers.length} potential containers on page`);
        
        for (let i = 0; i < containers.length; i++) {
          const container = containers[i];
          
          const item = {};
          let skipListing = false;
          
          // Extract each configured data field with smart logic for Facebook Marketplace
          for (const field of config.dataFields) {
            try {
              let value = null;
              
              if (field.name === 'title') {
                // Smart title extraction - find the longest meaningful text
                const spans = container.querySelectorAll('span');
                let bestTitle = null;
                let maxLength = 0;
                
                for (const span of spans) {
                  const text = span.textContent?.trim();
                  if (text && text.length > maxLength && text.length > 10 && !text.match(/^\$[\d,]+/) && !text.includes('miles')) {
                    bestTitle = text;
                    maxLength = text.length;
                  }
                }
                value = bestTitle;
                
              } else if (field.name === 'price') {
                // Smart price extraction - find text with price pattern
                const spans = container.querySelectorAll('span');
                for (const span of spans) {
                  const text = span.textContent?.trim();
                  if (text && text.match(/\$[\d,]+/)) {
                    value = text;
                    break;
                  }
                }
                
              } else if (field.name === 'location') {
                // Smart location extraction - find text that looks like location
                const spans = container.querySelectorAll('span');
                for (const span of spans) {
                  const text = span.textContent?.trim();
                  if (text && text.length > 3 && text.length < 50 && 
                      !text.match(/\$[\d,]+/) && 
                      !text.match(/^\d+$/) &&
                      (text.includes(',') || text.includes('CA') || text.includes('miles'))) {
                    value = text;
                    break;
                  }
                }
                
              } else if (field.name === 'url') {
                // URL extraction - use the container itself if it's a link
                if (field.selector === '.') {
                  value = container.href;
                } else {
                  const linkElement = container.querySelector(field.selector);
                  value = linkElement ? linkElement.href : null;
                }
                
              } else if (field.name === 'imageUrl') {
                // Image extraction
                const img = container.querySelector('img');
                value = img ? img.src : null;
                
              } else {
                // Standard extraction for other fields
                if (field.attribute === 'text' && field.selector === 'a') {
                  const allElements = container.querySelectorAll(field.selector);
                  
                  for (const element of allElements) {
                    const textContent = element.textContent?.trim();
                    if (textContent && textContent.length > 0) {
                      value = textContent;
                      break;
                    }
                  }
                  
                  if (!value && field.required) {
                    throw new Error(`Required selector with text content not found: ${field.selector}`);
                  }
                } else {
                  // Standard single element extraction
                  const targetElement = container.querySelector(field.selector);
                  
                  if (!targetElement) {
                    if (field.required) {
                      throw new Error(`Required selector not found: ${field.selector}`);
                    }
                    value = null;
                  } else {
                    // Extract value based on attribute type
                    switch (field.attribute) {
                      case 'text':
                        value = targetElement.textContent?.trim();
                        break;
                      case 'href':
                        // For href with 'a' selector, find first link with content
                        if (field.selector === 'a') {
                          const allLinks = container.querySelectorAll(field.selector);
                          for (const link of allLinks) {
                            const href = link.href;
                            const text = link.textContent?.trim();
                            if (href && text && text.length > 0) {
                              value = href;
                              break;
                            }
                          }
                        } else {
                          value = targetElement.href;
                        }
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
          
          // Skip this listing if a required field failed or if it doesn't have a valid URL
          if (!skipListing && item.url) {
            results.push(item);
          }
        }
        
        console.log(`Filtered to ${results.length} actual marketplace listings`);
        return results;
      }, searchConfig);
      
      console.log(`Extracted ${extractedData.length} raw items from page`);
      
      // Process each extracted item until we reach maxListingsPerSite
      let processedCount = 0;
      for (let i = 0; i < extractedData.length; i++) {
        const item = extractedData[i];
        
        // Add random delay between listings to appear more human-like
        if (i > 0) {
          const delay = Math.random() * 500 + 200; // 200-700ms delay
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Apply transformations
        for (const field of searchConfig.dataFields) {
          if (field.transform && item[field.name]) {
            item[field.name] = this.transformValue(item[field.name], field.transform);
          }
        }
        
        // Extract detailed data by clicking into the listing if configured
        if (searchConfig.detailedScraping && searchConfig.detailedScraping.enabled) {
          try {
            const detailedData = await this.extractDetailedDataByIndex(i, searchConfig.detailedScraping, searchConfig);
            Object.assign(item, detailedData);
          } catch (error) {
            console.warn(`Failed to extract detailed data for listing ${i + 1}:`, error.message);
            // Continue with basic data if detailed extraction fails
          }
        }

        // Add metadata
        item.scrapedAt = moment().toISOString();
        item.source = siteConfig?.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown';

        // Apply filters if configured
        if (this.passesFilters(item, searchConfig.filters)) {
          results.push(item);
          console.log(`Successfully extracted listing ${results.length}: "${item.title}" - $${item.price}`);
          
          // Check if we've reached the limit after adding this item
          if (maxListingsPerSite && results.length >= maxListingsPerSite) {
            console.log(`Reached maxListingsPerSite limit of ${maxListingsPerSite} after filtering`);
            break;
          }
        } else {
          console.log(`Listing ${i + 1} filtered out: "${item.title}"`);
        }
        
        processedCount++;
      }
      
      console.log(`Processed ${processedCount} listings, ${results.length} passed filters`);

    } catch (error) {
      console.error('Error extracting data:', error.message);
      throw error;
    }

    // Process results through change detector if enabled
    if (this.changeDetector.enabled) {
      const changeResults = await this.changeDetector.processListings(results, 'bmw_z3_z4', searchConfig);
      console.log(`Change detection: ${changeResults.newListings.length} new, ${changeResults.changedListings.length} changed, ${changeResults.unchangedListings.length} unchanged`);
      
      // Add change information to results
      results.forEach(result => {
        const newListing = changeResults.newListings.find(l => l.url === result.url);
        const changedListing = changeResults.changedListings.find(l => l.url === result.url);
        
        if (newListing) {
          result.isNew = true;
        } else if (changedListing) {
          result.isChanged = true;
          result.changes = changedListing.changes;
        }
      });
    }

    return results;
  }

  async extractDetailedDataByIndex(listingIndex, detailedConfig, searchConfig) {
    const detailedData = {};
    
    try {
      // Re-query the listing containers and find the specific link within each
      const listingContainers = await this.page.$$(searchConfig.selectors.listingContainer);
      
      if (listingIndex >= listingContainers.length) {
        throw new Error(`Listing index ${listingIndex} out of range`);
      }

      const listingContainer = listingContainers[listingIndex];
      const linkElement = await listingContainer.$(detailedConfig.clickSelector);
      
      if (!linkElement) {
        throw new Error('No clickable link found in listing');
      }

      // Get the URL before clicking (for navigation back)
      const currentUrl = this.page.url();
      
      // Click the link to go to detailed page
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
        linkElement.click()
      ]);

      // Wait for the detailed page to load
      await this.page.waitForSelector(detailedConfig.waitForSelector, { timeout: 10000 });

      // Extract detailed data fields
      for (const field of detailedConfig.dataFields) {
        try {
          const value = await this.extractDetailedFieldValue(field);
          detailedData[field.name] = value;
        } catch (error) {
          console.warn(`Failed to extract detailed field ${field.name}:`, error.message);
          detailedData[field.name] = null;
        }
      }

      // Navigate back to the listing page
      await this.page.goto(currentUrl, { waitUntil: 'networkidle2', timeout: 15000 });
      
      // Wait for listings to reload
      await this.page.waitForSelector(searchConfig.selectors.listingContainer, { timeout: 10000 });

      // Add delay to avoid being detected as bot
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

    } catch (error) {
      console.error('Error extracting detailed data:', error.message);
      // Try to navigate back to listing page if we're stuck
      try {
        await this.page.goBack({ waitUntil: 'networkidle2', timeout: 10000 });
      } catch (backError) {
        console.warn('Could not navigate back:', backError.message);
      }
      throw error;
    }

    return detailedData;
  }

  async extractDetailedData(listingElement, detailedConfig) {
    const detailedData = {};
    
    try {
      // Get the link to click
      const linkElement = await listingElement.$(detailedConfig.clickSelector);
      if (!linkElement) {
        throw new Error('No clickable link found in listing');
      }

      // Get the URL before clicking (for navigation back)
      const currentUrl = this.page.url();
      
      // Click the link to go to detailed page
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
        linkElement.click()
      ]);

      // Wait for the detailed page to load
      await this.page.waitForSelector(detailedConfig.waitForSelector, { timeout: 10000 });

      // Extract detailed data fields
      for (const field of detailedConfig.dataFields) {
        try {
          const value = await this.extractDetailedFieldValue(field);
          detailedData[field.name] = value;
        } catch (error) {
          console.warn(`Failed to extract detailed field ${field.name}:`, error.message);
          detailedData[field.name] = null;
        }
      }

      // Navigate back to the listing page
      await this.page.goto(currentUrl, { waitUntil: 'networkidle2', timeout: 15000 });
      
      // Wait for listings to reload
      await this.page.waitForSelector('.cl-search-result', { timeout: 10000 });

      // Add delay to avoid being detected as bot
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

    } catch (error) {
      console.error('Error extracting detailed data:', error.message);
      // Try to navigate back to listing page if we're stuck
      try {
        await this.page.goBack({ waitUntil: 'networkidle2', timeout: 10000 });
      } catch (backError) {
        console.warn('Could not navigate back:', backError.message);
      }
      throw error;
    }

    return detailedData;
  }

  async extractDetailedFieldValue(field) {
    let value = null;

    try {
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

    } catch (error) {
      if (field.required) {
        throw error;
      }
      console.warn(`Non-critical error extracting detailed field ${field.name}:`, error.message);
    }

    return value;
  }

  async extractFieldValueByIndex(listingIndex, field, listingContainerSelector) {
    let value = null;

    try {
      // Use page.evaluate to avoid DOM element handle issues
      value = await this.page.evaluate((index, fieldConfig, containerSelector) => {
        const containers = document.querySelectorAll(containerSelector);
        
        if (index >= containers.length) {
          throw new Error(`Listing index ${index} out of range`);
        }

        const container = containers[index];
        
        // For text fields with 'a' selector, find first element with content
        if (fieldConfig.attribute === 'text' && fieldConfig.selector === 'a') {
          const allElements = container.querySelectorAll(fieldConfig.selector);
          
          for (const element of allElements) {
            const textContent = element.textContent?.trim();
            if (textContent && textContent.length > 0) {
              return textContent;
            }
          }
          
          if (fieldConfig.required) {
            throw new Error(`Required selector with text content not found: ${fieldConfig.selector}`);
          }
          return null;
        } else {
          // Standard single element extraction
          const targetElement = container.querySelector(fieldConfig.selector);
          
          if (!targetElement) {
            if (fieldConfig.required) {
              throw new Error(`Required selector not found: ${fieldConfig.selector}`);
            }
            return null;
          }

          // Extract value based on attribute type
          switch (fieldConfig.attribute) {
            case 'text':
              return targetElement.textContent?.trim();
            case 'href':
              // For href with 'a' selector, find first link with content
              if (fieldConfig.selector === 'a') {
                const allLinks = container.querySelectorAll(fieldConfig.selector);
                for (const link of allLinks) {
                  const href = link.href;
                  const text = link.textContent?.trim();
                  if (href && text && text.length > 0) {
                    return href;
                  }
                }
                return null;
              } else {
                return targetElement.href;
              }
            case 'src':
              return targetElement.src;
            case 'datetime':
              return targetElement.getAttribute('datetime');
            default:
              return targetElement.getAttribute(fieldConfig.attribute);
          }
        }
      }, listingIndex, field, listingContainerSelector);

      // Apply transformation if specified
      if (field.transform && value) {
        value = this.transformValue(value, field.transform);
      }

    } catch (error) {
      if (field.required) {
        throw error;
      }
      console.warn(`Non-critical error extracting ${field.name}:`, error.message);
    }

    return value;
  }

  async extractFieldValue(element, field) {
    let value = null;

    try {
      // For text fields, try to find the first element with actual content
      if (field.attribute === 'text' && field.selector === 'a') {
        const allElements = await element.$$(field.selector);
        
        for (const targetElement of allElements) {
          const textContent = await targetElement.evaluate(el => el.textContent?.trim());
          if (textContent && textContent.length > 0) {
            value = textContent;
            break;
          }
        }
        
        if (!value && field.required) {
          throw new Error(`Required selector with text content not found: ${field.selector}`);
        }
      } else {
        // Standard single element extraction
        const targetElement = await element.$(field.selector);
        
        if (!targetElement) {
          if (field.required) {
            throw new Error(`Required selector not found: ${field.selector}`);
          }
          return null;
        }

        // Extract value based on attribute type
        switch (field.attribute) {
          case 'text':
            value = await targetElement.evaluate(el => el.textContent?.trim());
            break;
          case 'href':
            // For href, also try to find the first link with content if it's an 'a' selector
            if (field.selector === 'a') {
              const allLinks = await element.$$(field.selector);
              for (const link of allLinks) {
                const href = await link.evaluate(el => el.href);
                const text = await link.evaluate(el => el.textContent?.trim());
                if (href && text && text.length > 0) {
                  value = href;
                  break;
                }
              }
            } else {
              value = await targetElement.evaluate(el => el.href);
            }
            break;
          case 'src':
            value = await targetElement.evaluate(el => el.src);
            break;
          case 'datetime':
            value = await targetElement.evaluate(el => el.getAttribute('datetime'));
            break;
          default:
            value = await targetElement.evaluate((el, attr) => el.getAttribute(attr), field.attribute);
        }
      }

      // Apply transformation if specified
      if (field.transform && value) {
        value = this.transformValue(value, field.transform);
      }

    } catch (error) {
      if (field.required) {
        throw error;
      }
      console.warn(`Non-critical error extracting ${field.name}:`, error.message);
    }

    return value;
  }

  transformValue(value, transformType) {
    switch (transformType) {
      case 'extractPrice':
        if (!value) return null;
        const priceMatch = value.match(/\$[\d,]+/);
        return priceMatch ? parseInt(priceMatch[0].replace(/[$,]/g, '')) : null;
      
      case 'cleanLocation':
        return value.replace(/[()]/g, '').trim();
      
      case 'formatDate':
        return moment(value).isValid() ? moment(value).toISOString() : value;
      
      case 'absoluteUrl':
        if (value && value.startsWith('/')) {
          return `https://sfbay.craigslist.org${value}`;
        }
        return value;
      
      case 'cleanDescription':
        // Clean up description text by removing extra whitespace and QR code text
        return value
          .replace(/QR Code Link to This Post/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
      
      case 'extractPostingId':
        // Extract posting ID from text like "post id: 1234567890"
        const idMatch = value.match(/post id:\s*(\d+)/i);
        return idMatch ? idMatch[1] : value;
      
      default:
        return value;
    }
  }

  passesFilters(item, filters) {
    if (!filters) return true;

    // Price range filter
    if (filters.priceRange && item.price !== null) {
      if (item.price < filters.priceRange.min || item.price > filters.priceRange.max) {
        return false;
      }
    }

    // Keyword filters
    if (filters.keywords) {
      const title = (item.title || '').toLowerCase();
      
      // Check include keywords
      if (filters.keywords.include) {
        const hasIncludeKeyword = filters.keywords.include.some(keyword => 
          title.includes(keyword.toLowerCase())
        );
        if (!hasIncludeKeyword) return false;
      }

      // Check exclude keywords
      if (filters.keywords.exclude) {
        const hasExcludeKeyword = filters.keywords.exclude.some(keyword => 
          title.includes(keyword.toLowerCase())
        );
        if (hasExcludeKeyword) return false;
      }
    }

    return true;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('Scraping engine closed');
    }
  }
}

module.exports = ScrapingEngine;
