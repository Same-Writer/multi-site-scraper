const BaseScraper = require('./BaseScraper');
const moment = require('moment');

/**
 * Mock scraper for testing notification logic
 */
class MockScraper extends BaseScraper {
  constructor(config, siteConfig) {
    super(config, siteConfig);
  }

  /**
   * Mock authentication - no authentication required
   */
  async authenticate() {
    console.log('Mock scraper: No authentication required');
    return true;
  }

  /**
   * Mock navigation to search URL
   */
  async navigateToSearch(url, searchKey) {
    console.log(`Mock scraper: Navigating to search URL: ${url}`);
    
    // Simulate page load delay
    await this.humanDelay(1000, 2000);
    
    console.log('Mock scraper: Search page loaded successfully');
 }

  /**
   * Mock pagination handling
   */
  async handlePagination(paginationConfig) {
    if (!paginationConfig.enabled) return;

    console.log('Mock scraper: Handling pagination...');
    
    const maxPages = paginationConfig.maxPages || 3;
    let currentPage = 1;
    
    while (currentPage < maxPages) {
      console.log(`Mock scraper: Processing page ${currentPage + 1}...`);
      
      // Simulate pagination delay
      await this.humanDelay(1000, 2000);
      
      currentPage++;
    }
    
    console.log(`Mock scraper: Pagination completed, processed ${currentPage} pages`);
  }

  /**
   * Mock data extraction that generates test data for notification testing
   */
  async extractData(searchConfig, maxListings = null) {
    const results = [];
    
    try {
      console.log('Mock scraper: Extracting mock data for testing...');
      
      // Generate mock listings for testing notifications
      const mockListings = this.generateMockListings(searchConfig, maxListings);
      
      // Process each mock listing
      for (let i = 0; i < mockListings.length; i++) {
        const item = mockListings[i];
        
        // Add metadata
        item.scrapedAt = moment().toISOString();
        item.source = this.siteConfig.name.toLowerCase().replace(/\s+/g, '-');

        // Apply filters
        if (this.passesFilters(item, searchConfig.filters)) {
          results.push(item);
          console.log(`Mock scraper: Generated listing ${results.length}: "${item.title}" - $${item.price}`);
        } else {
          console.log(`Mock scraper: Listing ${i + 1} filtered out: "${item.title}"`);
        }
        
        // Add delay between processing listings
        if (i > 0 && i % 5 === 0) {
          await this.humanDelay(200, 500);
        }
      }

    } catch (error) {
      console.error('Mock scraper: Error extracting data:', error.message);
      throw error;
    }

    console.log(`Mock scraper: Generated ${results.length} mock listings for testing`);
    return results;
  }

  /**
   * Generate mock listings with various characteristics for testing notifications
   */
  generateMockListings(searchConfig, maxListings = null) {
    const listings = [];
    const count = maxListings || 10;
    
    // Sample data for generating realistic mock listings
    const titles = [
      "2023 BMW Z3 Manual Transmission",
      "BMW Z3 Convertible - Low Miles",
      "BMW Z3 M Coupe - Rare Find",
      "2020 BMW Z3 Sports Package",
      "BMW Z3 - Garage Kept Condition",
      "Modified BMW Z3 Track Car",
      "BMW Z3 - Recent Service History",
      "BMW Z3 - Manual Transmission",
      "2019 BMW Z3 - Excellent Condition",
      "BMW Z3 - Clean Title"
    ];
    
    const locations = [
      "San Francisco, CA",
      "Mountain View, CA",
      "Palo Alto, CA",
      "Berkeley, CA",
      "San Jose, CA",
      "Oakland, CA",
      "Fremont, CA",
      "Hayward, CA",
      "Sunnyvale, CA",
      "Cupertino, CA"
    ];
    
    // Generate listings with different characteristics
    for (let i = 0; i < count; i++) {
      // Create some listings with price drops for testing
      const isPriceDrop = i % 3 === 0;
      const isKeywordMatch = i % 4 === 0;
      const isNew = i % 2 === 0;
      
      // For price drop listings, we'll simulate a price change by setting a higher initial price
      // The ChangeDetector will detect this as a price drop when it compares to previous runs
      const basePrice = 15000 + (i * 1000);
      const currentPrice = isPriceDrop ? basePrice : basePrice;
      // Note: We'll simulate the price drop in the ChangeDetector by having it detect
      // a difference between the current price and a previously stored higher price
      
      const listing = {
        title: titles[i % titles.length] + (isKeywordMatch ? " - M Coupe" : ""),
        price: currentPrice,
        location: locations[i % locations.length],
        date: moment().subtract(i, 'days').format('YYYY-MM-DD'),
        url: `https://mocksite.com/listing/${i + 1}`,
        imageUrl: `https://mocksite.com/images/listing${i + 1}.jpg`,
        isNew: isNew,
        hasPriceDrop: isPriceDrop, // This is just for our test script to identify which listings should trigger price drops
        isKeywordMatch: isKeywordMatch
      };
      
      listings.push(listing);
    }
    
    return listings;
  }
}

module.exports = MockScraper;
