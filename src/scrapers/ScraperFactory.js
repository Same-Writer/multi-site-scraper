const CraigslistScraper = require('./CraigslistScraper');
const FacebookMarketplaceScraper = require('./FacebookMarketplaceScraper');
const CarGurusScraper = require('./CarGurusScraper');

/**
 * Factory class for creating site-specific scrapers
 */
class ScraperFactory {
  /**
   * Create a scraper instance based on the site configuration
   * @param {Object} config - Global configuration
   * @param {Object} siteConfig - Site-specific configuration
   * @returns {BaseScraper} Scraper instance
   */
  static createScraper(config, siteConfig) {
    const siteName = siteConfig.name.toLowerCase().replace(/\s+/g, '-');
    
    switch (siteName) {
      case 'craigslist':
        return new CraigslistScraper(config, siteConfig);
      
      case 'facebook-marketplace':
        return new FacebookMarketplaceScraper(config, siteConfig);
      
      case 'cargurus':
        return new CarGurusScraper(config, siteConfig);
      
      default:
        throw new Error(`No scraper implementation found for site: ${siteConfig.name}`);
    }
  }

  /**
   * Get list of supported sites
   * @returns {Array<string>} Array of supported site names
   */
  static getSupportedSites() {
    return [
      'craigslist',
      'facebook-marketplace',
      'cargurus'
    ];
  }

  /**
   * Check if a site is supported
   * @param {string} siteName - Name of the site
   * @returns {boolean} True if supported
   */
  static isSiteSupported(siteName) {
    const normalizedName = siteName.toLowerCase().replace(/\s+/g, '-');
    return this.getSupportedSites().includes(normalizedName);
  }

  /**
   * Register a new scraper type (for future extensibility)
   * @param {string} siteName - Name of the site
   * @param {Class} scraperClass - Scraper class constructor
   */
  static registerScraper(siteName, scraperClass) {
    // This could be extended to support dynamic scraper registration
    // For now, scrapers are statically defined above
    console.log(`Scraper registration for ${siteName} would be implemented here`);
  }
}

module.exports = ScraperFactory;
