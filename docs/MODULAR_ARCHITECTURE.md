# Modular Scraping Architecture

This document describes the new modular architecture that allows independent scraping implementations for different sites.

## Overview

The codebase has been refactored to use a modular approach where each site has its own independent scraper implementation. This prevents changes to one site's scraping logic from affecting other sites.

## Architecture Components

### 1. Base Scraper (`src/scrapers/BaseScraper.js`)

The `BaseScraper` class provides common functionality for all site scrapers:

- Browser initialization and management
- Anti-detection measures
- Human-like delays and interactions
- Common data transformations
- Filter application
- Abstract methods that must be implemented by specific scrapers

### 2. Site-Specific Scrapers

Each site has its own scraper implementation that extends `BaseScraper`:

- **CraigslistScraper** (`src/scrapers/CraigslistScraper.js`)
  - Handles button-based pagination
  - No authentication required
  - Supports detailed scraping by navigating to individual listings

- **FacebookMarketplaceScraper** (`src/scrapers/FacebookMarketplaceScraper.js`)
  - Handles Facebook authentication
  - Scroll-based pagination
  - Advanced anti-detection measures
  - Smart content extraction for dynamic Facebook elements

### 3. Scraper Factory (`src/scrapers/ScraperFactory.js`)

The factory pattern creates the appropriate scraper based on site configuration:

```javascript
const scraper = ScraperFactory.createScraper(config, siteConfig);
```

### 4. Modular Scraping Engine (`src/core/ModularScrapingEngine.js`)

Orchestrates the scraping process using the factory pattern:

- Creates appropriate scrapers
- Manages scraper lifecycle
- Handles change detection
- Provides validation and testing capabilities

## Adding a New Site Scraper

To add support for a new site, follow these steps:

### Step 1: Create the Scraper Class

Create a new file `src/scrapers/YourSiteScraper.js`:

```javascript
const BaseScraper = require('./BaseScraper');
const moment = require('moment');

class YourSiteScraper extends BaseScraper {
  constructor(config, siteConfig) {
    super(config, siteConfig);
  }

  async authenticate() {
    // Implement authentication if required
    // Return true if no authentication needed
    return true;
  }

  async navigateToSearch(url, searchKey) {
    // Navigate to the search URL
    await this.page.goto(url, { waitUntil: 'networkidle2' });
    
    // Wait for content to load
    await this.page.waitForSelector(
      this.siteConfig.waitConditions.initialLoad
    );
  }

  async handlePagination(paginationConfig) {
    // Implement pagination logic
    // This could be button-based, scroll-based, or URL-based
  }

  async extractData(searchConfig, maxListings = null) {
    // Extract data from the page
    // Return array of listing objects
    const results = [];
    
    // Your extraction logic here
    
    return results;
  }
}

module.exports = YourSiteScraper;
```

### Step 2: Register the Scraper

Add your scraper to the factory in `src/scrapers/ScraperFactory.js`:

```javascript
const YourSiteScraper = require('./YourSiteScraper');

// In the createScraper method:
case 'your-site-name':
  return new YourSiteScraper(config, siteConfig);

// In the getSupportedSites method:
return [
  'craigslist',
  'facebook-marketplace',
  'your-site-name'  // Add this
];
```

### Step 3: Create Site Configuration

Create a configuration file `sites/your-site.json`:

```json
{
  "name": "Your Site Name",
  "baseUrl": "https://yoursite.com",
  "searchConfig": {
    "search_key": {
      "url": "https://yoursite.com/search?q=example",
      "selectors": {
        "listingContainer": ".listing",
        "title": ".title",
        "price": ".price",
        "location": ".location"
      },
      "dataFields": [
        {
          "name": "title",
          "selector": ".title",
          "attribute": "text",
          "required": true
        },
        {
          "name": "price",
          "selector": ".price",
          "attribute": "text",
          "required": false,
          "transform": "extractPrice"
        },
        {
          "name": "url",
          "selector": "a",
          "attribute": "href",
          "required": true
        }
      ],
      "pagination": {
        "enabled": true,
        "type": "button", // or "scroll"
        "nextButtonSelector": ".next-page"
      }
    }
  },
  "waitConditions": {
    "initialLoad": ".listing",
    "timeout": 10000
  }
}
```

### Step 4: Update Search Configuration

Add your site to the search configurations in `config/searches.json`:

```json
{
  "searches": {
    "Your Search": {
      "sites": {
        "your_site": {
          "enabled": true,
          "searchUrl": "https://yoursite.com/search?q=your-query",
          "siteConfig": "your-site",
          "searchKey": "search_key"
        }
      }
    }
  }
}
```

## Configuration Structure

### Site Configuration Fields

- **name**: Display name for the site
- **baseUrl**: Base URL for the site
- **authentication**: Authentication configuration (if required)
- **searchConfig**: Object containing search configurations
- **waitConditions**: Conditions to wait for during page load
- **rateLimit**: Rate limiting configuration
- **antiDetection**: Anti-detection measures configuration

### Search Configuration Fields

- **url**: Search URL
- **selectors**: CSS selectors for different elements
- **dataFields**: Array of fields to extract
- **pagination**: Pagination configuration
- **detailedScraping**: Configuration for detailed data extraction
- **filters**: Filtering configuration

### Data Field Configuration

- **name**: Field name in the output
- **selector**: CSS selector
- **attribute**: Attribute to extract (text, href, src, etc.)
- **required**: Whether the field is required
- **transform**: Transformation to apply to the value
- **multiple**: Whether to extract multiple values

## Benefits of Modular Architecture

1. **Independence**: Changes to one site don't affect others
2. **Maintainability**: Each scraper is focused and easier to maintain
3. **Extensibility**: Easy to add new sites
4. **Testability**: Each scraper can be tested independently
5. **Flexibility**: Different sites can use different approaches
6. **Configuration-Driven**: Site behavior controlled by JSON configuration

## Testing Your Scraper

You can test your scraper implementation:

```javascript
const ModularScrapingEngine = require('./src/core/ModularScrapingEngine');

const engine = new ModularScrapingEngine(config);
const testResult = await engine.testSiteConfig(siteConfig, searchKey);

if (testResult.success) {
  console.log('Scraper is working correctly');
} else {
  console.error('Scraper test failed:', testResult.error);
}
```

## Best Practices

1. **Error Handling**: Always handle errors gracefully
2. **Rate Limiting**: Respect the site's rate limits
3. **Anti-Detection**: Use appropriate delays and human-like behavior
4. **Selectors**: Use stable selectors that are less likely to change
5. **Validation**: Validate extracted data before returning
6. **Logging**: Provide informative logging for debugging
7. **Configuration**: Make behavior configurable rather than hard-coded

## Troubleshooting

### Common Issues

1. **Selector Changes**: Sites change their HTML structure
   - Solution: Update selectors in site configuration

2. **Authentication Issues**: Login process changes
   - Solution: Update authentication logic in scraper

3. **Rate Limiting**: Getting blocked by the site
   - Solution: Increase delays, improve anti-detection

4. **Pagination Changes**: Pagination mechanism changes
   - Solution: Update pagination logic in scraper

### Debugging Tips

1. Use `page.screenshot()` to capture page state
2. Enable non-headless mode for visual debugging
3. Check browser console for JavaScript errors
4. Validate selectors in browser developer tools
5. Test with minimal data extraction first

## Migration from Old Architecture

The old monolithic `ScrapingEngine.js` has been replaced with the modular system. The `SearchManager` now uses `ModularScrapingEngine` which automatically selects the appropriate scraper based on site configuration.

Existing site configurations are compatible with the new system, but you may want to optimize them for better performance and reliability.
