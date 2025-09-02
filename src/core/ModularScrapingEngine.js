import ChangeDetector from './ChangeDetector.js';
import moment from 'moment';
import ScraperFactory from '../scrapers/ScraperFactory.js';

/**
 * Modular scraping engine that uses site-specific scrapers
 */
class ModularScrapingEngine {
  constructor(config) {
    this.config = config;
    this.changeDetector = new ChangeDetector(config);
  }

  /**
   * Scrape a URL using the appropriate site-specific scraper
   * @param {string} url - The URL to scrape
   * @param {Object} siteConfig - Site configuration
   * @param {string} searchKey - Search configuration key
   * @param {number} maxListingsPerSite - Maximum listings to extract
   * @returns {Promise<Array>} Array of scraped results
   */
  async scrapeUrl(url, siteConfig, searchKey, maxListingsPerSite = null) {
    console.log(`Starting modular scrape of: ${url}`);
    console.log(`Using scraper for: ${siteConfig.name}`);
    
    // Check if the site is supported
    if (!ScraperFactory.isSiteSupported(siteConfig.name)) {
      throw new Error(`Site "${siteConfig.name}" is not supported. Supported sites: ${ScraperFactory.getSupportedSites().join(', ')}`);
    }

    // Create the appropriate scraper
    const scraper = ScraperFactory.createScraper(this.config, siteConfig);
    
    try {
      // Initialize the scraper
      await scraper.initialize();
      
      // Perform the scraping
      const results = await scraper.scrape(url, searchKey, maxListingsPerSite);
      
      // Process results through change detector if enabled
      if (this.changeDetector.enabled) {
        const changeResults = await this.changeDetector.processListings(results, searchKey, siteConfig.searchConfig[searchKey]);
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

      console.log(`Modular scraping completed: ${results.length} results from ${siteConfig.name}`);
      return results;

    } catch (error) {
      console.error(`Error in modular scraping for ${siteConfig.name}:`, error.message);
      throw error;
    } finally {
      // Always close the scraper to free resources
      try {
        await scraper.close();
      } catch (closeError) {
        console.warn(`Error closing scraper for ${siteConfig.name}:`, closeError.message);
      }
    }
  }

  /**
   * Get information about supported sites and their capabilities
   * @returns {Object} Information about supported sites
   */
  getSupportedSitesInfo() {
    const supportedSites = ScraperFactory.getSupportedSites();
    
    return {
      count: supportedSites.length,
      sites: supportedSites,
      capabilities: {
        'craigslist': {
          authentication: false,
          pagination: 'button-based',
          detailedScraping: true,
          antiDetection: 'basic'
        },
        'facebook-marketplace': {
          authentication: true,
          pagination: 'scroll-based',
          detailedScraping: true,
          antiDetection: 'advanced'
        }
      }
    };
  }

  /**
   * Validate site configuration
   * @param {Object} siteConfig - Site configuration to validate
   * @returns {Object} Validation result
   */
  validateSiteConfig(siteConfig) {
    const errors = [];
    const warnings = [];

    // Check if site is supported
    if (!ScraperFactory.isSiteSupported(siteConfig.name)) {
      errors.push(`Site "${siteConfig.name}" is not supported`);
    }

    // Check required fields
    if (!siteConfig.name) {
      errors.push('Site name is required');
    }

    if (!siteConfig.baseUrl) {
      warnings.push('Base URL is not specified');
    }

    if (!siteConfig.searchConfig || Object.keys(siteConfig.searchConfig).length === 0) {
      errors.push('At least one search configuration is required');
    }

    // Validate search configurations
    if (siteConfig.searchConfig) {
      Object.entries(siteConfig.searchConfig).forEach(([searchKey, searchConfig]) => {
        if (!searchConfig.selectors) {
          errors.push(`Search config "${searchKey}" is missing selectors`);
        }

        if (!searchConfig.dataFields || searchConfig.dataFields.length === 0) {
          errors.push(`Search config "${searchKey}" is missing data fields`);
        }

        // Check for required data fields
        const hasTitle = searchConfig.dataFields?.some(field => field.name === 'title');
        const hasUrl = searchConfig.dataFields?.some(field => field.name === 'url');

        if (!hasTitle) {
          warnings.push(`Search config "${searchKey}" should have a title field`);
        }

        if (!hasUrl) {
          warnings.push(`Search config "${searchKey}" should have a url field`);
        }
      });
    }

    // Site-specific validations
    const siteName = siteConfig.name.toLowerCase().replace(/\s+/g, '-');
    
    if (siteName === 'facebook-marketplace') {
      if (siteConfig.authentication?.required && !siteConfig.authentication.credentials) {
        errors.push('Facebook Marketplace requires authentication credentials');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Test a site configuration by attempting a minimal scrape
   * @param {Object} siteConfig - Site configuration to test
   * @param {string} searchKey - Search key to test
   * @returns {Promise<Object>} Test result
   */
  async testSiteConfig(siteConfig, searchKey) {
    console.log(`Testing site configuration for ${siteConfig.name}...`);
    
    const validation = this.validateSiteConfig(siteConfig);
    if (!validation.isValid) {
      return {
        success: false,
        error: `Configuration validation failed: ${validation.errors.join(', ')}`,
        validation
      };
    }

    try {
      const scraper = ScraperFactory.createScraper(this.config, siteConfig);
      
      await scraper.initialize();
      
      // Test basic navigation
      const searchConfig = siteConfig.searchConfig[searchKey];
      if (!searchConfig) {
        throw new Error(`Search configuration "${searchKey}" not found`);
      }

      // For testing, we'll just try to navigate and check if the page loads
      await scraper.navigateToSearch(searchConfig.url || 'https://example.com', searchKey);
      
      await scraper.close();
      
      return {
        success: true,
        message: `Site configuration for ${siteConfig.name} is working correctly`,
        validation
      };

    } catch (error) {
      return {
        success: false,
        error: `Test failed: ${error.message}`,
        validation
      };
    }
  }
}

export default ModularScrapingEngine;
