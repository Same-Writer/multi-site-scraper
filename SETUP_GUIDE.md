# Workarea UI Scraper - Setup Guide

## What You've Built

A complete, modular web scraping framework with the following components:

### Core Architecture
- **ScrapingEngine.js**: UI-based scraping using Puppeteer
- **CsvExporter.js**: Data export with duplicate detection
- **EmailNotifier.js**: Notification system (placeholder implementation)
- **Configuration System**: JSON-based site and search configurations

### Current Implementation
- BMW Z3 scraping from Craigslist SF Bay Area
- Extracts: title, price, location, date, URL, image
- Filters by price range and keywords
- Exports to timestamped CSV files
- Console-based notifications

## File Structure Created

```
workarea-ui-scraper/
├── package.json              # Dependencies and scripts
├── README.md                 # Complete documentation
├── SETUP_GUIDE.md           # This file
├── test-framework.js        # Demo script (works without Node.js)
├── config/
│   └── default.json         # Main configuration
├── sites/
│   └── craigslist.json      # Craigslist-specific config
└── src/
    ├── index.js             # Main application
    └── core/
        ├── ScrapingEngine.js # Browser automation
        ├── CsvExporter.js   # CSV handling
        └── EmailNotifier.js # Email system
```

## Next Steps

### 1. Install Node.js
- Download from https://nodejs.org/
- Choose LTS version (recommended)
- Verify: `node --version` and `npm --version`

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the Framework
```bash
# Basic run
npm start

# Development mode (auto-restart)
npm run dev

# Test the framework structure
node test-framework.js
```

## Key Features Implemented

### ✅ Modular Design
- Easy to add new sites by creating JSON configs
- Pluggable components for different data sources
- Configurable selectors and transformations

### ✅ UI-Based Scraping
- Uses Puppeteer for JavaScript rendering
- Handles dynamic content and SPAs
- Configurable browser settings

### ✅ Data Processing
- Automatic price extraction and formatting
- Location cleaning and normalization
- Date parsing and standardization
- URL conversion to absolute paths

### ✅ Export & Notifications
- CSV export with custom headers
- Duplicate detection by URL
- Timestamped filenames
- Email notification framework (placeholder)

### ✅ Configuration System
- Site-specific configurations
- Search-specific parameters
- Filter definitions (price, keywords)
- Rate limiting and pagination settings

## Customization Examples

### Add a New Site
1. Create `sites/newsite.json`
2. Define selectors and data fields
3. Configure filters and pagination
4. Run: `scraper.scrapeSearch('newsite', 'search_key')`

### Modify BMW Z3 Search
Edit `sites/craigslist.json`:
- Change price range in `filters.priceRange`
- Add/remove keywords in `filters.keywords`
- Modify selectors for different data

### Enable Email Notifications
Edit `config/default.json`:
- Set `email.enabled: true`
- Configure SMTP settings
- Add recipient addresses

## Framework Benefits

1. **Maintainable**: Clear separation of concerns
2. **Extensible**: Easy to add new sites and searches
3. **Robust**: Error handling and retry logic
4. **Efficient**: Duplicate detection and rate limiting
5. **User-Friendly**: Console output and CSV export

## Production Considerations

- Add logging to files
- Implement database storage
- Add proxy rotation
- Create scheduling system
- Build web dashboard
- Add more sophisticated filters

The framework is ready for immediate use once Node.js is installed!
