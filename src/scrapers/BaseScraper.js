import puppeteer from 'puppeteer';
import moment from 'moment';

/**
 * Base scraper class that provides common functionality for all site scrapers
 */
class BaseScraper {
  constructor(config, siteConfig) {
    this.config = config;
    this.siteConfig = siteConfig;
    this.browser = null;
    this.page = null;
  }

  /**
   * Initialize the browser and page with common settings
   */
  async initialize() {
    console.log(`Initializing ${this.siteConfig.name} scraper...`);
    
    const puppeteerArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-blink-features=AutomationControlled',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-ipc-flooding-protection',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-sync',
      '--disable-translate',
      '--metrics-recording-only',
      '--safebrowsing-disable-auto-update',
      '--disable-features=LeakDetector',
      '--disable-features=InterestFeedContentSuggestions',
      '--disable-features=PrivacySandboxSettings4',
      '--disable-features=AutofillServerCommunication',
      '--disable-features=PasswordCheck',
      '--disable-features=SafeBrowsing',
      '--disable-features=MediaRouter',
      '--disable-features=OptimizationHints',
      '--disable-features=AutofillAssistant'
    ];

    this.browser = await puppeteer.launch({
      headless: this.config.scraping.headless,
      args: puppeteerArgs,
      defaultViewport: null,
      executablePath: process.env.DOCKER_ENV ? '/usr/bin/chromium' : undefined,
      ignoreDefaultArgs: ['--enable-automation'],
      slowMo: Math.random() * 100 + 50
    });

    this.page = await this.browser.newPage();
    await this.setupAntiDetection();
    
    console.log(`${this.siteConfig.name} scraper initialized successfully`);
  }

  /**
   * Setup anti-detection measures - can be overridden by specific scrapers
   */
  async setupAntiDetection() {
    // Remove automation indicators
    await this.page.evaluateOnNewDocument(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      
      // Mock plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          {
            0: { type: 'application/pdf' },
            description: 'Portable Document Format',
            length: 1,
            name: 'Chrome PDF Plugin'
          },
          {
            0: { type: 'application/pdf' },
            description: 'Portable Document Format',
            length: 1,
            name: 'Chrome PDF Viewer'
          },
          {
            0: { type: 'application/x-google-chrome-pdf' },
            description: 'Native PDF Viewer',
            length: 1,
            name: 'Native Client'
          }
        ],
      });
      
      // Mock languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
      
      // Mock Chrome object
      window.chrome = {
        runtime: {},
        app: {
          isInstalled: false,
          InstallState: {
            DISABLED: "disabled",
            INSTALLED: "installed",
            NOT_INSTALLED: "not_installed"
          },
          RunningState: {
            CANNOT_RUN: "cannot_run",
            READY_TO_RUN: "ready_to_run",
            RUNNING: "running"
          }
        }
      };

      // Remove automation flags
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
      
      // Mock WebGL vendor info
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        if (parameter === 37446) {
          return 'Intel(R) Iris(TM) Graphics 6100';
        }
        return getParameter(parameter);
      };
      
      // Mock screen properties
      Object.defineProperty(Screen.prototype, 'availWidth', {
        get: () => window.screen.width,
      });
      
      Object.defineProperty(Screen.prototype, 'availHeight', {
        get: () => window.screen.height,
      });
      
      // Mock device memory
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8, // 8GB device memory
      });
      
      // Mock hardware concurrency
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 8, // 8 CPU cores
      });
      
      // Hide puppeteer-specific properties
      delete navigator.__proto__.webdriver;
      
      // Mock other browser properties
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
      
      // Mock other navigator properties
      Object.defineProperty(navigator, 'cookieEnabled', {
        get: () => true,
      });
      
      Object.defineProperty(navigator, 'onLine', {
        get: () => true,
      });
    });

    // Set realistic user agent
    const userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0 Safari/537.36'
    ];
    
    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    await this.page.setUserAgent(randomUserAgent);
    
    await this.page.setViewport(this.config.scraping.viewport);
    
    // Set realistic headers
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1'
    });
    
    // Emulate timezone
    await this.page.emulateTimezone('America/Los_Angeles');
    
    // Emulate media features
    await this.page.emulateMediaFeatures([
      { name: 'prefers-color-scheme', value: 'light' },
      { name: 'prefers-reduced-motion', value: 'no-preference' }
    ]);
    
    // Set cache enabled
    await this.page.setCacheEnabled(true);
  }

  /**
   * Human-like delay between actions
   */
  async humanDelay(min = 500, max = 1500) {
    const delay = Math.random() * (max - min) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Human-like scrolling
   */
  async humanScroll(distance = null) {
    const scrollDistance = distance || Math.random() * 500 + 300;
    const steps = Math.floor(scrollDistance / 100);
    
    for (let i = 0; i < steps; i++) {
      await this.page.evaluate((step) => {
        window.scrollBy(0, step);
      }, 100);
      await this.humanDelay(50, 150);
    }
  }

  /**
   * Transform values based on transformation type
   */
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
          return `${this.siteConfig.baseUrl}${value}`;
        }
        return value;
      
      case 'cleanDescription':
        return value
          .replace(/QR Code Link to This Post/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
      
      case 'extractPostingId':
        const idMatch = value.match(/post id:\s*(\d+)/i);
        return idMatch ? idMatch[1] : value;
      
      case 'extractMileage':
        if (!value) return null;
        const mileageMatch = value.match(/([\d,]+)\s*miles?/i);
        return mileageMatch ? parseInt(mileageMatch[1].replace(/[,]/g, '')) : null;
      
      default:
        return value;
    }
  }

  /**
   * Apply filters to results
   */
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

  /**
   * Close the browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log(`${this.siteConfig.name} scraper closed`);
    }
  }

  // Abstract methods that must be implemented by specific scrapers
  
  /**
   * Authenticate with the site if required
   * @returns {Promise<boolean>} Success status
   */
  async authenticate() {
    throw new Error('authenticate() method must be implemented by specific scraper');
  }

  /**
   * Navigate to the search URL and handle initial page load
   * @param {string} url - The URL to scrape
   * @param {string} searchKey - The search configuration key
   * @returns {Promise<void>}
   */
  async navigateToSearch(url, searchKey) {
    throw new Error('navigateToSearch() method must be implemented by specific scraper');
  }

  /**
   * Handle pagination if the site uses it
   * @param {Object} paginationConfig - Pagination configuration
   * @returns {Promise<void>}
   */
  async handlePagination(paginationConfig) {
    throw new Error('handlePagination() method must be implemented by specific scraper');
  }

  /**
   * Extract data from the current page
   * @param {Object} searchConfig - Search configuration
   * @param {number} maxListings - Maximum number of listings to extract
   * @returns {Promise<Array>} Array of extracted listings
   */
  async extractData(searchConfig, maxListings = null) {
    throw new Error('extractData() method must be implemented by specific scraper');
  }

  /**
   * Main scraping method that orchestrates the entire process
   * @param {string} url - The URL to scrape
   * @param {string} searchKey - The search configuration key
   * @param {number} maxListings - Maximum number of listings to extract
   * @returns {Promise<Array>} Array of extracted listings
   */
  async scrape(url, searchKey, maxListings = null) {
    if (!this.page) {
      throw new Error('Scraper not initialized. Call initialize() first.');
    }

    console.log(`Starting ${this.siteConfig.name} scrape of: ${url}`);
    
    try {
      // Authenticate if required
      await this.authenticate();

      // Navigate to search page
      await this.navigateToSearch(url, searchKey);

      // Get search configuration
      const searchConfig = this.siteConfig.searchConfig[searchKey];
      if (!searchConfig) {
        throw new Error(`Search configuration for key "${searchKey}" not found`);
      }

      // Handle pagination if enabled
      if (searchConfig.pagination?.enabled) {
        await this.handlePagination(searchConfig.pagination);
      }

      // Extract data
      const results = await this.extractData(searchConfig, maxListings);

      console.log(`Extracted ${results.length} items from ${this.siteConfig.name}`);
      return results;

    } catch (error) {
      console.error(`Error scraping ${this.siteConfig.name}:`, error.message);
      throw error;
    }
  }
}

export default BaseScraper;
