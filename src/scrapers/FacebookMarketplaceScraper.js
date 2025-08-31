const BaseScraper = require('./BaseScraper');
const moment = require('moment');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs-extra');

/**
 * Facebook Marketplace-specific scraper implementation
 */
class FacebookMarketplaceScraper extends BaseScraper {
  constructor(config, siteConfig) {
    super(config, siteConfig);
  }

  /**
   * Enhanced anti-detection setup for Facebook
   */
  async setupAntiDetection() {
    await super.setupAntiDetection();
    
    // Facebook-specific anti-detection measures
    if (this.siteConfig.antiDetection?.enabled) {
      // Enhanced user agent rotation
      if (this.siteConfig.antiDetection.userAgentRotation) {
        const userAgents = [
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        ];
        
        const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
        await this.page.setUserAgent(randomUserAgent);
      }
      
      // Viewport randomization
      if (this.siteConfig.antiDetection.viewportRandomization) {
        const viewport = {
          width: this.config.scraping.viewport.width + Math.floor(Math.random() * 200) - 100,
          height: this.config.scraping.viewport.height + Math.floor(Math.random() * 200) - 100
        };
        await this.page.setViewport(viewport);
      }
      
      // Session persistence
      if (this.siteConfig.antiDetection.sessionPersistence) {
        const userDataDir = path.join(__dirname, '../../data/browser-sessions', this.generateSessionId());
        await fs.ensureDir(userDataDir);
      }
    }

    // Enable request interception for Facebook
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

  /**
   * Generate session ID for browser session persistence
   */
  generateSessionId() {
    const siteName = this.siteConfig.name || 'facebook-marketplace';
    const hash = crypto.createHash('md5').update(siteName + Date.now()).digest('hex');
    return `${siteName.toLowerCase().replace(/\s+/g, '-')}-${hash.substring(0, 8)}`;
  }

  /**
   * Authenticate with Facebook if required
   */
  async authenticate() {
    if (!this.siteConfig.authentication?.required) {
      return true;
    }

    console.log('Authentication required, logging in to Facebook...');
    
    try {
      // Navigate to login page with extended timeout
      console.log('Navigating to Facebook login page...');
      await this.page.goto(this.siteConfig.authentication.loginUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 45000 
      });

      // Wait for login form to be visible
      console.log('Waiting for login form...');
      await this.page.waitForSelector(this.siteConfig.authentication.selectors.emailInput, { 
        visible: true, 
        timeout: 15000 
      });
      
      // Add human-like delay
      await this.humanDelay(2000, 4000);

      // Clear any existing content and fill email
      console.log('Filling email field...');
      await this.page.click(this.siteConfig.authentication.selectors.emailInput, { clickCount: 3 });
      await this.page.type(this.siteConfig.authentication.selectors.emailInput, 
        this.siteConfig.authentication.credentials.username, {
        delay: Math.random() * 100 + 50
      });
      
      await this.humanDelay(1000, 2000);
      
      // Clear any existing content and fill password
      console.log('Filling password field...');
      await this.page.click(this.siteConfig.authentication.selectors.passwordInput, { clickCount: 3 });
      await this.page.type(this.siteConfig.authentication.selectors.passwordInput, 
        this.siteConfig.authentication.credentials.password, {
        delay: Math.random() * 100 + 50
      });

      await this.humanDelay(1000, 2000);

      // Click login button
      console.log('Clicking login button...');
      await Promise.race([
        this.page.click(this.siteConfig.authentication.selectors.loginButton),
        this.page.keyboard.press('Enter')
      ]);

      // Wait for navigation or success indicator with multiple fallbacks
      console.log('Waiting for login success...');
      
      try {
        // Try multiple success indicators
        await Promise.race([
          this.page.waitForSelector(this.siteConfig.authentication.selectors.successIndicator, { timeout: 20000 }),
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
        this.siteConfig.authentication.waitAfterLogin || 3000,
        (this.siteConfig.authentication.waitAfterLogin || 3000) + 2000
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

  /**
   * Handle post-login popups and notifications
   */
  async handlePostLoginPopups() {
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

  /**
   * Navigate to Facebook Marketplace search URL with enhanced validation
   */
  async navigateToSearch(url, searchKey) {
    console.log(`Navigating to Facebook Marketplace search: ${url}`);
    
    // Step 1: Navigate with multiple wait conditions for consistency
    await this.page.goto(url, { 
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: this.config.scraping.timeout 
    });

    // Step 2: Add extended human-like delay for page stabilization
    console.log('Waiting for page to stabilize...');
    await this.humanDelay(3000, 5000);

    // Step 3: Wait for multiple indicators that the page has loaded properly
    await this.waitForPageStabilization();

    // Step 4: Validate page layout and content
    await this.validatePageLayout(searchKey);

    console.log('Facebook Marketplace search page loaded successfully');
  }

  /**
   * Wait for page stabilization with multiple fallback conditions
   */
  async waitForPageStabilization() {
    console.log('Waiting for page stabilization indicators...');
    
    const stabilizationPromises = [
      // Wait for main content area
      this.page.waitForSelector('[role="main"]', { timeout: 15000 }).catch(() => null),
      
      // Wait for marketplace-specific elements
      this.page.waitForSelector('div[data-pagelet*="Marketplace"]', { timeout: 15000 }).catch(() => null),
      
      // Wait for any marketplace item containers
      this.page.waitForSelector('a[href*="/marketplace/item/"]', { timeout: 15000 }).catch(() => null),
      
      // Wait for search results area
      this.page.waitForSelector('div[aria-label*="Collection"], div[data-testid*="marketplace"]', { timeout: 15000 }).catch(() => null)
    ];

    // Wait for at least one stabilization indicator
    const results = await Promise.allSettled(stabilizationPromises);
    const successfulWaits = results.filter(result => result.status === 'fulfilled' && result.value !== null);
    
    if (successfulWaits.length === 0) {
      console.warn('No stabilization indicators found, proceeding with caution...');
    } else {
      console.log(`Page stabilized with ${successfulWaits.length} indicators present`);
    }

    // Additional wait for dynamic content loading
    await this.humanDelay(2000, 3000);
  }

  /**
   * Validate that the page layout matches expected selectors
   */
  async validatePageLayout(searchKey) {
    console.log('Validating page layout and content...');
    
    try {
      // Get the search configuration for this search key
      const searchConfig = this.siteConfig.searchConfig[searchKey];
      if (!searchConfig) {
        throw new Error(`No search configuration found for key: ${searchKey}`);
      }

      // Check for presence of expected elements
      const validationResults = await this.page.evaluate((config) => {
        const results = {
          hasMainContent: false,
          hasSearchResults: false,
          hasListingContainers: false,
          listingContainerCount: 0,
          hasNavigationElements: false,
          navigationElementCount: 0,
          pageTitle: document.title,
          currentUrl: window.location.href
        };

        // Check for main content area
        results.hasMainContent = document.querySelector('[role="main"]') !== null;

        // Check for search results area
        const searchResultsSelectors = [
          'div[data-pagelet*="Marketplace"]',
          'div[aria-label*="Collection"]',
          'div[data-testid*="marketplace"]'
        ];
        results.hasSearchResults = searchResultsSelectors.some(selector => 
          document.querySelector(selector) !== null
        );

        // Check for listing containers using the configured selector
        const listingContainers = document.querySelectorAll(config.selectors.listingContainer);
        results.hasListingContainers = listingContainers.length > 0;
        results.listingContainerCount = listingContainers.length;

        // Check for navigation/category elements that might be incorrectly captured
        const navigationSelectors = [
          'a[href*="/marketplace/category/"]',
          'div[role="navigation"] a',
          'nav a',
          'a[href*="/groups/"]'
        ];
        const navigationElements = document.querySelectorAll(navigationSelectors.join(', '));
        results.hasNavigationElements = navigationElements.length > 0;
        results.navigationElementCount = navigationElements.length;

        return results;
      }, searchConfig);

      console.log('Page validation results:', JSON.stringify(validationResults, null, 2));

      // Analyze validation results
      if (!validationResults.hasMainContent) {
        throw new Error('Page validation failed: Main content area not found. Page may not have loaded properly.');
      }

      if (!validationResults.hasSearchResults) {
        console.warn('Warning: No search results area detected. This may indicate an unexpected page layout.');
      }

      if (!validationResults.hasListingContainers) {
        // Check if we're on an error page or unexpected page
        const isErrorPage = validationResults.pageTitle.toLowerCase().includes('error') ||
                           validationResults.currentUrl.includes('error') ||
                           validationResults.currentUrl.includes('login');
        
        if (isErrorPage) {
          throw new Error(`Page validation failed: Redirected to error or login page. URL: ${validationResults.currentUrl}`);
        }

        // Check if there are simply no results for this search
        const noResultsIndicators = await this.page.evaluate(() => {
          const noResultsTexts = [
            'No results found',
            'Try different keywords',
            'No items match your search',
            'Nothing found'
          ];
          
          return noResultsTexts.some(text => 
            document.body.textContent.toLowerCase().includes(text.toLowerCase())
          );
        });

        if (noResultsIndicators) {
          console.log('Page validation: No search results found for this query (legitimate empty result set)');
          return; // This is valid - just no results
        }

        throw new Error(`Page validation failed: No listing containers found using selector "${searchConfig.selectors.listingContainer}". Found ${validationResults.listingContainerCount} containers. Page layout may be inconsistent with current selectors.`);
      }

      // Check if we're capturing too many navigation elements vs actual listings
      if (validationResults.hasNavigationElements && 
          validationResults.navigationElementCount > validationResults.listingContainerCount) {
        console.warn(`Warning: Detected ${validationResults.navigationElementCount} navigation elements vs ${validationResults.listingContainerCount} listing containers. Selectors may be capturing navigation instead of listings.`);
      }

      console.log(`Page validation successful: Found ${validationResults.listingContainerCount} potential listing containers`);

    } catch (error) {
      console.error('Page validation failed:', error.message);
      
      // Take a debug screenshot
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const screenshotPath = `debug-facebook-validation-error-${timestamp}.png`;
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Debug screenshot saved: ${screenshotPath}`);
      } catch (screenshotError) {
        console.warn('Could not take debug screenshot:', screenshotError.message);
      }

      // Re-throw the validation error to stop scraping
      throw new Error(`Facebook Marketplace page validation failed: ${error.message}. The page layout is not consistent with current selectors. Exiting scrape to prevent incorrect data extraction.`);
    }
  }

  /**
   * Handle Facebook Marketplace scroll-based pagination
   */
  async handlePagination(paginationConfig) {
    if (!paginationConfig.scrollToLoad) return;

    console.log('Handling Facebook Marketplace scroll-based pagination...');
    
    const maxScrolls = paginationConfig.maxScrolls || 3;
    const scrollDelay = paginationConfig.scrollDelay || 2000;
    
    for (let i = 0; i < maxScrolls; i++) {
      console.log(`Scroll ${i + 1}/${maxScrolls}`);
      
      // Get current listing count
      const beforeCount = await this.page.evaluate((selector) => {
        return document.querySelectorAll(selector).length;
      }, paginationConfig.listingSelector || 'a[href*="/marketplace/item/"]');
      
      // Scroll down with human-like behavior
      await this.humanScroll();
      
      // Wait for new content to load
      await this.humanDelay(scrollDelay, scrollDelay + 1000);
      
      // Check if new listings loaded
      const afterCount = await this.page.evaluate((selector) => {
        return document.querySelectorAll(selector).length;
      }, paginationConfig.listingSelector || 'a[href*="/marketplace/item/"]');
      
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

  /**
   * Extract data from Facebook Marketplace search results with enhanced validation
   */
  async extractData(searchConfig, maxListings = null) {
    const results = [];
    
    try {
      console.log('Extracting data from Facebook Marketplace...');
      
      // Pre-extraction validation to ensure page is still in expected state (DISABLED FOR DEBUGGING)
      // await this.validateExtractionReadiness(searchConfig);
      
      // First, let's debug what elements are actually on the page
      const debugInfo = await this.page.evaluate((config) => {
        const debug = {
          currentUrl: window.location.href,
          pageTitle: document.title,
          totalLinks: document.querySelectorAll('a').length,
          marketplaceLinks: document.querySelectorAll('a[href*="/marketplace/"]').length,
          itemLinks: document.querySelectorAll('a[href*="/marketplace/item/"]').length,
          allMarketplaceHrefs: [],
          sampleElements: []
        };

        // Collect all marketplace-related links
        const marketplaceLinks = document.querySelectorAll('a[href*="/marketplace/"]');
        for (let i = 0; i < Math.min(10, marketplaceLinks.length); i++) {
          debug.allMarketplaceHrefs.push({
            href: marketplaceLinks[i].href,
            text: marketplaceLinks[i].textContent?.trim().substring(0, 50) || 'No text',
            hasImage: marketplaceLinks[i].querySelector('img') !== null
          });
        }

        // Look for common container patterns
        const containerPatterns = [
          'div[data-pagelet*="marketplace"]',
          'div[role="main"] > div > div',
          'div[aria-label*="Collection"]',
          '[data-testid*="marketplace"]',
          'div[style*="grid"]',
          'a[href*="/marketplace/item/"]'
        ];

        containerPatterns.forEach(pattern => {
          const elements = document.querySelectorAll(pattern);
          if (elements.length > 0) {
            debug.sampleElements.push({
              selector: pattern,
              count: elements.length,
              sampleText: elements[0]?.textContent?.trim().substring(0, 100) || 'No text',
              hasLinks: elements[0]?.querySelector('a') !== null,
              hasImages: elements[0]?.querySelector('img') !== null
            });
          }
        });

        return debug;
      }, searchConfig);

      console.log('=== FACEBOOK MARKETPLACE DEBUG INFO ===');
      console.log('Current URL:', debugInfo.currentUrl);
      console.log('Page Title:', debugInfo.pageTitle);
      console.log('Total links on page:', debugInfo.totalLinks);
      console.log('Marketplace links:', debugInfo.marketplaceLinks);
      console.log('Item links:', debugInfo.itemLinks);
      console.log('Sample marketplace links:', JSON.stringify(debugInfo.allMarketplaceHrefs, null, 2));
      console.log('Sample container elements:', JSON.stringify(debugInfo.sampleElements, null, 2));
      console.log('=== END DEBUG INFO ===');

      // Handle pagination (scrolling) if configured
      if (searchConfig.pagination?.enabled && searchConfig.pagination?.scrollToLoad) {
        console.log('Handling Facebook Marketplace pagination with scrolling...');
        await this.handlePagination(searchConfig.pagination);
      }

      // Extract all data using page.evaluate to avoid DOM handle issues
      const extractedData = await this.page.evaluate((config) => {
        const containers = document.querySelectorAll(config.selectors.listingContainer);
        const results = [];
        
        console.log(`Found ${containers.length} potential containers on Facebook Marketplace using selector: ${config.selectors.listingContainer}`);
        
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
                  if (text && text.length > maxLength && text.length > 10 && 
                      !text.match(/^\$[\d,]+/) && !text.includes('miles')) {
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
                // URL extraction - try multiple approaches
                if (field.selector === '.') {
                  // Try container itself first
                  value = container.href;
                  // If container doesn't have href, look for any link inside
                  if (!value) {
                    const linkElement = container.querySelector('a[href*="/marketplace/item/"], a[href*="/item/"]');
                    value = linkElement ? linkElement.href : null;
                  }
                } else {
                  const linkElement = container.querySelector(field.selector);
                  value = linkElement ? linkElement.href : null;
                }
                
                // If still no URL found, try to construct one from any data attributes or IDs
                if (!value) {
                  const itemId = container.getAttribute('data-item-id') || 
                               container.getAttribute('id') ||
                               container.querySelector('[data-item-id]')?.getAttribute('data-item-id');
                  if (itemId) {
                    value = `https://www.facebook.com/marketplace/item/${itemId}`;
                  }
                }
                
              } else if (field.name === 'imageUrl') {
                // Image extraction
                const img = container.querySelector('img');
                value = img ? img.src : null;
                
              } else {
                // Standard extraction for other fields
                const targetElement = container.querySelector(field.selector);
                
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
          
          // Skip this listing if a required field failed
          // Note: We don't require URL anymore since Facebook structure varies
          if (!skipListing) {
            results.push(item);
          }
        }
        
        console.log(`Filtered to ${results.length} actual Facebook Marketplace listings`);
        return results;
      }, searchConfig);
      
      console.log(`Extracted ${extractedData.length} raw items from Facebook Marketplace`);
      
      // Process each extracted item
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
        
        // Extract detailed data if configured and enabled
        if (searchConfig.detailedScraping?.enabled) {
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
        item.source = this.siteConfig.name.toLowerCase().replace(/\s+/g, '-');

        // Apply filters
        if (this.passesFilters(item, searchConfig.filters)) {
          results.push(item);
          console.log(`Successfully extracted Facebook Marketplace listing ${results.length}: "${item.title}" - $${item.price}`);
          
          // Check if we've reached the limit after adding this item
          if (maxListings && results.length >= maxListings) {
            console.log(`Reached maxListings limit of ${maxListings} for Facebook Marketplace`);
            break;
          }
        } else {
          console.log(`Facebook Marketplace listing ${i + 1} filtered out: "${item.title}"`);
        }
      }

    } catch (error) {
      console.error('Error extracting data from Facebook Marketplace:', error.message);
      throw error;
    }

    return results;
  }

  /**
   * Validate that the page is ready for data extraction
   */
  async validateExtractionReadiness(searchConfig) {
    console.log('Validating page readiness for data extraction...');
    
    try {
      const readinessCheck = await this.page.evaluate((config) => {
        const results = {
          hasListingContainers: false,
          listingContainerCount: 0,
          hasValidContent: false,
          sampleContainerContent: [],
          pageStability: {
            hasMainContent: document.querySelector('[role="main"]') !== null,
            hasMarketplaceElements: document.querySelector('div[data-pagelet*="Marketplace"], div[aria-label*="Collection"]') !== null
          }
        };

        // Check for listing containers
        const containers = document.querySelectorAll(config.selectors.listingContainer);
        results.hasListingContainers = containers.length > 0;
        results.listingContainerCount = containers.length;

        // Sample first few containers to check content quality
        for (let i = 0; i < Math.min(3, containers.length); i++) {
          const container = containers[i];
          const sample = {
            index: i,
            hasText: container.textContent?.trim().length > 0,
            textLength: container.textContent?.trim().length || 0,
            hasLinks: container.querySelector('a[href*="/marketplace/item/"]') !== null,
            hasImages: container.querySelector('img') !== null,
            textPreview: container.textContent?.trim().substring(0, 100) || 'No text'
          };
          results.sampleContainerContent.push(sample);
        }

        // Check if containers have meaningful content (not just navigation)
        results.hasValidContent = results.sampleContainerContent.some(sample => 
          sample.hasText && sample.textLength > 20 && 
          (sample.hasLinks || sample.hasImages) &&
          !sample.textPreview.match(/^(Create new listing|Property Rentals|Electronics|Entertainment)/)
        );

        return results;
      }, searchConfig);

      console.log('Extraction readiness check:', JSON.stringify(readinessCheck, null, 2));

      // Analyze readiness results
      if (!readinessCheck.pageStability.hasMainContent) {
        throw new Error('Page stability check failed: Main content area missing. Page may have changed unexpectedly.');
      }

      if (!readinessCheck.hasListingContainers) {
        throw new Error(`No listing containers found using selector "${searchConfig.selectors.listingContainer}". Page layout may be inconsistent with current selectors.`);
      }

      if (!readinessCheck.hasValidContent) {
        // Check if all samples are navigation elements
        const allNavigationElements = readinessCheck.sampleContainerContent.every(sample => 
          sample.textPreview.match(/^(Create new listing|Property Rentals|Electronics|Entertainment|Classifieds|Garden|Home Improvement|Musical Instruments|Office Supplies|Pet Supplies|Sporting Goods|Toys|Buy and sell groups)/)
        );

        if (allNavigationElements) {
          throw new Error(`Page validation failed: All detected containers appear to be navigation/category elements rather than actual listings. Current selectors are capturing navigation instead of marketplace items. Sample content: ${readinessCheck.sampleContainerContent.map(s => s.textPreview).join(', ')}`);
        }

        console.warn(`Warning: Content quality check failed. Found ${readinessCheck.listingContainerCount} containers but content appears to be low quality. Proceeding with extraction but results may be unreliable.`);
      }

      console.log(`Extraction readiness validated: ${readinessCheck.listingContainerCount} containers found, content quality: ${readinessCheck.hasValidContent ? 'good' : 'questionable'}`);

    } catch (error) {
      console.error('Extraction readiness validation failed:', error.message);
      
      // Take a debug screenshot for troubleshooting
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const screenshotPath = `debug-facebook-extraction-error-${timestamp}.png`;
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Debug screenshot saved: ${screenshotPath}`);
      } catch (screenshotError) {
        console.warn('Could not take debug screenshot:', screenshotError.message);
      }

      // Re-throw the validation error to stop extraction
      throw new Error(`Facebook Marketplace extraction readiness failed: ${error.message}. Exiting scrape to prevent incorrect data extraction.`);
    }
  }

  /**
   * Extract detailed data by navigating to individual Facebook Marketplace listing pages
   */
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
      await this.humanDelay(1000, 2000);

    } catch (error) {
      console.error('Error extracting detailed data from Facebook Marketplace:', error.message);
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

  /**
   * Extract detailed field value from Facebook Marketplace listing page
   */
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
}

module.exports = FacebookMarketplaceScraper;
