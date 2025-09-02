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
      '--disable-renderer-backgrounding'
    ];

    // Add proxy settings if configured and valid
    let proxySettings = {};
    if (this.config.scraping.proxy && this.config.scraping.proxy.enabled !== false) {
      const proxy = this.getProxyForSite(this.siteConfig.name);
      if (proxy && proxy.server && proxy.server !== "http://proxy.example.com:8080") {
        puppeteerArgs.push(`--proxy-server=${proxy.server}`);
        proxySettings = {
          username: proxy.username,
          password: proxy.password
        };
        console.log(`Using proxy server: ${proxy.server}`);
      } else {
        console.log("Proxy configuration found but not valid, proceeding without proxy");
      }
    } else {
      console.log("Proxy not enabled or not configured, proceeding without proxy");
    }

    this.browser = await puppeteer.launch({
      headless: this.config.scraping.headless,
      args: puppeteerArgs,
      defaultViewport: null,
      executablePath: process.env.DOCKER_ENV ? '/usr/bin/chromium' : undefined,
      ignoreDefaultArgs: ['--enable-automation'],
      slowMo: Math.random() * 100 + 50
    });

    this.page = await this.browser.newPage();
    
    // Authenticate proxy if needed
    if (proxySettings.username && proxySettings.password) {
      await this.page.authenticate({
        username: proxySettings.username,
        password: proxySettings.password
      });
    }
    
    await this.setupAntiDetection();
    
    console.log(`${this.siteConfig.name} scraper initialized successfully`);
  }

  /**
   * Get proxy configuration for a specific site
   * @param {string} siteName - Name of the site
   * @returns {Object|null} Proxy configuration or null if not configured
   */
  getProxyForSite(siteName) {
    if (!this.config.scraping.proxy || !this.config.scraping.proxy.providers) {
      return null;
    }

    // Get site-specific proxy settings if they exist
    if (this.config.scraping.proxy.siteSettings && this.config.scraping.proxy.siteSettings[siteName]) {
      const siteProxySettings = this.config.scraping.proxy.siteSettings[siteName];
      if (siteProxySettings.provider) {
        // Use specific provider for this site
        const provider = this.config.scraping.proxy.providers[siteProxySettings.provider];
        if (provider) {
          return {
            server: provider.server,
            username: provider.username,
            password: provider.password
          };
        }
      }
    }

    // Use default provider if configured
    if (this.config.scraping.proxy.defaultProvider) {
      const provider = this.config.scraping.proxy.providers[this.config.scraping.proxy.defaultProvider];
      if (provider) {
        return {
          server: provider.server,
          username: provider.username,
          password: provider.password
        };
      }
    }

    // If no specific provider, use rotating proxy if enabled
    if (this.config.scraping.proxy.rotate && this.config.scraping.proxy.providers) {
      const providers = Object.values(this.config.scraping.proxy.providers);
      if (providers.length > 0) {
        // Simple round-robin rotation
        const proxyIndex = Date.now() % providers.length;
        const provider = providers[proxyIndex];
        return {
          server: provider.server,
          username: provider.username,
          password: provider.password
        };
      }
    }

    return null;
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
      
      // Set realistic plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          {
            0: { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format' },
            1: { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
            2: { type: 'application/x-nacl', suffixes: '', description: 'Native Client Executable' },
            3: { type: 'application/x-pnacl', suffixes: '', description: 'Portable Native Client Executable' },
            length: 4,
            item: function (index) { return this[index]; },
            namedItem: function (name) { return this[name]; },
            refresh: function () {}
          }
        ],
      });
      
      // Set realistic languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      // Set realistic chrome object
      window.chrome = {
        runtime: {},
        loadTimes: () => {},
        csi: () => {},
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
        },
        webstore: {
          onInstallStageChanged: {},
          onDownloadProgress: {}
        }
      };

      // Remove Puppeteer-specific properties
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
      
      // Hide Puppeteer-specific properties
      if (window.outerWidth && window.outerHeight) {
        // Make sure window dimensions look realistic
        window.outerWidth = window.innerWidth;
        window.outerHeight = window.innerHeight;
      }
      
      // Mock missing browser features that Craigslist is checking for
      if (!window.speechSynthesis) {
        window.speechSynthesis = {
          speak: () => {},
          cancel: () => {},
          pause: () => {},
          resume: () => {},
          getVoices: () => [],
          pending: false,
          speaking: false,
          paused: false
        };
      }
      
      if (!window.indexedDB) {
        window.indexedDB = {
          open: () => {},
          deleteDatabase: () => {},
          cmp: () => {}
        };
      }
    });

    // Advanced fingerprinting protection
    await this.page.evaluateOnNewDocument(() => {
      // Canvas fingerprinting protection
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      const originalGetImageData = context.getImageData;
      
      context.getImageData = function() {
        // Add slight noise to image data to prevent fingerprinting
        const imageData = originalGetImageData.apply(this, arguments);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          // Add random noise to RGB values
          data[i] = Math.min(255, data[i] + Math.floor(Math.random() * 3) - 1); // R
          data[i + 1] = Math.min(255, data[i + 1] + Math.floor(Math.random() * 3) - 1); // G
          data[i + 2] = Math.min(255, data[i + 2] + Math.floor(Math.random() * 3) - 1); // B
        }
        return imageData;
      };

      // WebGL fingerprinting protection
      if (window.WebGLRenderingContext) {
        const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
          // Return randomized values for fingerprintable parameters
          if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
            const vendors = ['Intel Inc.', 'NVIDIA Corporation', 'ATI Technologies Inc.'];
            return vendors[Math.floor(Math.random() * vendors.length)];
          }
          if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
            const renderers = [
              'Intel Iris OpenGL Engine',
              'NVIDIA GeForce GTX 1080 OpenGL Engine',
              'AMD Radeon Pro 560 OpenGL Engine'
            ];
            return renderers[Math.floor(Math.random() * renderers.length)];
          }
          return originalGetParameter.apply(this, arguments);
        };
      }

      // Audio fingerprinting protection
      if (window.OfflineAudioContext) {
        const originalGetChannelData = AudioBuffer.prototype.getChannelData;
        AudioBuffer.prototype.getChannelData = function() {
          const channelData = originalGetChannelData.apply(this, arguments);
          // Add slight noise to audio data
          for (let i = 0; i < channelData.length; i++) {
            channelData[i] += Math.random() * 0.0001 - 0.00005;
          }
          return channelData;
        };
      }

      // Hardware concurrency spoofing
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => {
          // Return a random value between 2 and 16 (common CPU core counts)
          const cores = [2, 4, 6, 8, 12, 16];
          return cores[Math.floor(Math.random() * cores.length)];
        }
      });

      // Device memory spoofing
      if ('deviceMemory' in navigator) {
        Object.defineProperty(navigator, 'deviceMemory', {
          get: () => {
            // Return a random value between 2 and 16 GB (common memory amounts)
            const memory = [2, 4, 6, 8, 12, 16];
            return memory[Math.floor(Math.random() * memory.length)];
          }
        });
      }

      // Timezone spoofing
      const originalDate = window.Date;
      const timezoneOffset = new originalDate().getTimezoneOffset();
      window.Date = function() {
        if (arguments.length === 0) {
          const date = new originalDate();
          // Adjust timezone to appear as if from a different region
          // This is a simplified approach - in practice, you might want to match the proxy location
          return new originalDate(date.getTime() - (timezoneOffset * 60000));
        }
        return new (originalDate.bind.apply(originalDate, [null].concat(Array.prototype.slice.call(arguments))))();
      };
      window.Date.prototype = originalDate.prototype;
    });

    // Set realistic user agent
    const userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    
    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    await this.page.setUserAgent(randomUserAgent);
    
    // Set realistic viewport with slight randomization
    const viewport = {
      width: this.config.scraping.viewport.width + Math.floor(Math.random() * 20) - 10,
      height: this.config.scraping.viewport.height + Math.floor(Math.random() * 20) - 10
    };
    await this.page.setViewport(viewport);
    
    // Set realistic HTTP headers
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
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
