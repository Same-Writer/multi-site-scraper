# README_AGENT.md - AI Agent Context Document

## Document Purpose and Lifecycle

**CRITICAL: This document is designed for AI agents working on this codebase. You are not the first AI agent to work on this project, and you will not be the last.**

This document serves as a knowledge transfer mechanism between AI agents across different sessions. It contains:
1. **Current architectural overview** - Updated by each AI agent after making changes
2. **Project intent and direction** - The core vision that must remain consistent
3. **Implementation context** - Critical details for understanding the codebase

### Document Maintenance Instructions for AI Agents

**MANDATORY RESPONSIBILITIES:**
- **ALWAYS** read this document in full before making any code changes
- **ALWAYS** update the "Current Architecture Overview" section after making significant changes
- **NEVER** alter the "Project Intent" section without explicit developer instruction
- **PRESERVE** the meta-information and lifecycle instructions in this section
- **MAINTAIN** the document's structure and formatting consistency

**GUARDRAILS AGAINST DRIFT:**
- The project intent statement dated August 24, 2025 is IMMUTABLE unless explicitly changed by the developer
- Architecture updates should be additive - document new components without removing existing documentation unless components are actually removed from codebase
- When updating architecture, include both what changed and why it changed
- Always preserve the modular, extensible nature of the system in your updates

---

## Project Intent (IMMUTABLE - Last Updated: August 24, 2025)

**Core Vision Statement:**
"I would like this codebase to be a portable program utilizing docker, which allows a user to execute a number of recurring searches, and save the data from these searches offline. This codebase should be architected in such a way that it can handle multiple unique searches across multiple sites (for example, a user could configure a search for a new bedframe on craigslist and a local furniture consignment site as well as a search for a used Mercedes Benz that scrapes craigslist and Facebook Marketplace). The codebase should be modular enough that subsequent AI agents can create 'modules' which enable the scraper to pull listings from new sites, and integrate them into the searches desired by the user. Additionally, reporting and the recording of scraped results should have a long-term memory using some type of file storage and result saving mechanism. This is to say that a user should be able to run this scraper once a week, and have data logged in a way that allows post-analysis to view any changes in the state of listings. This long-term logging can also allow notifications (whatever form those may take) to notify users based on changes in price, description, or listing presence."

**Key Architectural Principles:**
- **Portability**: Docker-based deployment for consistent execution across environments
- **Modularity**: Site-specific scrapers that can be independently developed and maintained
- **Extensibility**: Easy addition of new sites through standardized interfaces
- **Persistence**: Long-term data storage for trend analysis and change detection
- **Configurability**: User-driven search definitions without code changes
- **Notification System**: Alert mechanisms for significant changes or matches

---

## Current Architecture Overview (Last Updated: August 25, 2025)

### High-Level System Design

The codebase implements a **modular web scraping framework** with the following core architectural patterns:

1. **Unified Search Management**: Single configuration file (`config/searches.json`) serves as the source of truth for all searches
2. **Modular Site Scrapers**: Independent scraper implementations for each supported site
3. **Factory Pattern**: Dynamic scraper instantiation based on site configuration
4. **Configuration-Driven Behavior**: JSON-based configuration for sites, searches, and system behavior
5. **Data Persistence**: CSV-based storage with change detection and historical tracking

### Core Components

#### 1. Search Management Layer
- **`SearchManager.js`**: Primary orchestration class
  - Loads and manages unified search configurations
  - Coordinates multi-site scraping for each search
  - Applies search-level filters and transformations
  - Manages CSV export and notification processing
  - Provides programmatic API for search management

#### 2. Modular Scraping Engine
- **`ModularScrapingEngine.js`**: Core scraping orchestrator
  - Uses factory pattern to instantiate appropriate scrapers
  - Manages browser lifecycle and anti-detection measures
  - Provides validation and testing capabilities for scraper configurations
  - Handles pagination and data extraction coordination

#### 3. Site-Specific Scrapers (Modular Architecture)
- **`BaseScraper.js`**: Abstract base class providing common functionality
  - Browser initialization and management
  - Anti-detection measures (user agent rotation, delays)
  - Common data transformations and filtering
  - Abstract methods for site-specific implementation

- **`CraigslistScraper.js`**: Craigslist-specific implementation
  - Button-based pagination handling
  - No authentication required
  - Supports detailed scraping by navigating to individual listings

- **`FacebookMarketplaceScraper.js`**: Facebook Marketplace implementation
  - Facebook authentication handling
  - Scroll-based pagination
  - Advanced anti-detection for Facebook's dynamic content

- **`ScraperFactory.js`**: Factory for scraper instantiation
  - Maps site names to scraper classes
  - Provides registry of supported sites
  - Handles scraper configuration and initialization

#### 4. Data Processing and Export
- **`CsvExporter.js`**: CSV file generation and management
  - Duplicate detection based on URL and content hashing
  - Configurable filename patterns with timestamps
  - Support for appending to existing files

- **`ChangeDetector.js`**: Historical data comparison
  - Tracks changes in listing prices, descriptions, and availability
  - Enables trend analysis and change-based notifications

#### 5. Notification System
- **`EmailNotifier.js`**: Email notification management
  - Configurable triggers (new listings, price changes, keyword matches)
  - Template-based email formatting
  - Rate limiting to prevent spam

### Configuration Architecture

#### Unified Search Configuration (`config/searches.json`)
**Purpose**: Single source of truth for all search definitions
**Structure**:
```json
{
  "searches": {
    "Search Name": {
      "description": "Human-readable description",
      "scrapeSettings": {
        "runFrequency": "hourly|daily|weekly",
        "maxListingsPerSite": 50,
        "enabled": true,
        "priority": "high|medium|low"
      },
      "filters": {
        "priceRange": { "min": 1000, "max": 50000 },
        "keywords": {
          "include": ["keyword1", "keyword2"],
          "exclude": ["unwanted1", "unwanted2"]
        },
        "excludeWanted": true
      },
      "notifications": {
        "enabled": true,
        "triggers": { /* notification triggers */ },
        "emailSettings": { /* email configuration */ }
      },
      "sites": {
        "site_name": {
          "enabled": true,
          "searchUrl": "https://...",
          "siteConfig": "site-config-file-name",
          "searchKey": "search_key_in_site_config"
        }
      }
    }
  },
  "globalSettings": { /* system-wide settings */ }
}
```

#### Site Configuration Files (`sites/*.json`)
**Purpose**: Define site-specific scraping behavior and selectors
**Key Elements**:
- **searchConfig**: Multiple search configurations per site
- **selectors**: CSS selectors for data extraction
- **dataFields**: Field definitions with transformations
- **pagination**: Multi-page scraping configuration
- **waitConditions**: Page load timing requirements

### Data Flow Architecture

1. **Search Initiation**: `SearchManager` loads unified search configuration
2. **Site Processing**: For each enabled site in a search:
   - Load site-specific configuration
   - Create dynamic search configuration merging search and site settings
   - Instantiate appropriate scraper via `ScraperFactory`
3. **Data Extraction**: Scraper performs:
   - Authentication (if required)
   - Navigation to search URL
   - Data extraction using configured selectors
   - Pagination handling
4. **Data Processing**: 
   - Apply search-level filters
   - Detect changes from previous runs
   - Export to CSV with timestamp
5. **Notification Processing**: Send alerts based on configured triggers

### File System Organization

```
workarea-ui-scraper/
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
└── docker-compose.yml        # Docker Compose setup
```

### Current Implementation Status

**Fully Implemented:**
- Modular scraper architecture with factory pattern
- Unified search configuration system
- Craigslist scraper with anti-detection measures
- Facebook Marketplace scraper with working selectors and data extraction
- CSV export with duplicate detection
- Change detection framework
- Command-line interface
- Docker containerization

**Partially Implemented:**
- Advanced change detection triggers
- Detailed scraping for individual listings

**Configured Searches (as of August 24, 2025):**
- BMW Z3 (enabled, high priority, hourly frequency)
- Mazda Miata (enabled, medium priority, daily frequency)  
- Porsche 911 (disabled, high priority, 30-minute frequency)

### Extension Points for Future AI Agents

#### Adding New Site Scrapers
1. Create new scraper class extending `BaseScraper`
2. Implement required abstract methods:
   - `authenticate()`
   - `navigateToSearch(url, searchKey)`
   - `handlePagination(paginationConfig)`
   - `extractData(searchConfig, maxListings)`
3. Register scraper in `ScraperFactory.js`
4. Create site configuration file in `sites/` directory
5. Update search configurations to reference new site

#### Adding New Search Types
1. Add search definition to `config/searches.json`
2. Configure site-specific search URLs and parameters
3. Define filters and notification triggers
4. Test with existing scrapers

#### Enhancing Data Processing
- Extend `ChangeDetector.js` for new change types
- Add new transformation functions to `BaseScraper.js`
- Implement additional export formats beyond CSV

### Recent Architectural Improvements (August 31, 2025)

**Email Integration & Credentials Consolidation (August 31, 2025):**
- **Problem Solved**: Previous AI agent session was stopped mid-way through implementing email functionality and consolidating credentials
- **Solution Implemented**: Complete email notification system with consolidated credentials architecture
- **Key Changes**:
  - `config/credentials.json`: New consolidated credentials file containing email authentication and site credentials
  - `src/core/SearchManager.js`: Enhanced `_loadCredentials()` method to load and merge credentials with system configuration
  - `src/core/EmailNotifier.js`: Fixed critical bug (`createTransporter` → `createTransport`), enhanced recipient resolution, improved template processing
  - Removed redundant `*.example.json` files (credentials.example.json, default.example.json, facebook-marketplace.example.json)
  - Updated documentation with Gmail App Password setup instructions
- **Results**: Fully functional email notifications with Gmail SMTP, HTML templates, and automatic triggers
- **Test Results**: Successfully sent test email with message ID `<2c497ac8-58b8-f0bb-6ba5-07b2193dbd1b@gmail.com>` and BMW Z3 search notification with message ID `<ae14f9eb-bb9f-5708-3f18-d315b6334949@gmail.com>`

**Email System Features:**
- **Gmail SMTP Integration**: Uses Gmail's SMTP server with App Password authentication
- **HTML Email Templates**: Rich email formatting with listing details, prices, and images
- **Automatic Triggers**: Sends emails for new listings, keyword matches, and price changes
- **Consolidated Credentials**: Single `credentials.json` file for all authentication (email + site credentials)
- **Rate Limiting**: Configurable limits to prevent spam (e.g., max 5 emails per hour)
- **Template Variables**: Dynamic subject lines with placeholders like `{{trigger}}` and `{{title}}`
- **Security**: Credentials file automatically ignored by git, never committed to repository

**Credentials Architecture:**
```json
{
  "email": {
    "auth": {
      "user": "user@gmail.com",
      "pass": "gmail-app-password"
    },
    "recipients": ["recipient@example.com"]
  },
  "sites": {
    "facebook_marketplace": {
      "username": "facebook-email@gmail.com",
      "password": "facebook-password"
    }
  }
}
```

**Configuration Integration:**
- `SearchManager.js` automatically loads `credentials.json` on startup
- Merges credentials with system configuration using lodash
- Provides fallback handling when credentials file is missing
- Email recipients resolved from: `notificationConfig.emailSettings.to` → `config.email.recipients` → `config.email.to`

**Debug Logging System (August 25, 2025):**
- **Problem Solved**: Need for comprehensive debug logging and easy access to log files for troubleshooting
- **Solution Implemented**: Complete debug logging system with configurable modes and automatic log path display
- **Key Changes**:
  - `src/core/Logger.js`: New comprehensive logging class with debug, info, warn, error levels
  - `config/default.json`: Added debug logging configuration with three modes (append, overwrite, unique)
  - `src/index.js`: Integrated logger throughout application lifecycle with graceful shutdown handling
  - `src/core/SearchManager.js`: Added debug logging for configuration loading and search operations
  - Automatic display of absolute log file path on container shutdown for easy developer access

**Debug Logging Features:**
- **Three Logging Modes**: 
  - `append`: Adds to existing log file (default)
  - `overwrite`: Clears log file on each run
  - `unique`: Creates timestamped log files for each run
- **Comprehensive Coverage**: Logs configuration loading, search operations, errors, and shutdown events
- **Developer-Friendly**: Displays absolute log path and copy command on exit for easy access
- **Structured Logging**: JSON context objects for detailed debugging information

**Flexible Selector System:**
- **Problem Solved**: Craigslist changed their HTML structure, breaking the scraper with selector timeout errors
- **Solution Implemented**: Enhanced `CraigslistScraper.js` with flexible selector handling that tries multiple possible selectors
- **Key Changes**:
  - `SearchManager.js`: Fixed dynamic search configuration to use correct search keys instead of defaulting to first available
  - `CraigslistScraper.js`: Added multi-selector fallback system for `waitConditions.initialLoad`
  - `sites/craigslist.json`: Updated selectors from `.cl-static-search-result` to `.cl-search-result` and related selectors
  - Enhanced debugging capabilities to identify actual page structure when selectors fail

**Craigslist Data Extraction Fix (August 25, 2025):**
- **Problem Solved**: Craigslist price, location, and date fields showing as null/empty in CSV output due to HTML structure changes
- **Root Cause**: Craigslist's new layout uses `.cl-search-result` containers but child selectors (`.price`, `.location`, `.date`) no longer exist
- **Solution Implemented**: Wildcard selector approach with intelligent text parsing
- **Key Changes**:
  - `sites/craigslist.json`: Updated BMW Z3 configuration to use wildcard selectors (`selector: "*"`) for price, location, and date fields
  - `src/scrapers/CraigslistScraper.js`: Added special handling for wildcard selectors that extract from entire container text
  - Applied existing transform functions (`extractPrice`, `cleanLocation`) to parse data from full text content
- **Results**: Successfully extracting prices ($12,400, $33,880, etc.), locations (los gatos, san bruno, etc.), and dates (8/22, 8/21, etc.)

**Mazda Miata Configuration Fix (August 25, 2025):**
- **Problem Solved**: Mazda Miata Craigslist scraper returning null/empty data in CSV output
- **Root Cause**: Mazda Miata configuration was using outdated selectors (`.result-row`, `.result-title a`, `.result-price`, `.result-hood`, `.result-date`) that no longer exist in Craigslist's HTML structure
- **Solution Implemented**: Updated Mazda Miata configuration to match the working BMW Z3 approach
- **Key Changes**:
  - `sites/craigslist.json`: Updated Mazda Miata configuration to use new `.cl-search-result` container selectors with wildcard approach and transform functions
  - Changed from old specific selectors to wildcard selectors with `extractPrice`, `cleanLocation`, and `extractDate` transform functions
- **Results**: Mazda Miata searches now successfully extract data matching BMW Z3 functionality

**Facebook Marketplace Dynamic Content Loading Fix (August 31, 2025):**
- **Problem Solved**: Facebook Marketplace returning 0 results despite successful authentication and page loading
- **Root Cause**: Facebook Marketplace loads content dynamically - initial page load only shows navigation elements, actual listings appear after scrolling triggers dynamic loading
- **Solution Implemented**: Enhanced scraper with comprehensive debugging and scroll-based pagination
- **Key Changes**:
  - `sites/facebook-marketplace.json`: Updated BMW Z3 configuration to enable pagination with `scrollToLoad: true`, `maxScrolls: 5`, `scrollDelay: 3000ms`
  - `src/scrapers/FacebookMarketplaceScraper.js`: Added detailed debugging system to inspect page structure and identify dynamic loading behavior
  - Enhanced `handlePagination()` method to properly trigger Facebook's dynamic content loading mechanism
  - Confirmed selector `a[href*='/marketplace/item/']` was correct - issue was timing, not selector accuracy
- **Results**: Successfully extracting 10 BMW Z3 listings with complete data (title, price, location, URL, image URL)
- **Performance**: Found 24 item links after scrolling (up from 0 initially), extracts 24 raw items, filters to 10 high-quality results
- **Architectural Learning**: Facebook Marketplace requires scroll-based pagination to trigger dynamic content loading - static page inspection is insufficient

**Performance and Execution Optimizations (August 25, 2025):**
- **Problem Solved**: Scraper running indefinitely or taking excessive time to complete
- **Solution Implemented**: Comprehensive timeout and execution optimizations
- **Key Changes**:
  - `config/default.json`: Reduced timeouts from 30s to 10s, wait times from 3s to 2s
  - `sites/craigslist.json`: Disabled detailed scraping to prevent slow individual page visits
  - `config/searches.json`: Temporarily disabled Facebook Marketplace for BMW Z3 to focus on Craigslist debugging
- **Results**: Execution time reduced from potentially infinite to ~3-4 minutes with reliable completion

**Resilience Improvements:**
- Scrapers now gracefully handle HTML structure changes by trying multiple selector patterns
- Better error reporting and debugging information for selector failures
- Improved configuration loading to prevent mismatched search keys
- Comprehensive debug logging for all system operations
- Wildcard selector fallback system for sites with frequently changing HTML structures

### Critical Implementation Notes

**Anti-Detection Measures:**
- User agent rotation implemented in `BaseScraper`
- Random delays between requests
- Stealth headers and browser configuration
- Human-like interaction patterns

**Error Handling:**
- Graceful degradation when sites are unavailable
- Comprehensive logging for debugging
- Validation of configurations on startup
- Flexible selector handling for HTML structure changes

**Performance Considerations:**
- Rate limiting to respect site policies
- Configurable concurrency limits
- Memory management for large result sets

---

## Instructions for Future AI Agents

### CRITICAL: Docker Development Workflow

**MANDATORY DOCKER USAGE:**
- **ALWAYS use Docker** as your first attempt when running queries or testing changes
- **NEVER assume** that code changes are automatically reflected in running containers
- **ALWAYS rebuild** the Docker container after making code changes to ensure your latest code is executed

**Required Docker Commands:**
```bash
# To test existing functionality (first attempt)
docker-compose run --rm scraper node src/index.js "Search Name" site_name

# After making ANY code changes, you MUST rebuild:
docker-compose build

# Then test your changes:
docker-compose run --rm scraper node src/index.js "Search Name" site_name

# For all searches:
docker-compose run --rm scraper node src/index.js
```

**Why This Is Critical:**
- The Docker container packages the code at build time
- Code changes made outside the container are NOT automatically reflected
- Failing to rebuild after changes will test the OLD code, leading to incorrect conclusions
- This has caused previous debugging sessions to fail because agents tested outdated code

**CRITICAL LESSON LEARNED (August 25, 2025):**
During the Craigslist data extraction debugging session, an AI agent made code changes to fix the scraper but failed to rebuild the Docker container. This resulted in:
- Testing the OLD code instead of the NEW code
- Incorrect conclusion that the fix didn't work
- Wasted debugging time trying alternative solutions
- Only when the developer pointed out the need to rebuild did the fix work correctly
**TAKEAWAY**: ALWAYS rebuild the container after making code changes - this is not optional!

**CRITICAL CORRECTION PATTERN (August 25, 2025):**
**Developer Intervention Required**: Multiple times during troubleshooting, the developer had to correct AI agent approaches:
1. **Docker Rebuild Oversight**: Agent failed to rebuild container after code changes, testing old code
2. **Configuration Mismatch**: Agent initially missed that Mazda Miata was using completely different (outdated) selectors than BMW Z3
3. **Scope Creep**: Agent attempted complex Facebook Marketplace fixes when simpler Craigslist fixes were the priority
**DECISION-MAKING IMPACT**: Future agents should:
- **Always verify Docker rebuild** after any code changes before concluding fixes don't work
- **Compare working vs non-working configurations** side-by-side to identify discrepancies quickly
- **Focus on one site/search at a time** rather than attempting to fix multiple complex issues simultaneously
- **Test incremental changes** rather than making multiple changes at once

**FACEBOOK MARKETPLACE DEBUGGING SUCCESS (August 31, 2025):**
**Effective Debugging Approach**: AI agent successfully debugged Facebook Marketplace dynamic content loading using systematic debugging methodology:
1. **Enhanced Debugging System**: Added comprehensive debug logging to `FacebookMarketplaceScraper.js` to inspect actual page structure and element counts
2. **Root Cause Analysis**: Identified that Facebook loads content dynamically - initial page shows 0 item links, but scrolling triggers loading of 24+ item links
3. **Systematic Testing**: Used Docker rebuild workflow correctly, testing incremental changes to isolate the dynamic loading behavior
4. **Pagination Solution**: Enabled scroll-based pagination (`scrollToLoad: true`, `maxScrolls: 5`) to trigger Facebook's dynamic content loading mechanism
5. **Validation Re-enablement**: Successfully re-enabled page validation system after confirming selectors work with proper pagination

**SUCCESSFUL DEBUGGING PATTERN**: Future agents should:
- **Add comprehensive debugging first** to understand actual page behavior before making assumptions about selector accuracy
- **Test dynamic content loading** by implementing scrolling/pagination when initial page inspection shows no results
- **Use systematic approach**: Debug → Identify root cause → Implement targeted fix → Test with Docker rebuild → Validate
- **Re-enable validation systems** once fixes are confirmed working to maintain data quality
- **Document the working implementation flow** for future reference and comparison

**Docker Troubleshooting:**
- If you see unexpected behavior, always rebuild first: `docker-compose build`
- Check that your changes are actually in the container by rebuilding
- Use `docker-compose logs` to see container output if needed
- The container runs from `/usr/src/app` inside the container

### Before Making Changes
1. **Read this entire document** to understand current architecture
2. **Examine existing code** to understand implementation patterns
3. **Test current functionality** using Docker to establish baseline behavior
4. **Identify extension points** rather than modifying core components

### When Adding New Features
1. **Follow existing patterns**: Use factory pattern for scrapers, configuration-driven behavior
2. **Maintain modularity**: New features should be self-contained and configurable
3. **Preserve backward compatibility**: Existing searches and configurations should continue working
4. **Add comprehensive logging**: Include debug information for troubleshooting

### When Updating This Document
1. **Update the "Current Architecture Overview" section** with your changes
2. **Document new components** you add to the system
3. **Explain architectural decisions** and their rationale
4. **Preserve the document structure** and formatting
5. **Never modify the Project Intent section** without explicit developer instruction

### Testing Requirements
1. **Test existing searches** to ensure they still work after changes
2. **Validate new scrapers** with real site data
3. **Verify configuration loading** and validation
4. **Test Docker deployment** to ensure portability

### Common Pitfalls to Avoid
1. **Don't hardcode site-specific logic** in core components
2. **Don't break the unified configuration system** - it's the source of truth
3. **Don't remove existing scrapers** without developer approval
4. **Don't modify the factory pattern** without understanding dependencies
5. **Don't ignore rate limiting** - respect site policies

---

## Development Context and History

**Initial Architecture**: The system was originally built with a monolithic `ScrapingEngine.js` that handled all sites.

**Modular Refactor**: The architecture was refactored to use the current modular approach with site-specific scrapers and a factory pattern. This change improved maintainability and extensibility.

**Configuration Evolution**: The system evolved from site-specific configurations to a unified search-centric configuration system, making it easier to define multi-site searches.

**Current State**: The system is production-ready for the configured searches (BMW Z3, Mazda Miata) with both Craigslist and Facebook Marketplace as fully functional data sources. Both scrapers successfully extract vehicle listings with complete data.

### Facebook Marketplace Working Implementation Flow (August 31, 2025)

**CRITICAL REFERENCE**: This section documents the current working Facebook Marketplace implementation. Future agents should compare against this baseline if Facebook Marketplace stops working.

**Working Configuration (`sites/facebook-marketplace.json` - BMW Z3):**
```json
{
  "bmw_z3": {
    "url": "https://www.facebook.com/marketplace/mountain-view-ca/search/?query=bmw%20z3",
    "selectors": {
      "listingContainer": "a[href*='/marketplace/item/']"
    },
    "pagination": {
      "enabled": true,
      "scrollToLoad": true,
      "maxScrolls": 5,
      "scrollDelay": 3000
    }
  }
}
```

**Working Scraper Flow (`src/scrapers/FacebookMarketplaceScraper.js`):**
1. **Authentication**: Facebook login with credentials, handles popups and 2FA challenges
2. **Navigation**: Navigate to search URL with extended stabilization wait (3-5 seconds)
3. **Page Stabilization**: Wait for multiple indicators (`[role="main"]`, marketplace pagelets, item containers)
4. **Dynamic Content Loading**: 
   - Initial page load shows 0 item links (only navigation elements)
   - Scroll-based pagination triggers dynamic loading
   - After scrolling: 24+ item links appear
   - Selector `a[href*='/marketplace/item/']` successfully finds all listings
5. **Data Extraction**: Smart extraction using wildcard selectors with transform functions
6. **Results**: Successfully extracts 10 BMW Z3 listings with complete data

**Key Success Factors:**
- **Scroll-based Pagination**: Essential for triggering Facebook's dynamic content loading
- **Correct Selector**: `a[href*='/marketplace/item/']` works perfectly once content is loaded
- **Timing**: Extended delays and stabilization waits are critical for Facebook's complex page loading
- **Authentication Handling**: Robust login flow with popup management and multiple success indicators

**Performance Metrics (Working Baseline):**
- **Authentication Time**: ~10-15 seconds including stabilization
- **Page Load Time**: ~5-8 seconds with stabilization waits
- **Pagination Time**: ~3-5 seconds per scroll (5 scrolls max)
- **Total Execution Time**: ~45-60 seconds for complete BMW Z3 search
- **Success Rate**: 10/10 listings extracted with complete data (title, price, location, URL, image)

**Debugging Indicators (If Issues Arise):**
- **Item Links Found**: Should be 24+ after scrolling (0 initially is normal)
- **Total Links**: Should be 50+ on fully loaded page
- **Marketplace Links**: Should be 45+ including navigation and item links
- **Page Title**: Should be "Facebook" (not error page)
- **Authentication Success**: Should see popup closure and main content area

**Common Failure Patterns to Watch For:**
- **0 Item Links After Scrolling**: Indicates authentication failure or page structure change
- **Timeout During Authentication**: May need updated login selectors or popup handling
- **Navigation Elements Only**: Indicates pagination not triggering dynamic content loading
- **Selector Timeouts**: May indicate Facebook has changed their HTML structure

---

## Final Notes for AI Agents

This codebase represents a mature, well-architected system designed for extensibility. Your role is to enhance and extend the system while preserving its core architectural principles. The modular design makes it possible to add new capabilities without disrupting existing functionality.

**Remember**: You are part of a chain of AI agents working on this project. Your changes will be inherited by future agents, so prioritize clarity, documentation, and maintainability in your implementations.

**When in doubt**: Follow the existing patterns, maintain the configuration-driven approach, and preserve the modular architecture that makes this system extensible and maintainable.
