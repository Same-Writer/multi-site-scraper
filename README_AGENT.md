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
- Email notifications (placeholder implementation)
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

### Recent Architectural Improvements (August 25, 2025)

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

**Facebook Marketplace Selector Fix (August 26, 2025):**
- **Problem Solved**: Facebook Marketplace returning 0 results despite successful authentication and page loading
- **Root Cause**: Generic selectors in `listingContainer` configuration were not matching Facebook's current HTML structure
- **Solution Implemented**: Updated BMW Z3 configuration with specific Facebook Marketplace selectors
- **Key Changes**:
  - `sites/facebook-marketplace.json`: Updated `listingContainer` selector from generic patterns to specific Facebook selectors: `"div[data-pagelet='MarketplaceSearchResultsPagelet'] a[role='link'], a[href*='/marketplace/item/'], div[aria-label*='Collection of Marketplace items']"`
  - Changed data field selectors to use wildcard approach (`"*"`) similar to successful Craigslist implementation
  - Added `cleanLocation` transform for location field processing
  - Updated `waitConditions` to match new selectors for proper page load detection
- **Results**: Successfully extracting 10 BMW Z3 listings with complete data (title, price, location, URL, image URL)
- **Performance**: Extracts 25 raw items from page, filters to 10 high-quality results within configured limits
- **Architectural Learning**: Facebook Marketplace requires more specific selectors than Craigslist but responds well to wildcard data extraction approach

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

**FACEBOOK MARKETPLACE DEBUGGING SUCCESS (August 26, 2025):**
**Effective Debugging Approach**: AI agent successfully debugged Facebook Marketplace selector issues using systematic approach:
1. **Browser Inspection**: Used browser_action tool to manually inspect Facebook Marketplace page structure and identify actual HTML elements
2. **Selector Analysis**: Compared current page structure with existing configuration to identify mismatch
3. **Incremental Testing**: Made targeted selector updates and tested with Docker rebuild
4. **Wildcard Strategy**: Applied successful Craigslist wildcard selector approach to Facebook Marketplace
**SUCCESSFUL PATTERN**: Future agents should:
- **Use browser inspection** to understand actual page structure before making selector changes
- **Apply proven patterns** from working scrapers (like Craigslist wildcard approach) to new sites
- **Test immediately after changes** with proper Docker rebuild to verify fixes work
- **Focus on specific, targeted changes** rather than broad configuration overhauls

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

**Current State**: The system is production-ready for the configured searches (BMW Z3, Mazda Miata) with Craigslist as the primary data source. Facebook Marketplace integration exists but may need refinement.

---

## Final Notes for AI Agents

This codebase represents a mature, well-architected system designed for extensibility. Your role is to enhance and extend the system while preserving its core architectural principles. The modular design makes it possible to add new capabilities without disrupting existing functionality.

**Remember**: You are part of a chain of AI agents working on this project. Your changes will be inherited by future agents, so prioritize clarity, documentation, and maintainability in your implementations.

**When in doubt**: Follow the existing patterns, maintain the configuration-driven approach, and preserve the modular architecture that makes this system extensible and maintainable.
