const puppeteer = require('puppeteer');
const moment = require('moment');

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
    
    // Add global promise rejection handler to prevent unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.warn('Unhandled promise rejection caught:', reason);
      // Don't exit process, just log the error
    });
    
    // Try to use Camoufox for enhanced anti-detection
    let browser;
    let usingCamoufox = false;
    
    try {
      // Try dynamic import with proper ES module handling for Camoufox
      const { launch } = await import('camoufox');
      const camoufox = { launch };
      
      // Enhanced Camoufox configuration for DataDome bypass
      browser = await camoufox.launch({
        headless: this.config.scraping.headless,
        args: [
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
          '--disable-ipc-flooding-protection',
          '--disable-client-side-phishing-detection',
          '--disable-default-apps',
          '--disable-hang-monitor',
          '--disable-popup-blocking',
          '--disable-prompt-on-repost',
          '--disable-sync',
          '--metrics-recording-only',
          '--no-default-browser-check',
          '--safebrowsing-disable-auto-update',
          '--enable-automation=false',
          '--password-store=basic',
          '--use-mock-keychain'
        ],
        defaultViewport: null,
        executablePath: process.env.DOCKER_ENV ? '/usr/bin/chromium' : undefined,
        ignoreDefaultArgs: ['--enable-automation', '--enable-blink-features=AutomationControlled'],
        slowMo: Math.random() * 150 + 100,
        // Enhanced Camoufox-specific settings
        os: 'windows', // Mimic Windows OS
        screen: { width: 1920, height: 1080 },
        addons: ['ublock'], // Add uBlock Origin addon for better fingerprint
      });
      
      usingCamoufox = true;
      console.log('Using Camoufox with enhanced DataDome bypass features');
    } catch (camoufoxError) {
      console.log(`Camoufox initialization failed: ${camoufoxError.message}`);
      console.log('Falling back to enhanced Puppeteer with stealth plugin');
      
      // Enhanced Puppeteer fallback with stealth plugin
      const puppeteerExtra = require('puppeteer-extra');
      const StealthPlugin = require('puppeteer-extra-plugin-stealth');
      
      // Configure stealth plugin with specific DataDome countermeasures
      const stealth = StealthPlugin();
      stealth.enabledEvasions.delete('user-agent-override'); // We'll handle user agent manually
      puppeteerExtra.use(stealth);
      
      browser = await puppeteerExtra.launch({
        headless: this.config.scraping.headless === 'new' ? 'new' : this.config.scraping.headless,
        args: [
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
          '--disable-ipc-flooding-protection',
          '--disable-client-side-phishing-detection',
          '--disable-default-apps',
          '--disable-hang-monitor',
          '--disable-popup-blocking',
          '--disable-prompt-on-repost',
          '--disable-sync',
          '--metrics-recording-only',
          '--no-default-browser-check',
          '--safebrowsing-disable-auto-update',
          '--password-store=basic',
          '--use-mock-keychain',
          '--disable-extensions-except=/tmp/ublock',
          '--load-extension=/tmp/ublock'
        ],
        defaultViewport: null,
        executablePath: process.env.DOCKER_ENV ? '/usr/bin/chromium' : undefined,
        ignoreDefaultArgs: ['--enable-automation', '--enable-blink-features=AutomationControlled'],
        slowMo: Math.random() * 150 + 100
      });
    }
    
    this.browser = browser;
    this.usingCamoufox = usingCamoufox;

    this.page = await this.browser.newPage();
    await this.setupAntiDetection();
    
    console.log(`${this.siteConfig.name} scraper initialized successfully`);
  }

  /**
   * Setup enhanced anti-detection measures specifically for DataDome and advanced bot detection
   */
  async setupAntiDetection() {
    // Enhanced anti-detection script for DataDome bypass
    await this.page.evaluateOnNewDocument(() => {
      // Remove all automation indicators
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true
      });
      
      // Mock realistic navigator properties
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          const plugins = [
            { name: 'Chrome PDF Plugin', length: 1, description: 'Portable Document Format' },
            { name: 'Chrome PDF Viewer', length: 1, description: 'PDF Viewer' },
            { name: 'Native Client', length: 2, description: 'Native Client' },
            { name: 'Widevine Content Decryption Module', length: 1, description: 'Enables Widevine licenses' },
            { name: 'Shockwave Flash', length: 1, description: 'Shockwave Flash 32.0 r0' }
          ];
          return plugins;
        },
        configurable: true
      });
      
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
        configurable: true
      });

      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => Math.floor(Math.random() * 8) + 2, // 2-10 cores
        configurable: true
      });

      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => Math.pow(2, Math.floor(Math.random() * 3) + 2), // 4, 8, or 16 GB
        configurable: true
      });

      // Mock realistic chrome runtime
      window.chrome = {
        runtime: {
          onConnect: null,
          onMessage: null,
          PlatformOs: {
            MAC: 'mac',
            WIN: 'win',
            ANDROID: 'android',
            CROS: 'cros',
            LINUX: 'linux',
            OPENBSD: 'openbsd'
          }
        },
        app: {
          isInstalled: false,
          InstallState: {
            DISABLED: 'disabled',
            INSTALLED: 'installed',
            NOT_INSTALLED: 'not_installed'
          },
          RunningState: {
            CANNOT_RUN: 'cannot_run',
            READY_TO_RUN: 'ready_to_run',
            RUNNING: 'running'
          }
        }
      };

      // Remove automation-related variables
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_JSON;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Object;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Proxy;
      
      // Override automation-related properties
      Object.defineProperty(window, 'outerHeight', {
        get: () => window.innerHeight + Math.floor(Math.random() * 100) + 74,
      });
      Object.defineProperty(window, 'outerWidth', {
        get: () => window.innerWidth + Math.floor(Math.random() * 100) + 8,
      });

      // Mock realistic screen properties
      Object.defineProperty(screen, 'availTop', { get: () => 0 });
      Object.defineProperty(screen, 'availLeft', { get: () => 0 });
      Object.defineProperty(screen, 'availHeight', { get: () => screen.height - 40 });
      Object.defineProperty(screen, 'availWidth', { get: () => screen.width });

      // Add realistic timing variations
      const originalDate = Date;
      Date = class extends originalDate {
        constructor() {
          super();
          // Add small random offset to timing
          this.setTime(this.getTime() + Math.floor(Math.random() * 1000));
        }
        static now() {
          return originalDate.now() + Math.floor(Math.random() * 1000);
        }
      };

      // Mock realistic performance.now() behavior
      const originalPerformanceNow = performance.now.bind(performance);
      performance.now = () => {
        return originalPerformanceNow() + Math.random() * 0.1;
      };

      // Override toString methods to avoid detection
      HTMLElement.prototype.toString = function() {
        return '[object HTMLElement]';
      };
      
      HTMLDivElement.prototype.toString = function() {
        return '[object HTMLDivElement]';
      };
    });

    // Set realistic user agent with consistent properties
    const userAgentConfigs = [
      {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        platform: 'Win32',
        vendor: 'Google Inc.'
      },
      {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        platform: 'MacIntel',
        vendor: 'Google Inc.'
      },
      {
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        platform: 'Linux x86_64',
        vendor: 'Google Inc.'
      }
    ];
    
    const config = userAgentConfigs[Math.floor(Math.random() * userAgentConfigs.length)];
    await this.page.setUserAgent(config.userAgent);
    
    // Set consistent platform and vendor
    await this.page.evaluateOnNewDocument((platform, vendor) => {
      Object.defineProperty(navigator, 'platform', {
        get: () => platform,
        configurable: true
      });
      Object.defineProperty(navigator, 'vendor', {
        get: () => vendor,
        configurable: true
      });
    }, config.platform, config.vendor);
    
    // Set realistic viewport with some randomization
    const baseViewport = this.config.scraping.viewport;
    const viewport = {
      width: baseViewport.width + Math.floor(Math.random() * 100) - 50,
      height: baseViewport.height + Math.floor(Math.random() * 100) - 50,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      isLandscape: true
    };
    await this.page.setViewport(viewport);
    
    // Enhanced headers that mimic real browser behavior
    await this.page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': `"${config.platform.includes('Win') ? 'Windows' : config.platform.includes('Mac') ? 'macOS' : 'Linux'}"`
    });

    // Add request interception to modify requests and responses
    await this.page.setRequestInterception(true);
    this.page.on('request', (request) => {
      try {
        const resourceType = request.resourceType();
        const url = request.url();
        
        // Block tracking and analytics (like a real user with adblocker)
        if (resourceType === 'image' && (
            url.includes('google-analytics.com') ||
            url.includes('googletagmanager.com') ||
            url.includes('doubleclick.net') ||
            url.includes('facebook.com/tr') ||
            url.includes('analytics.') ||
            url.includes('tracking.')
          )) {
          request.abort().catch(err => {
            if (!err.message.includes('Request is already handled')) {
              console.warn('Request abort error:', err.message);
            }
          });
          return;
        }
        
        // Add realistic request headers
        const headers = request.headers();
        
        // Modify referer for subsequent requests
        if (url.includes('cargurus.com') && !headers['referer']) {
          headers['referer'] = 'https://www.google.com/';
        }
        
        // Continue with modified headers
        request.continue({ headers }).catch(err => {
          if (!err.message.includes('Request is already handled')) {
            console.warn('Request continue error:', err.message);
          }
        });
      } catch (error) {
        console.warn('Request handler error:', error.message);
        // Try to continue the request if it hasn't been handled
        if (!request.isInterceptResolutionHandled()) {
          request.continue().catch(err => {
            if (!err.message.includes('Request is already handled')) {
              console.warn('Fallback request continue error:', err.message);
            }
          });
        }
      }
    });
    
    // Add mouse movement simulation
    await this.page.evaluateOnNewDocument(() => {
      // Simulate realistic mouse movements and clicks
      let mouseX = Math.floor(Math.random() * window.innerWidth);
      let mouseY = Math.floor(Math.random() * window.innerHeight);
      
      const simulateMouseMove = () => {
        mouseX += (Math.random() - 0.5) * 10;
        mouseY += (Math.random() - 0.5) * 10;
        
        mouseX = Math.max(0, Math.min(window.innerWidth, mouseX));
        mouseY = Math.max(0, Math.min(window.innerHeight, mouseY));
        
        document.dispatchEvent(new MouseEvent('mousemove', {
          clientX: mouseX,
          clientY: mouseY,
          bubbles: true
        }));
      };
      
      // Simulate mouse movement every few seconds
      setInterval(simulateMouseMove, Math.random() * 5000 + 2000);
    });
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

module.exports = BaseScraper;
