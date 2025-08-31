# Workarea UI Scraper Framework

A modular, Docker-based web scraping framework with unified search-centric configuration, flexible selector handling, email notifications, and CSV export capabilities. Built for extensibility and resilience against website structure changes.

## Features

- **Modular Architecture**: Factory pattern with site-specific scrapers extending a common base class
- **Unified Search Configuration**: Single source of truth (`config/searches.json`) for all searches with multi-site support
- **Consolidated Credentials**: Single `credentials.json` file for all authentication and email settings
- **Email Notifications**: Fully functional Gmail SMTP notifications with HTML templates
- **Flexible Selector System**: Gracefully handles HTML structure changes with multi-selector fallback
- **Docker-First Design**: Portable deployment with consistent execution across environments
- **CSV Export**: Automatic data export with duplicate detection and change tracking
- **Advanced Anti-Detection**: User agent rotation, random delays, stealth headers, human-like interactions
- **Command-Line Interface**: Run specific searches or all enabled searches
- **Change Detection**: Historical tracking for trend analysis and notifications

## Current Implementation Status

**Fully Operational:**
- **Craigslist Scraper**: Production-ready with flexible selector handling (updated August 2025)
- **Facebook Marketplace Scraper**: Production-ready with dynamic content loading and authentication (updated August 2025)
- **Email Notifications**: Fully functional Gmail SMTP with HTML templates and automatic triggers
- **BMW Z3 Search**: Enabled, high priority, hourly frequency
- **Mazda Miata Search**: Configured but disabled
- **Porsche 911 Search**: Configured but disabled
- **CSV Export**: With duplicate detection and timestamped files
- **Change Detection**: Tracks price changes and listing updates
- **Docker Deployment**: Complete containerization with docker-compose

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
   - Loads unified search configurations and consolidated credentials
   - Coordinates multi-site scraping for each search
   - Applies search-level filters and transformations
   - Manages CSV export and email notification processing

2. **ModularScrapingEngine.js**: Core scraping orchestrator
   - Uses factory pattern to instantiate appropriate scrapers
   - Manages browser lifecycle and anti-detection measures
   - Provides validation and testing capabilities

3. **Site-Specific Scrapers**: Independent implementations
   - **CraigslistScraper.js**: Button-based pagination, flexible selectors
   - **FacebookMarketplaceScraper.js**: Scroll-based pagination, authentication, dynamic content loading
   - **BaseScraper.js**: Abstract base class with common functionality

4. **EmailNotifier.js**: Email notification system
   - Gmail SMTP integration with App Password authentication
   - HTML email templates with listing details and images
   - Configurable triggers and rate limiting

## Project Structure

```
multi-site-scraper/
├── config/
│   ├── default.json          # System configuration (SMTP settings, logging)
│   ├── credentials.json      # Email auth & site credentials (CREATE THIS)
│   └── searches.json         # Unified search definitions (SOURCE OF TRUTH)
├── sites/
│   ├── craigslist.json       # Craigslist scraper configuration
│   └── facebook-marketplace.json # Facebook Marketplace configuration
├── src/
│   ├── core/                 # Core system components
│   │   ├── SearchManager.js  # Main orchestration
│   │   ├── ModularScrapingEngine.js # Scraping coordination
│   │   ├── CsvExporter.js    # Data export
│   │   ├── EmailNotifier.js  # Email notifications
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
git clone git@github.com:Same-Writer/multi-site-scraper.git
cd multi-site-scraper
```

2. **Create your credentials file:**

   Create `config/credentials.json` with your authentication details:

   ```json
   {
     "email": {
       "auth": {
         "user": "your-email@gmail.com",
         "pass": "your-app-password"
       },
       "recipients": [
         "recipient@example.com"
       ]
     },
     "sites": {
       "facebook_marketplace": {
         "username": "your-facebook-email@gmail.com",
         "password": "your-facebook-password"
       }
     }
   }
   ```

   **⚠️ SECURITY NOTE:** The `credentials.json` file is automatically ignored by git and will never be committed to your repository.

3. **Set up Gmail App Password (for email notifications):**

   See [Gmail App Password Setup](#gmail-app-password-setup) below for detailed instructions.

4. **Build the Docker image:**
```bash
docker-compose build
```

5. **Run all enabled searches:**
```bash
docker-compose run --rm scraper node src/index.js
```

6. **Run a specific search:**
```bash
docker-compose run --rm scraper node src/index.js "BMW Z3"
```

7. **Run a specific search on a specific site:**
```bash
docker-compose run --rm scraper node src/index.js "BMW Z3" craigslist
```

8. **Check results:**
```bash
ls -la output/
```

#### Gmail App Password Setup

To use email notifications, you'll need to set up a Gmail App Password:

1. **Enable 2-Factor Authentication** on your Google account:
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Navigate to Security → 2-Step Verification
   - Follow the setup process if not already enabled

2. **Generate an App Password:**
   - In Google Account Settings, go to Security → 2-Step Verification
   - Scroll down to "App passwords" and click it
   - Select "Mail" as the app and your device type
   - Click "Generate"
   - Copy the generated 16-character password (it will look like: `abcd efgh ijkl mnop`)

3. **Use the App Password** in your `config/credentials.json` file:
   ```json
   {
     "email": {
       "auth": {
         "user": "your-email@gmail.com",
         "pass": "abcd efgh ijkl mnop"
       }
     }
   }
   ```

   **Important:** Use the App Password, not your regular Gmail password!

4. **Test email functionality:**
```bash
docker-compose run --rm scraper node -e "
const SearchManager = require('./src/core/SearchManager');
const EmailNotifier = require('./src/core/EmailNotifier');
(async () => {
  const sm = new SearchManager();
  await new Promise(r => setTimeout(r, 1000));
  const notifier = new EmailNotifier(sm.config);
  await new Promise(r => setTimeout(r, 2000));
  await notifier.sendTestEmail('your-email@gmail.com');
})();
"
```

#### Configuration Security

- **✅ Safe to commit:** Configuration files without credentials
- **❌ Never commit:** `config/credentials.json` (contains your actual credentials)
- **🔒 Protected by .gitignore:** Your credential file is automatically excluded from git commits

#### Running Without Credentials

- **Craigslist only:** Works without any credential setup
- **Email notifications:** System will detect missing credentials and disable email notifications
- **Facebook Marketplace:** System will detect missing credentials and skip Facebook sites

### Local Installation (Alternative)

#### Prerequisites

1. Install Node.js (version 18 or higher):
   - Download from [https://nodejs.org/](https://nodejs.org/)

2. Install dependencies:
```bash
npm install
```

3. Create your `config/credentials.json` file (see Docker setup above)

4. Run locally:
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
docker-compose run --rm scraper node src/index.js "BMW Z3" facebook_marketplace
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
          "subject": "BMW Z3 Alert: {{trigger}} - {{title}}",
          "maxEmailsPerHour": 5
        }
      },
      "sites": {
        "craigslist": {
          "enabled": true,
          "searchUrl": "https://sfbay.craigslist.org/search/cta?postal=94040&query=bmw%20z3",
          "siteConfig": "craigslist",
          "searchKey": "bmw_z3"
        },
        "facebook_marketplace": {
          "enabled": true,
          "searchUrl": "https://www.facebook.com/marketplace/mountain-view-ca/search/?query=bmw%20z3",
          "siteConfig": "facebook-marketplace",
          "searchKey": "bmw_z3"
        }
      }
    }
  }
}
```

### Credentials Configuration (`config/credentials.json`)

Create this file with your authentication details:

```json
{
  "email": {
    "auth": {
      "user": "your-email@gmail.com",
      "pass": "your-gmail-app-password"
    },
    "recipients": [
      "recipient1@example.com",
      "recipient2@example.com"
    ]
  },
  "sites": {
    "facebook_marketplace": {
      "username": "your-facebook-email@gmail.com",
      "password": "your-facebook-password"
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

## Email Notifications

The system includes a fully functional email notification system with the following features:

### Features
- **Gmail SMTP Integration**: Uses Gmail's SMTP server with App Password authentication
- **HTML Email Templates**: Rich email formatting with listing details, prices, and images
- **Automatic Triggers**: Sends emails for new listings, keyword matches, and price changes
- **Rate Limiting**: Configurable limits to prevent spam (e.g., max 5 emails per hour)
- **Template Variables**: Dynamic subject lines with placeholders like `{{trigger}}` and `{{title}}`

### Email Content
Each notification email includes:
- Search name and trigger reason
- Listing details (title, price, location, date)
- Direct links to listings
- Listing images (when available)
- Professional HTML formatting

### Configuration
Email settings are split between two files:

**Global Settings** (`config/default.json`):
```json
{
  "email": {
    "enabled": true,
    "smtp": {
      "host": "smtp.gmail.com",
      "port": 587,
      "secure": false
    },
    "from": "your-email@gmail.com"
  }
}
```

**Credentials** (`config/credentials.json`):
```json
{
  "email": {
    "auth": {
      "user": "your-email@gmail.com",
      "pass": "your-app-password"
    },
    "recipients": ["recipient@example.com"]
  }
}
```

**Per-Search Settings** (`config/searches.json`):
```json
{
  "notifications": {
    "enabled": true,
    "triggers": {
      "newListing": true,
      "keywordMatch": ["manual", "low miles"]
    },
    "emailSettings": {
      "subject": "BMW Z3 Alert: {{trigger}} - {{title}}",
      "maxEmailsPerHour": 5
    }
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
      "notifications": {
        "enabled": true,
        "triggers": {
          "newListing": true,
          "keywordMatch": ["si", "type r", "manual"]
        },
        "emailSettings": {
          "subject": "Honda Civic Alert: {{trigger}} - {{title}}"
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

### Email Integration & Credentials Consolidation
- **Consolidated Credentials**: Single `credentials.json` file for all authentication
- **Functional Email Notifications**: Gmail SMTP with HTML templates and automatic triggers
- **Enhanced Security**: App Password authentication with proper credential isolation

### Facebook Marketplace Dynamic Content Loading
- **Problem Solved**: Facebook Marketplace returning 0 results despite successful authentication
- **Root Cause**: Facebook loads content dynamically after scrolling
- **Solution**: Scroll-based pagination triggers dynamic content loading
- **Results**: Successfully extracting 10+ BMW Z3 listings with complete data

### Flexible Selector System
- **Problem Solved**: Craigslist changed HTML structure, breaking scraper
- **Solution**: Multi-selector fallback system that tries multiple possible selectors
- **Result**: Scraper now gracefully handles website structure changes

### Enhanced Configuration Loading
- Fixed dynamic search configuration to use correct search keys
- Improved error reporting and debugging capabilities
- Better validation of site configurations

## Debugging and Troubleshooting

### Debug Mode

Enable debug logging:
```bash
docker-compose run --rm scraper sh -c "DEBUG=true node src/index.js 'BMW Z3'"
```

### Common Issues

#### 1. Email Not Sending
- **Cause**: Missing or incorrect Gmail App Password
- **Solution**: 
  1. Verify 2FA is enabled on your Google account
  2. Generate a new App Password
  3. Use the App Password (not your regular password) in `credentials.json`
  4. Test with: `docker-compose run --rm scraper node src/index.js "BMW Z3" craigslist`

#### 2. No Results Found
- **Cause**: Website structure changed or selectors outdated
- **Solution**: Check `sites/*.json` for updated selectors
- **Debug**: Enable debug mode to see selector matching details

#### 3. Container Issues
- **Cause**: Code changes not reflected in container
- **Solution**: Always rebuild after code changes:
```bash
docker-compose build
docker-compose run --rm scraper node src/index.js "BMW Z3"
```

#### 4. Facebook Authentication Issues
- **Cause**: Incorrect Facebook credentials or 2FA challenges
- **Solution**: 
  1. Verify credentials in `config/credentials.json`
  2. Temporarily disable 2FA or use app-specific password
  3. Check for CAPTCHA or security challenges

### Logs and Output

- **CSV Files**: Generated in `output/` directory with timestamps
- **Console Output**: Shows scraping progress and results
- **Debug Information**: Available with `DEBUG=true` environment variable
- **Email Confirmations**: Message IDs displayed when emails are sent successfully

## Working with AI Agents

This project is designed to be extended and maintained by AI agents. See `README_AGENT.md` for detailed architectural documentation and development guidelines.

### For Developers: Instructing AI Agents

#### Getting Started with an AI Agent

Use this prompt to have an AI agent familiarize themselves with the project:

```
Hello, I'm going to get started making changes to the code in multi-site-scraper. Can you please read over the README_AGENT.md document to add the context of this project to your current context window?
```

This will ensure the AI agent understands:
- The current architecture and design patterns
- Recent changes and improvements
- Critical development workflows (especially Docker usage)
- Extension points for adding new features

#### Key Points for AI Agent Instructions

1. **Always start with README_AGENT.md**: This document contains critical context about the project's architecture, recent changes, and development patterns.

2. **Docker-First Development**: AI agents must understand that:
   - Code changes require container rebuilds (`docker-compose build`)
   - Testing should always use Docker commands
   - Failing to rebuild leads to testing outdated code

3. **Credentials Security**: The consolidated `credentials.json` system:
   - Contains all authentication details in one file
   - Is automatically ignored by git
   - Should never be committed to the repository

## Data Output

### CSV Export
- **Location**: `output/` directory
- **Format**: Timestamped filenames (e.g., `bmw_z3_craigslist_2025-08-31T17:51:39.695Z.csv`)
- **Features**: Duplicate detection, change tracking, configurable headers
- **Fields**: Title, Price, Location, Date, URL, Image URL, Scraped At, Source

### Email Notifications
- **HTML Templates**: Professional formatting with listing details and images
- **Automatic Triggers**: New listings, keyword matches, price changes
- **Rate Limiting**: Configurable limits to prevent spam
- **Gmail Integration**: Uses SMTP with App Password authentication

### Change Detection
- Tracks price changes and listing updates
- Enables trend analysis and change-based notifications
- Historical data comparison for long-term monitoring

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
6. Add credentials to `config/credentials.json` if authentication is required

### Key Extension Points

- **New Sites**: Add scrapers for additional websites
- **Enhanced Filtering**: Extend filtering capabilities
- **Data Processing**: Add new transformation functions
- **Export Formats**: Support additional output formats
- **Notification Channels**: Add SMS, Slack, or other notification methods

## Dependencies

- **puppeteer**: Browser automation and JavaScript rendering
- **csv-writer**: CSV file generation with headers
- **nodemailer**: Email sending with SMTP support
- **fs-extra**: Enhanced file system operations
- **lodash**: Utility functions for object manipulation
- **moment**: Date/time handling and formatting

## License

MIT License

---

## Current System Status

The framework is fully functional:

- ✅ **Email Notifications**: Gmail SMTP with HTML templates and automatic triggers
- ✅ **Craigslist Scraper**: Resilient to HTML structure changes with flexible selectors
- ✅ **Facebook Marketplace Scraper**: Dynamic content loading with authentication
- ✅ **Consolidated Credentials**: Single `credentials.json` file for all authentication
- ✅ **CSV Export**: Timestamped files with duplicate detection
- ✅ **Change Detection**: Historical tracking and trend analysis
- ✅ **Docker Deployment**: Complete containerization with docker-compose

### Recent Successful Test Results

**BMW Z3 Search (August 31, 2025):**
- ✅ 10 listings successfully scraped from Craigslist
- ✅ Email notification sent with message ID: `<ae14f9eb-bb9f-5708-3f18-d315b6334949@gmail.com>`
- ✅ CSV export: `bmw_z3_craigslist_2025-08-31T17:51:39.695Z.csv`
- ✅ All data properly filtered and formatted

The system is actively monitoring for BMW Z3 listings and will automatically send email notifications when new matches are found or when keyword matches occur.
