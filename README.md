# Workarea UI Scraper Framework

A modular, Docker-based web scraping framework with unified search-centric configuration, flexible selector handling, and CSV export capabilities. Built for extensibility and resilience against website structure changes.

## Features

- **Modular Architecture**: Factory pattern with site-specific scrapers extending a common base class
- **Unified Search Configuration**: Single source of truth (`config/searches.json`) for all searches with multi-site support
- **Flexible Selector System**: Gracefully handles HTML structure changes with multi-selector fallback
- **Docker-First Design**: Portable deployment with consistent execution across environments
- **CSV Export**: Automatic data export with duplicate detection and change tracking
- **Email Notifications**: Configurable email alerts for new matches and price changes
- **Advanced Anti-Detection**: User agent rotation, random delays, stealth headers, human-like interactions
- **Command-Line Interface**: Run specific searches or all enabled searches
- **Change Detection**: Historical tracking for trend analysis and notifications

## Current Implementation Status

**Fully Operational:**
- **Craigslist Scraper**: Production-ready with flexible selector handling (updated August 2025)
- **BMW Z3 Search**: Enabled, high priority, hourly frequency
- **Mazda Miata Search**: Enabled, medium priority, daily frequency
- **Porsche 911 Search**: Configured but disabled
- **CSV Export**: With duplicate detection and timestamped files
- **Change Detection**: Tracks price changes and listing updates
- **Docker Deployment**: Complete containerization with docker-compose

**Partially Implemented:**
- **Facebook Marketplace Scraper**: Basic implementation, needs refinement
- **Email Notifications**: Placeholder implementation with console output
- **Detailed Scraping**: Framework exists, disabled by default

## Architecture Overview

### Modular Design Pattern

The system uses a **factory pattern** with site-specific scrapers:

```
SearchManager → ModularScrapingEngine → ScraperFactory → Site-Specific Scrapers
     ↓                    ↓                    ↓              ↓
Unified Config    Browser Management    Dynamic Creation    CraigslistScraper
Multi-Site        Anti-Detection       Scraper Registry    FacebookScraper
Orchestration     Validation           Site Mapping        [Future Scrapers]
```

### Core Components

1. **SearchManager.js**: Primary orchestration class
   - Loads unified search configurations
   - Coordinates multi-site scraping for each search
   - Applies search-level filters and transformations
   - Manages CSV export and notification processing

2. **ModularScrapingEngine.js**: Core scraping orchestrator
   - Uses factory pattern to instantiate appropriate scrapers
   - Manages browser lifecycle and anti-detection measures
   - Provides validation and testing capabilities

3. **Site-Specific Scrapers**: Independent implementations
   - **CraigslistScraper.js**: Button-based pagination, flexible selectors
   - **FacebookMarketplaceScraper.js**: Scroll-based pagination, authentication
   - **BaseScraper.js**: Abstract base class with common functionality

4. **ScraperFactory.js**: Dynamic scraper instantiation
   - Maps site names to scraper classes
   - Provides registry of supported sites

## Project Structure

```
workarea-ui-scraper/
├── config/
│   ├── default.json          # System configuration
│   └── searches.json         # Unified search definitions (SOURCE OF TRUTH)
├── sites/
│   ├── craigslist.json       # Craigslist scraper configuration
│   └── facebook-marketplace.json # Facebook Marketplace configuration
├── src/
│   ├── core/                 # Core system components
│   │   ├── SearchManager.js  # Main orchestration
│   │   ├── ModularScrapingEngine.js # Scraping coordination
│   │   ├── CsvExporter.js    # Data export
│   │   ├── EmailNotifier.js  # Notifications
│   │   └── ChangeDetector.js # Change tracking
│   ├── scrapers/             # Site-specific scrapers
│   │   ├── BaseScraper.js    # Abstract base class
│   │   ├── CraigslistScraper.js
│   │   ├── FacebookMarketplaceScraper.js
│   │   └── ScraperFactory.js # Scraper instantiation
│   └── index.js              # CLI entry point
├── output/                   # Generated CSV files
├── logs/                     # Application logs
├── Dockerfile                # Docker configuration
├── docker-compose.yml        # Docker Compose setup
└── README_AGENT.md           # AI Agent documentation
```

## Installation & Setup

### Docker (Recommended)

The framework is designed for Docker-first deployment with all dependencies included.

#### Prerequisites
- Docker Desktop installed on your system
- Download from [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)

#### Initial Setup

1. **Clone the repository:**
```bash
git clone <your-repo-url>
cd workarea-ui-scraper
```

2. **Set up configuration files with your credentials:**

   **For Email Notifications (Optional):**
   ```bash
   cp config/default.example.json config/default.json
   ```
   Then edit `config/default.json` and replace:
   - `YOUR_EMAIL@gmail.com` with your actual Gmail address
   - `YOUR_APP_PASSWORD` with your Gmail App Password (see [Gmail App Password Setup](#gmail-app-password-setup))

   **For Facebook Marketplace (Optional):**
   ```bash
   cp sites/facebook-marketplace.example.json sites/facebook-marketplace.json
   ```
   Then edit `sites/facebook-marketplace.json` and replace:
   - `YOUR_FACEBOOK_EMAIL@gmail.com` with your Facebook login email
   - `YOUR_FACEBOOK_PASSWORD` with your Facebook password

   **⚠️ SECURITY NOTE:** The actual credential files (`config/default.json` and `sites/facebook-marketplace.json`) are automatically ignored by git and will never be committed to your repository.

3. **Build the Docker image:**
```bash
docker-compose build
```

4. **Run all enabled searches:**
```bash
docker-compose run --rm scraper node src/index.js
```

5. **Run a specific search:**
```bash
docker-compose run --rm scraper node src/index.js "BMW Z3"
```

6. **Run a specific search on a specific site:**
```bash
docker-compose run --rm scraper node src/index.js "BMW Z3" craigslist
```

7. **Check results:**
```bash
ls -la output/
```

#### Gmail App Password Setup

To use email notifications, you'll need to set up a Gmail App Password:

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate an App Password:**
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Navigate to Security → 2-Step Verification → App passwords
   - Select "Mail" and your device
   - Copy the generated 16-character password
3. **Use the App Password** in your `config/default.json` file (not your regular Gmail password)

#### Configuration Security

- **✅ Safe to commit:** `*.example.json` files (contain no real credentials)
- **❌ Never commit:** `config/default.json` and `sites/facebook-marketplace.json` (contain your actual credentials)
- **🔒 Protected by .gitignore:** Your credential files are automatically excluded from git commits

#### Running Without Credentials

- **Craigslist only:** Works without any credential setup
- **Email notifications:** Set `"enabled": false` in your config to disable
- **Facebook Marketplace:** Set `"enabled": false` for Facebook sites in your search configurations

### Local Installation (Alternative)

#### Prerequisites

1. Install Node.js (version 18 or higher):
   - Download from [https://nodejs.org/](https://nodejs.org/)

2. Install dependencies:
```bash
npm install
```

3. Run locally:
```bash
node src/index.js "BMW Z3"
```

## Usage

### Command Line Interface

#### Show Available Searches
```bash
docker-compose run --rm scraper node src/index.js
```

#### Run All Enabled Searches
```bash
docker-compose run --rm scraper node src/index.js
```

#### Run a Specific Search
```bash
docker-compose run --rm scraper node src/index.js "BMW Z3"
docker-compose run --rm scraper node src/index.js "Mazda Miata"
```

#### Run a Search on a Specific Site
```bash
docker-compose run --rm scraper node src/index.js "BMW Z3" craigslist
```

### Programmatic Usage

```javascript
const SearchManager = require('./src/core/SearchManager');

const searchManager = new SearchManager();
await searchManager.loadConfigurations();

// Run a specific search
const result = await searchManager.runSearch('BMW Z3');
console.log(`Found ${result.totalResults} results`);

// Run all enabled searches
const results = await searchManager.runAllEnabledSearches();
```

## Configuration

### Unified Search Configuration (`config/searches.json`)

This is the **single source of truth** for all searches:

```json
{
  "searches": {
    "BMW Z3": {
      "description": "BMW Z3 roadster and coupe listings",
      "scrapeSettings": {
        "runFrequency": "hourly",
        "maxListingsPerSite": 10,
        "enabled": true,
        "priority": "high"
      },
      "filters": {
        "priceRange": { "min": 1000, "max": 50000 },
        "keywords": {
          "include": ["z3", "bmw"],
          "exclude": ["parts", "salvage", "junk", "scrap"]
        },
        "excludeWanted": true
      },
      "notifications": {
        "enabled": true,
        "triggers": {
          "newListing": true,
          "priceDropPercent": 10,
          "keywordMatch": ["m coupe", "manual", "low miles"]
        },
        "emailSettings": {
          "to": ["user@example.com"],
          "subject": "BMW Z3 Alert: {{trigger}} - {{title}}"
        }
      },
      "sites": {
        "craigslist": {
          "enabled": true,
          "searchUrl": "https://sfbay.craigslist.org/search/cta?postal=94040&query=bmw%20z3",
          "siteConfig": "craigslist",
          "searchKey": "bmw_z3"
        }
      }
    }
  }
}
```

### Site Configuration (`sites/*.json`)

Each site has its own configuration defining selectors, data fields, and scraping behavior:

```json
{
  "name": "Craigslist",
  "searchConfig": {
    "bmw_z3": {
      "selectors": {
        "listingContainer": ".cl-search-result",
        "title": "a",
        "price": ".price",
        "location": ".location"
      },
      "dataFields": [
        {
          "name": "title",
          "selector": "a",
          "attribute": "text",
          "required": true
        }
      ]
    }
  },
  "waitConditions": {
    "initialLoad": ".result-row, .cl-search-result, .gallery .result-row, li.result-row",
    "timeout": 15000
  }
}
```

## Adding New Searches

To add a new search, update `config/searches.json`:

```json
{
  "searches": {
    "Honda Civic": {
      "description": "Honda Civic listings",
      "scrapeSettings": {
        "runFrequency": "daily",
        "maxListingsPerSite": 20,
        "enabled": true,
        "priority": "medium"
      },
      "filters": {
        "priceRange": { "min": 8000, "max": 30000 },
        "keywords": {
          "include": ["civic", "honda"],
          "exclude": ["parts", "salvage", "accident"]
        }
      },
      "sites": {
        "craigslist": {
          "enabled": true,
          "searchUrl": "https://sfbay.craigslist.org/search/cta?query=honda%20civic",
          "siteConfig": "craigslist",
          "searchKey": "honda_civic"
        }
      }
    }
  }
}
```

Then add the search configuration to `sites/craigslist.json`:

```json
{
  "searchConfig": {
    "honda_civic": {
      "selectors": {
        "listingContainer": ".cl-search-result",
        "title": "a",
        "price": ".price"
      },
      "dataFields": [
        {
          "name": "title",
          "selector": "a",
          "attribute": "text",
          "required": true
        }
      ]
    }
  }
}
```

## Recent Improvements (August 2025)

### Flexible Selector System
- **Problem Solved**: Craigslist changed HTML structure, breaking scraper
- **Solution**: Multi-selector fallback system that tries multiple possible selectors
- **Result**: Scraper now gracefully handles website structure changes

### Enhanced Configuration Loading
- Fixed dynamic search configuration to use correct search keys
- Improved error reporting and debugging capabilities
- Better validation of site configurations

### Resilience Improvements
- Scrapers now handle HTML structure changes automatically
- Enhanced debugging information for selector failures
- Improved anti-detection measures

## Debugging and Troubleshooting

### Debug Mode

Enable debug logging:
```bash
docker-compose run --rm scraper sh -c "DEBUG=true node src/index.js 'BMW Z3'"
```

### Common Issues

#### 1. No Results Found
- **Cause**: Website structure changed or selectors outdated
- **Solution**: Check `sites/*.json` for updated selectors
- **Debug**: Enable debug mode to see selector matching details

#### 2. Container Issues
- **Cause**: Code changes not reflected in container
- **Solution**: Always rebuild after code changes:
```bash
docker-compose build
docker-compose run --rm scraper node src/index.js "BMW Z3"
```

#### 3. Selector Failures
- **Cause**: Website HTML structure changed
- **Solution**: The flexible selector system should handle this automatically
- **Manual Fix**: Update selectors in `sites/*.json` if needed

### Logs and Output

- **CSV Files**: Generated in `output/` directory with timestamps
- **Console Output**: Shows scraping progress and results
- **Debug Information**: Available with `DEBUG=true` environment variable

## Working with AI Agents

This project is designed to be extended and maintained by AI agents. See `README_AGENT.md` for detailed architectural documentation and development guidelines.

### For Developers: Instructing AI Agents

#### Getting Started with an AI Agent

Use this prompt to have an AI agent familiarize themselves with the project:

```
Hello, I'm going to get started making changes to the code in workarea-ui-scraper. Can you please read over the README_AGENT.md document to add the context of this project to your current context window?
```

This will ensure the AI agent understands:
- The current architecture and design patterns
- Recent changes and improvements
- Critical development workflows (especially Docker usage)
- Extension points for adding new features

#### Having an AI Agent Update Documentation

When an AI agent makes significant changes, use this prompt to ensure proper documentation:

```
Great! I'm done making changes for now. Please do the following in the README_AGENT.md file:
- Make appropriate architectural updates, if not already documented by previous execution
- Please document any corrections that I made to your operation that may affect decision making of subsequent agents
- Please give me a few bullet points summarizing what you updated in README_AGENT.md
```

This ensures:
- Architecture documentation stays current
- Critical Docker workflow instructions are preserved
- Future AI agents have proper context for development

#### Key Points for AI Agent Instructions

1. **Always start with README_AGENT.md**: This document contains critical context about the project's architecture, recent changes, and development patterns.

2. **Docker-First Development**: AI agents must understand that:
   - Code changes require container rebuilds (`docker-compose build`)
   - Testing should always use Docker commands
   - Failing to rebuild leads to testing outdated code

3. **Documentation Updates**: After making changes, AI agents should:
   - Update the "Current Architecture Overview" section
   - Document new components and their purpose
   - Explain architectural decisions and rationale
   - Preserve the modular, extensible nature of the system

4. **Preserve Project Intent**: The core vision and architectural principles should remain consistent across AI agent sessions.

### AI Agent Development Workflow

1. **Context Loading**: Read `README_AGENT.md` for full project context
2. **Docker Testing**: Use `docker-compose run --rm scraper` for all testing
3. **Code Changes**: Make targeted improvements following existing patterns
4. **Container Rebuild**: Always `docker-compose build` after code changes
5. **Verification**: Test changes with Docker to ensure they work
6. **Documentation**: Update `README_AGENT.md` with architectural changes

## Data Output

### CSV Export
- **Location**: `output/` directory
- **Format**: Timestamped filenames (e.g., `bmw_z3_craigslist_2025-08-25T04:44:55.404Z.csv`)
- **Features**: Duplicate detection, change tracking, configurable headers
- **Fields**: Title, Price, Location, Date, URL, Image URL, Scraped At, Source

### Change Detection
- Tracks price changes and listing updates
- Enables trend analysis and change-based notifications
- Historical data comparison for long-term monitoring

### Email Notifications
- Configurable triggers (new listings, price drops, keyword matches)
- Template-based email formatting with placeholders
- Rate limiting to prevent spam
- Currently implemented as console output (placeholder)

## Extending the Framework

### Adding New Site Scrapers

1. Create new scraper class extending `BaseScraper`
2. Implement required abstract methods:
   - `authenticate()`
   - `navigateToSearch(url, searchKey)`
   - `handlePagination(paginationConfig)`
   - `extractData(searchConfig, maxListings)`
3. Register scraper in `ScraperFactory.js`
4. Create site configuration file in `sites/` directory
5. Update search configurations to reference new site

### Key Extension Points

- **New Sites**: Add scrapers for additional websites
- **Enhanced Filtering**: Extend filtering capabilities
- **Data Processing**: Add new transformation functions
- **Export Formats**: Support additional output formats
- **Notification Channels**: Add SMS, Slack, or other notification methods

## Dependencies

- **puppeteer**: Browser automation and JavaScript rendering
- **csv-writer**: CSV file generation with headers
- **fs-extra**: Enhanced file system operations
- **moment**: Date/time handling and formatting
- **crypto**: MD5 hashing for change detection
- **path**: File path utilities

## License

MIT License

---

## Current Search Results

The framework is actively scraping and has successfully extracted recent listings:

- **BMW Z3**: 10+ active listings with titles, URLs, and images
- **Mazda Miata**: Configured and ready for daily scraping
- **CSV Export**: Working with timestamped files in `output/` directory
- **Change Detection**: Tracking new listings and price changes
- **Notifications**: Console-based alerts for keyword matches

The system is production-ready and resilient against website structure changes.
