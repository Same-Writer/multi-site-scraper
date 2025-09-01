const BaseScraper = require('./BaseScraper');
const moment = require('moment');

/**
 * CarGurus-specific scraper implementation
 * Handles two-phase navigation: form submission + URL-based filtering
 */
class CarGurusScraper extends BaseScraper {
  constructor(config, siteConfig) {
    super(config, siteConfig);
  }

  /**
   * CarGurus doesn't require authentication
   */
  async authenticate() {
    // No authentication required for CarGurus
    return true;
  }

  /**
   * Navigate to CarGurus search using two-phase approach
   * Phase 1: Form submission with initial search params
   * Phase 2: URL modifier application for additional filters
   */
  async navigateToSearch(url, searchKey) {
    console.log(`Starting CarGurus two-phase navigation for search: ${searchKey}`);
    
    const searchConfig = this.siteConfig.searchConfig[searchKey];
    if (!searchConfig) {
      throw new Error(`Search configuration for key "${searchKey}" not found in CarGurus config`);
    }

    // Phase 1: Handle initial form submission
    await this.handleInitialForm(searchConfig);

    // Phase 2: Apply URL modifiers if specified
    if (searchConfig.urlModifiers) {
      await this.applyUrlModifiers(searchConfig.urlModifiers);
    }

    console.log('CarGurus two-phase navigation completed successfully');
  }

  /**
   * Phase 1: Handle initial form submission with search parameters
   */
  async handleInitialForm(searchConfig) {
    console.log('Phase 1: Navigating to CarGurus base URL and filling initial form');
    
    // Navigate to base CarGurus URL with enhanced DataDome bypass measures
    const baseUrl = searchConfig.baseUrl || this.siteConfig.baseUrl;
    console.log(`Navigating to base URL: ${baseUrl}`);
    
    // Add extra stealth measures for DataDome
    await this.setupDataDomeBypass();
    
    await this.page.goto(baseUrl, {
      waitUntil: 'networkidle2',
      timeout: this.config.scraping.timeout
    });
    
    // Log the actual URL we ended up on
    const actualUrl = this.page.url();
    console.log(`Actual URL after navigation: ${actualUrl}`);

    // Check immediately for DataDome challenge
    await this.checkForDataDomeChallenge();

    // Add longer human-like delay after navigation for DataDome
    await this.humanDelay(3000, 7000);
    
    // Simulate human behavior - scroll a bit and move mouse
    await this.simulateHumanBehavior();

    // Wait for form elements to be available
    console.log('Waiting for CarGurus search form to load...');
    try {
      await this.page.waitForSelector(searchConfig.selectors.searchButton, { 
        timeout: 10000 
      });
    } catch (error) {
      console.log(`CarGurus search form not found. Expected selector: ${searchConfig.selectors.searchButton}`);
      
      // Let's try to get more information about what's on the page
      const pageUrl = this.page.url();
      console.log(`Current page URL: ${pageUrl}`);
      
      // Check if we're on an error page or if there are no results
      const pageTitle = await this.page.title();
      console.log(`Page title: ${pageTitle}`);
      
      // Check for any visible text on the page
      const allText = await this.page.evaluate(() => document.body.innerText);
      console.log(`Page text (first 1000 chars): ${allText.substring(0, 1000)}...`);
      
      // Check for any buttons or submit elements that might be using different selectors
      const possibleButtonSelectors = [
        'button',
        'input[type="submit"]',
        'input[type="button"]',
        '[type="submit"]',
        '[type="button"]',
        '[data-testid*="button"]',
        '[data-testid*="submit"]',
        '[class*="button"]',
        '[class*="submit"]',
        '.btn',
        '.submit'
      ];
      
      for (const selector of possibleButtonSelectors) {
        const elements = await this.page.$$(selector);
        if (elements.length > 0) {
          console.log(`Found ${elements.length} elements with selector: ${selector}`);
          // Log the first element's HTML
          const firstElementHTML = await this.page.evaluate((sel) => document.querySelector(sel).outerHTML, selector);
          console.log(`First element HTML (first 500 chars): ${firstElementHTML.substring(0, 500)}...`);
        }
      }
      
      // Check for any form elements
      const formElements = await this.page.$$('form');
      console.log(`Found ${formElements.length} form elements on the page`);
      for (let i = 0; i < formElements.length; i++) {
        const formHTML = await this.page.evaluate((index) => document.querySelectorAll('form')[index].outerHTML, i);
        console.log(`Form ${i} HTML (first 500 chars): ${formHTML.substring(0, 500)}...`);
      }
      
      throw new Error(`CarGurus search form not found. Expected selector: ${searchConfig.selectors.searchButton}`);
    }

    // Fill form fields based on initialSearchParams
    const params = searchConfig.initialSearchParams;
    if (!params) {
      throw new Error('initialSearchParams not found in CarGurus search configuration');
    }
    
    // Handle condition selection (new/used)
    if (params.condition && searchConfig.selectors.conditionSelect) {
      console.log(`Selecting condition: ${params.condition}`);
      await this.selectFormOption(searchConfig.selectors.conditionSelect, params.condition);
      await this.humanDelay(500, 1000);
    }

    // Handle make selection
    if (params.make && searchConfig.selectors.makeSelect) {
      console.log(`Selecting make: ${params.make}`);
      await this.selectFormOption(searchConfig.selectors.makeSelect, params.make);
      await this.humanDelay(500, 1000);
    }

    // Handle model selection
    if (params.model && searchConfig.selectors.modelSelect) {
      console.log(`Selecting model: ${params.model}`);
      await this.selectFormOption(searchConfig.selectors.modelSelect, params.model);
      await this.humanDelay(500, 1000);
    }

    // Handle zip code input
    if (params.zip && searchConfig.selectors.zipInput) {
      console.log(`Entering zip code: ${params.zip}`);
      await this.fillInput(searchConfig.selectors.zipInput, params.zip);
      await this.humanDelay(500, 1000);
    }

    // Submit the form
    console.log('Submitting CarGurus search form...');
    await Promise.all([
      this.page.waitForNavigation({ 
        waitUntil: 'networkidle2', 
        timeout: 20000 
      }),
      this.page.click(searchConfig.selectors.searchButton)
    ]);

    // Wait for search results to stabilize
    await this.humanDelay(3000, 5000);
    console.log('Phase 1 completed: CarGurus form submission successful');
  }

  /**
   * Setup additional DataDome bypass measures
   */
  async setupDataDomeBypass() {
    // Inject additional scripts to bypass DataDome fingerprinting
    await this.page.evaluateOnNewDocument(() => {
      // Override canvas fingerprinting
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type) {
        if (type === '2d') {
          const context = getContext.call(this, type);
          const originalFillText = context.fillText;
          context.fillText = function(...args) {
            // Add slight noise to text rendering
            const originalGlobalAlpha = this.globalAlpha;
            this.globalAlpha = originalGlobalAlpha * (0.99 + Math.random() * 0.01);
            const result = originalFillText.apply(this, args);
            this.globalAlpha = originalGlobalAlpha;
            return result;
          };
          return context;
        }
        return getContext.call(this, type);
      };

      // Override WebGL fingerprinting
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        if (parameter === 37446) {
          return 'Intel(R) Iris(TM) Graphics 6100';
        }
        return getParameter.call(this, parameter);
      };

      // Mock realistic timezone
      Date.prototype.getTimezoneOffset = function() {
        return -480; // Pacific Standard Time
      };

      // Override battery API
      Object.defineProperty(navigator, 'getBattery', {
        get: () => undefined
      });

      // Mock realistic connection
      Object.defineProperty(navigator, 'connection', {
        get: () => ({
          effectiveType: '4g',
          downlink: 10,
          downlinkMax: 10,
          rtt: 50,
          saveData: false,
          type: 'wifi'
        })
      });

      // Override permissions API
      const originalQuery = navigator.permissions.query.bind(navigator.permissions);
      navigator.permissions.query = function(parameters) {
        return originalQuery(parameters).then(result => {
          if (parameters.name === 'notifications') {
            result.state = 'default';
          }
          return result;
        });
      };
    });
  }

  /**
   * Check for DataDome challenge and handle if present
   */
  async checkForDataDomeChallenge() {
    try {
      // Wait a bit for any challenge to load
      await this.humanDelay(2000, 3000);
      
      // Check for DataDome iframe
      const dataDomeIframes = await this.page.$$('iframe[src*="captcha-delivery.com"], iframe[src*="datadome"]');
      
      if (dataDomeIframes.length > 0) {
        console.log('DataDome challenge detected - attempting bypass strategies');
        
        // Strategy 1: Try refreshing the page with different headers
        await this.page.setExtraHTTPHeaders({
          'Referer': 'https://www.google.com/search?q=bmw+z3+for+sale',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        });
        
        await this.humanDelay(2000, 4000);
        await this.page.reload({ waitUntil: 'networkidle2' });
        
        // Check again after reload
        const dataDomeIframesAfterReload = await this.page.$$('iframe[src*="captcha-delivery.com"], iframe[src*="datadome"]');
        
        if (dataDomeIframesAfterReload.length > 0) {
          console.log('DataDome challenge persists after reload');
          
          // Strategy 2: Try navigating with more human-like pattern
          await this.humanDelay(5000, 8000);
          
          // Navigate to a different page first, then back
          await this.page.goto('https://www.cargurus.com/Cars/', {
            waitUntil: 'networkidle2',
            timeout: 30000
          });
          
          await this.humanDelay(3000, 6000);
          await this.simulateHumanBehavior();
          
          // Now try to go back to the original page
          const targetUrl = this.page.url();
          console.log('Attempting to navigate to search page via human-like browsing pattern');
        }
      }
    } catch (error) {
      console.log('Error checking for DataDome challenge:', error.message);
    }
  }

  /**
   * Simulate human-like behavior to avoid detection
   */
  async simulateHumanBehavior() {
    try {
      // Random scrolling
      const scrollAmount = Math.floor(Math.random() * 500) + 200;
      await this.page.evaluate((amount) => {
        window.scrollBy(0, amount);
      }, scrollAmount);
      
      await this.humanDelay(500, 1500);
      
      // Random mouse movements
      const viewport = await this.page.viewport();
      const randomX = Math.floor(Math.random() * viewport.width);
      const randomY = Math.floor(Math.random() * viewport.height);
      
      await this.page.mouse.move(randomX, randomY);
      await this.humanDelay(200, 800);
      
      // Sometimes click on a random non-interactive element
      if (Math.random() > 0.7) {
        await this.page.mouse.click(randomX, randomY);
        await this.humanDelay(500, 1500);
      }
      
      // Scroll back up a bit
      await this.page.evaluate(() => {
        window.scrollBy(0, -100);
      });
      
      await this.humanDelay(500, 1000);
    } catch (error) {
      console.log('Error during human behavior simulation:', error.message);
    }
  }

  /**
   * Phase 2: Apply additional URL-based filters
   */
  async applyUrlModifiers(urlModifiers) {
    console.log(`Phase 2: Applying URL modifiers: ${urlModifiers}`);
    
    const currentUrl = this.page.url();
    const separator = currentUrl.includes('?') ? '&' : '?';
    const newUrl = `${currentUrl}${separator}${urlModifiers}`;
    
    console.log(`Navigating to filtered URL: ${newUrl}`);
    await this.page.goto(newUrl, {
      waitUntil: 'networkidle2',
      timeout: this.config.scraping.timeout
    });

    // Wait for filtered results to load
    await this.humanDelay(2000, 4000);
    console.log('Phase 2 completed: URL modifiers applied successfully');
  }

  /**
   * Helper method to select options from dropdowns/selects
   */
  async selectFormOption(selector, value) {
    try {
      console.log(`Attempting to select option '${value}' using selector: ${selector}`);
      
      // Try different approaches for form selection
      let element = null;
      let foundSelector = selector; // Keep track of which selector actually found the element
      
      // Approach 1: Direct selector
      element = await this.page.$(selector);
      
      // Approach 2: Try each part of the comma-separated selector individually
      if (!element) {
        const selectors = selector.split(',').map(s => s.trim());
        for (const sel of selectors) {
          element = await this.page.$(sel);
          if (element) {
            console.log(`Found element with individual selector: ${sel}`);
            foundSelector = sel;
            break;
          }
        }
      }
      
      // Approach 3: Try broader selectors
      if (!element) {
        const broadSelectors = [
          'select',
          '[role="combobox"]',
          '[data-testid*="select"]',
          '[class*="select"]',
          '[class*="dropdown"]'
        ];
        
        for (const sel of broadSelectors) {
          element = await this.page.$(sel);
          if (element) {
            console.log(`Found element with broad selector: ${sel}`);
            foundSelector = sel;
            break;
          }
        }
      }
      
      if (!element) {
        // Log all available selectors on the page for debugging
        const allSelectors = await this.page.evaluate(() => {
          const elements = document.querySelectorAll('select, input, button, [role="combobox"], [data-testid], [class*="select"], [class*="dropdown"]');
          return Array.from(elements).map(el => {
            const attrs = [];
            for (let i = 0; i < el.attributes.length; i++) {
              const attr = el.attributes[i];
              attrs.push(`${attr.name}="${attr.value}"`);
            }
            return `${el.tagName.toLowerCase()}[${attrs.join(' ')}]`;
          });
        });
        
        console.log('Available elements on page:', allSelectors.slice(0, 20)); // Limit output
        throw new Error(`Form element not found: ${selector}`);
      }

      // Check if it's a select element
      const tagName = await element.evaluate(el => el.tagName.toLowerCase());
      console.log(`Element tag name: ${tagName}`);
      
      if (tagName === 'select') {
        console.log(`Using page.select for select element with selector: ${foundSelector}`);
        await this.page.select(foundSelector, value);
      } else {
        // Handle custom dropdowns - click to open, then select option
        console.log(`Clicking element to open dropdown`);
        await element.click();
        await this.humanDelay(500, 1000);
        
        // Look for option with matching text or value
        const optionSelector = `${selector} option[value="${value}"], [data-value="${value}"], [data-testid*="${value}"], [role="option"]`;
        try {
          console.log(`Looking for option with selector: ${optionSelector}`);
          await this.page.waitForSelector(optionSelector, { timeout: 3000 });
          await this.page.click(optionSelector);
        } catch (error) {
          console.log(`Option not found with selector, trying text content approach`);
          // Fallback: try clicking option by text content
          await this.page.evaluate((sel, val) => {
            const options = document.querySelectorAll(`${sel} option, [role="option"], [data-value], [value]`);
            for (const option of options) {
              if (option.textContent.toLowerCase().includes(val.toLowerCase()) || 
                  option.getAttribute('data-value') === val ||
                  option.getAttribute('value') === val) {
                option.click();
                return;
              }
            }
          }, selector, value);
        }
      }
    } catch (error) {
      console.warn(`Could not select form option ${value} for ${selector}:`, error.message);
      throw error;
    }
  }

  /**
   * Helper method to fill input fields
   */
  async fillInput(selector, value) {
    try {
      console.log(`Attempting to fill input '${value}' using selector: ${selector}`);
      
      // Try different approaches for finding the input element
      let element = null;
      let foundSelector = selector; // Keep track of which selector actually found the element
      
      // Approach 1: Direct selector
      element = await this.page.$(selector);
      
      // Approach 2: Try each part of the comma-separated selector individually
      if (!element) {
        const selectors = selector.split(',').map(s => s.trim());
        for (const sel of selectors) {
          element = await this.page.$(sel);
          if (element) {
            console.log(`Found input element with individual selector: ${sel}`);
            foundSelector = sel;
            break;
          }
        }
      }
      
      // Approach 3: Try broader selectors
      if (!element) {
        const broadSelectors = [
          'input[type="text"]',
          'input[type="search"]',
          'input[placeholder*="zip"]',
          'input[name*="zip"]',
          'input[data-testid*="zip"]',
          'input[class*="zip"]',
          'input'
        ];
        
        for (const sel of broadSelectors) {
          element = await this.page.$(sel);
          if (element) {
            console.log(`Found input element with broad selector: ${sel}`);
            foundSelector = sel;
            break;
          }
        }
      }
      
      if (!element) {
        // Log all available input elements on the page for debugging
        const allInputs = await this.page.evaluate(() => {
          const inputs = document.querySelectorAll('input');
          return Array.from(inputs).map(input => {
            const attrs = [];
            for (let i = 0; i < input.attributes.length; i++) {
              const attr = input.attributes[i];
              attrs.push(`${attr.name}="${attr.value}"`);
            }
            return `input[${attrs.join(' ')}]`;
          });
        });
        
        console.log('Available input elements on page:', allInputs.slice(0, 20)); // Limit output
        throw new Error(`Input element not found: ${selector}`);
      }
      
      // Wait for the element to be visible and interactable
      await this.page.waitForSelector(foundSelector, { timeout: 5000 });
      await this.page.click(foundSelector);
      await this.page.evaluate(sel => {
        const el = document.querySelector(sel);
        if (el) el.value = '';
      }, foundSelector);
      await this.page.type(foundSelector, value.toString(), { delay: 100 });
    } catch (error) {
      console.warn(`Could not fill input ${selector} with ${value}:`, error.message);
      throw error;
    }
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
          return !button || 
                 button.disabled || 
                 button.classList.contains('disabled') ||
                 button.getAttribute('aria-disabled') === 'true';
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

        // Wait for new content to load
        await this.humanDelay(2000, 4000);
        
        currentPage++;
        
      } catch (error) {
        console.warn(`Error on page ${currentPage + 1}:`, error.message);
        break;
      }
    }
    
    console.log(`CarGurus pagination completed, processed ${currentPage} pages`);
  }

  /**
   * Extract data from CarGurus search results
   */
  async extractData(searchConfig, maxListings = null) {
    const results = [];
    
    try {
      console.log('Extracting data from CarGurus...');
      
      // Wait for listings to be present
      console.log(`Waiting for listing containers with selector: ${searchConfig.selectors.listingContainer}`);
      try {
        await this.page.waitForSelector(searchConfig.selectors.listingContainer, { 
          timeout: 10000 
        });
        console.log('Found listing containers with configured selector');
        
        // Let's also check how many containers we found
        const containerCount = (await this.page.$$(searchConfig.selectors.listingContainer)).length;
        console.log(`Found ${containerCount} listing containers with configured selector`);
      } catch (error) {
        console.warn('CarGurus listing containers not found, page may have no results');
        
        // Check if we're encountering a CAPTCHA challenge
        const captchaElements = await this.page.$$('.captcha, .captcha-container, [class*="captcha"], [data-testid*="captcha"], [id*="captcha"]');
        if (captchaElements.length > 0) {
          console.log('CAPTCHA challenge detected, blocking access to search results');
          console.log(`Found ${captchaElements.length} CAPTCHA-related elements on page`);
          
          // Log information about the CAPTCHA elements
          for (let i = 0; i < Math.min(captchaElements.length, 3); i++) {
            const elementHTML = await this.page.evaluate((index) => {
              const element = document.querySelectorAll('.captcha, .captcha-container, [class*="captcha"], [data-testid*="captcha"], [id*="captcha"]')[index];
              return element ? element.outerHTML : 'Element not found';
            }, i);
            
            console.log(`CAPTCHA element ${i + 1} HTML (first 500 chars): ${elementHTML.substring(0, 500)}...`);
          }
          
          // Check for iframe-based CAPTCHAs (like DataDome)
          const ddIframeElements = await this.page.$$('iframe[src*="captcha"], iframe[src*="CAPTCHA"], iframe[src*="datadome"], iframe[src*="DataDome"]');
          if (ddIframeElements.length > 0) {
            console.log(`Found ${ddIframeElements.length} CAPTCHA iframes on page`);
            
            for (let i = 0; i < Math.min(ddIframeElements.length, 3); i++) {
              const iframeSrc = await this.page.evaluate((index) => {
                const iframe = document.querySelectorAll('iframe[src*="captcha"], iframe[src*="CAPTCHA"], iframe[src*="datadome"], iframe[src*="DataDome"]')[index];
                return iframe ? iframe.src : 'Source not found';
              }, i);
              
              console.log(`CAPTCHA iframe ${i + 1} source: ${iframeSrc}`);
            }
            
            throw new Error('CAPTCHA challenge detected from DataDome. This is preventing access to CarGurus search results. Consider using official APIs or manual data collection for CarGurus.');
          }
        }
        
        // Let's try to get more information about what's on the page
        const pageUrl = this.page.url();
        console.log(`Current page URL: ${pageUrl}`);
        
        // Check if we're on an error page or if there are no results
        const pageTitle = await this.page.title();
        console.log(`Page title: ${pageTitle}`);
        
        // Check for common "no results" messages
        const noResultsElements = await this.page.$x("//text()[contains(., 'no results') or contains(., 'No results') or contains(., 'not found') or contains(., 'Not found')]");
        if (noResultsElements.length > 0) {
          console.log('Found "no results" message on page');
          for (const element of noResultsElements) {
            const text = await this.page.evaluate(el => el.textContent, element);
            console.log(`No results text: ${text}`);
          }
        }
        
        // Check for any visible text on the page
        const allText = await this.page.evaluate(() => document.body.innerText);
        console.log(`Page text (first 1000 chars): ${allText.substring(0, 1000)}...`);
        
        // Check for any listing containers that might be using different selectors
        const possibleContainerSelectors = [
          '.listing',
          '.result',
          '.vehicle',
          '.car',
          '.item',
          '[data-testid*="listing"]',
          '[data-testid*="result"]',
          '[data-testid*="vehicle"]',
          '[class*="listing"]',
          '[class*="result"]',
          '[class*="vehicle"]',
          '.cg-vehicle-listing',
          '.inventory-listing',
          '.srp-listing',
          '.search-result',
          '[data-cg]',
          '[data-cargurus]',
          '.cg-listing',
          '.cg-vehicle',
          '.cg-result',
          '.cg-inventory',
          '.cg-search-result',
          '[data-cg*="listing"]',
          '[data-cg*="result"]',
          '[data-cg*="vehicle"]',
          '[data-cg*="inventory"]',
          '[data-cargurus*="listing"]',
          '[data-cargurus*="result"]',
          '[data-cargurus*="vehicle"]',
          '[data-cargurus*="inventory"]',
          '.card',
          '.tile',
          '.offer',
          '[role="listitem"]',
          '[role="article"]',
          '.cg-dealFinder-result-wrap',
          '[data-testid="listing-row"]',
          '.listing-row',
          '.srp-list-item'
        ];
        
        console.log('Checking for possible listing containers with various selectors...');
        for (const selector of possibleContainerSelectors) {
          const elements = await this.page.$$(selector);
          if (elements.length > 0) {
            console.log(`Found ${elements.length} elements with selector: ${selector}`);
            // Log the first element's HTML
            const firstElementHTML = await this.page.evaluate((sel) => document.querySelector(sel).outerHTML, selector);
            console.log(`First element HTML (first 500 chars): ${firstElementHTML.substring(0, 500)}...`);
            
            // If we found elements, let's also check if they match the expected selector
            if (selector === searchConfig.selectors.listingContainer) {
              console.log('Found elements with the exact selector from config!');
            }
          }
        }
        
        // Let's also get a broader view of the page structure
        console.log('Getting broader view of page structure...');
        const pageStructure = await this.page.evaluate(() => {
          try {
            // Get all elements with class names
            const elementsWithClasses = Array.from(document.querySelectorAll('[class]'));
            const classCounts = {};
            elementsWithClasses.forEach(el => {
              // Check if el.className is a string before trying to split it
              if (typeof el.className === 'string') {
                const classes = el.className.split(' ').filter(c => c.trim() !== '');
                classes.forEach(cls => {
                  if (cls.includes('cg-') || cls.includes('dealFinder') || cls.includes('listing') || cls.includes('result') || cls.includes('vehicle') || cls.includes('inventory') || cls.includes('card') || cls.includes('item')) {
                    classCounts[cls] = (classCounts[cls] || 0) + 1;
                  }
                });
              }
            });
            
            // Get all elements with data-testid
            const elementsWithDataTestid = Array.from(document.querySelectorAll('[data-testid]'));
            const testidCounts = {};
            elementsWithDataTestid.forEach(el => {
              const testid = el.getAttribute('data-testid');
              if (testid && (testid.includes('listing') || testid.includes('result') || testid.includes('vehicle') || testid.includes('inventory') || testid.includes('card') || testid.includes('item'))) {
                testidCounts[testid] = (testidCounts[testid] || 0) + 1;
              }
            });
            
            // Get all unique class names
            const allClasses = new Set();
            elementsWithClasses.forEach(el => {
              // Check if el.className is a string before trying to split it
              if (typeof el.className === 'string') {
                const classes = el.className.split(' ').filter(c => c.trim() !== '');
                classes.forEach(cls => allClasses.add(cls));
              }
            });
            
            // Get all unique data-testid values
            const allTestids = new Set();
            elementsWithDataTestid.forEach(el => {
              const testid = el.getAttribute('data-testid');
              if (testid) allTestids.add(testid);
            });
            
            // Get the full HTML content of the body
            const bodyHTML = document.body ? document.body.innerHTML : 'No body element found';
            
            return {
              classCounts,
              testidCounts,
              allClasses: Array.from(allClasses),
              allTestids: Array.from(allTestids),
              bodyHTML: bodyHTML.substring(0, 5000) // Limit to first 5000 characters
            };
          } catch (error) {
            console.log('Error getting page structure:', error.message);
            return {
              classCounts: {},
              testidCounts: {},
              allClasses: [],
              allTestids: [],
              bodyHTML: 'Error getting page structure'
            };
          }
        });
        
        console.log('Class counts for relevant classes:', pageStructure.classCounts);
        console.log('Data-testid counts for relevant attributes:', pageStructure.testidCounts);
        console.log('Total unique classes found:', pageStructure.allClasses.length);
        console.log('Total unique data-testid values found:', pageStructure.allTestids.length);
        
        // Let's log some of the class names and data-testid values to see what we're working with
        if (pageStructure.allClasses.length > 0) {
          console.log('Sample of class names (first 50):', pageStructure.allClasses.slice(0, 50));
        }
        if (pageStructure.allTestids.length > 0) {
          console.log('Sample of data-testid values (first 50):', pageStructure.allTestids.slice(0, 50));
        }
        
        // Log a snippet of the body HTML to see what's actually on the page
        if (pageStructure.bodyHTML) {
          console.log('Body HTML snippet (first 5000 chars):', pageStructure.bodyHTML);
        }
        
        // Let's also check if there are any script tags that might contain JSON data
        console.log('Checking for script tags with JSON data...');
        const scriptTags = await this.page.$$('script');
        for (let i = 0; i < Math.min(scriptTags.length, 10); i++) {
          const scriptContent = await this.page.evaluate((index) => {
            const script = document.querySelectorAll('script')[index];
            return script.textContent;
          }, i);
          
          if (scriptContent && (scriptContent.includes('listing') || scriptContent.includes('vehicle') || scriptContent.includes('inventory'))) {
            console.log(`Found potentially relevant script tag ${i} (first 500 chars): ${scriptContent.substring(0, 500)}...`);
          }
        }
        
        // Let's also check for any elements that might contain listing information
        console.log('Checking for any elements that might contain listing information...');
        const listingIndicators = [
          '[class*="title"]',
          '[class*="price"]',
          '[class*="mileage"]',
          '[class*="dealer"]',
          '[data-testid*="title"]',
          '[data-testid*="price"]',
          '[data-testid*="mileage"]',
          '[data-testid*="dealer"]'
        ];
        
        for (const indicator of listingIndicators) {
          const elements = await this.page.$$(indicator);
          if (elements.length > 0) {
            console.log(`Found ${elements.length} elements with indicator: ${indicator}`);
          }
        }
        
        // Check for iframe-based CAPTCHAs (like DataDome)
        const ddIframeElements = await this.page.$$('iframe[src*="captcha"], iframe[src*="CAPTCHA"], iframe[src*="datadome"], iframe[src*="DataDome"]');
        if (ddIframeElements.length > 0) {
          console.log(`Found ${ddIframeElements.length} CAPTCHA iframes on page`);
          
          for (let i = 0; i < Math.min(ddIframeElements.length, 3); i++) {
            const iframeSrc = await this.page.evaluate((index) => {
              const iframe = document.querySelectorAll('iframe[src*="captcha"], iframe[src*="CAPTCHA"], iframe[src*="datadome"], iframe[src*="DataDome"]')[index];
              return iframe ? iframe.src : 'Source not found';
            }, i);
            
            console.log(`CAPTCHA iframe ${i + 1} source: ${iframeSrc}`);
          }
          
          throw new Error('CAPTCHA challenge detected from DataDome. This is preventing access to CarGurus search results. Consider using official APIs or manual data collection for CarGurus.');
        }
        
        // If we've determined that this is a CAPTCHA issue, throw a specific error
        if (captchaElements && (captchaElements.length > 0)) {
          throw new Error('CAPTCHA challenge detected. This is preventing access to CarGurus search results. Consider using official APIs or manual data collection for CarGurus.');
        }
        
        return results;
      }

      // Extract all data using page.evaluate to avoid DOM handle issues
      console.log('Extracting data using page.evaluate...');
      const extractedData = await this.page.evaluate((config) => {
        const containers = document.querySelectorAll(config.selectors.listingContainer);
        const results = [];
        
        console.log(`Found ${containers.length} CarGurus listing containers`);
        
        // Debug: Log the HTML structure of the first few containers
        const debugCount = Math.min(containers.length, 3);
        for (let i = 0; i < debugCount; i++) {
          console.log(`DEBUG: CarGurus container ${i + 1} HTML structure:`);
          console.log(containers[i].outerHTML.substring(0, 1000) + '...');
        }
        
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
                console.log(`Extracted value with wildcard selector for field ${field.name}: ${value?.substring(0, 100)}...`);
              } else {
                // Standard extraction
                console.log(`Attempting to extract field ${field.name} with selector: ${field.selector}`);
                const targetElement = container.querySelector(field.selector);
                
                if (!targetElement) {
                  console.log(`Element not found for field ${field.name} with selector: ${field.selector}`);
                  if (field.required) {
                    throw new Error(`Required selector not found: ${field.selector}`);
                  }
                  value = null;
                } else {
                  console.log(`Found element for field ${field.name}`);
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
                    default:
                      value = targetElement.getAttribute(field.attribute);
                  }
                  console.log(`Extracted value for field ${field.name}: ${value?.substring(0, 100)}...`);
                }
              }
              
              item[field.name] = value;
              
            } catch (error) {
              console.warn(`Failed to extract ${field.name} from CarGurus listing ${i + 1}:`, error.message);
              if (field.required) {
                skipListing = true;
                break;
              }
              item[field.name] = null;
            }
          }
          
          // Skip this listing if a required field failed or if it doesn't have essential data
          if (!skipListing && item.title && (item.url || item.price)) {
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

        // Make URLs absolute if they're relative
        if (item.url && item.url.startsWith('/')) {
          item.url = `${this.siteConfig.baseUrl}${item.url}`;
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
        if (i > 0 && i % 5 === 0) {
          await this.humanDelay(500, 1000);
        }
      }

    } catch (error) {
      console.error('Error extracting data from CarGurus:', error.message);
      throw error;
    }

    return results;
  }
}

module.exports = CarGurusScraper;
