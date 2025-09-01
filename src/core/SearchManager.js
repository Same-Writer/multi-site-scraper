const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const ModularScrapingEngine = require('./ModularScrapingEngine');
const CsvExporter = require('./CsvExporter');
const EmailNotifier = require('./EmailNotifier');
const ChangeDetector = require('./ChangeDetector');

class SearchManager {
  constructor() {
    this.config = null;
    this.searchesConfig = null;
    this.siteConfigs = new Map();
    this.logger = null;
    this.loadConfigurations();
  }

  setLogger(logger) {
    this.logger = logger;
  }

  async loadConfigurations() {
    try {
      if (this.logger) this.logger.debug('Loading configurations...');

      // Load default config
      const defaultConfigPath = path.join(__dirname, '../../config/default.json');
      this.config = await fs.readJson(defaultConfigPath);

      // Load site configurations
      const sitesDir = path.join(__dirname, '../../sites');
      const siteFiles = await fs.readdir(sitesDir);
      for (const file of siteFiles) {
        if (file.endsWith('.json')) {
          const siteName = path.basename(file, '.json');
          const siteConfig = await fs.readJson(path.join(sitesDir, file));
          this.siteConfigs.set(siteName, siteConfig);
        }
      }

      // Load credentials and merge
      const credentials = await this._loadCredentials();
      if (credentials) {
        this.config = _.merge(this.config, credentials);
      }

      // Load the unified searches configuration
      const searchesPath = path.join(__dirname, '../../config/searches.json');
      this.searchesConfig = await fs.readJson(searchesPath);

      if (this.logger) {
        this.logger.info('Configurations loaded successfully');
      }

      this.logAvailableSearches();
    } catch (error) {
      console.error('Error loading configurations:', error);
      if (this.logger) this.logger.error('Error loading configurations', { error: error.message });
      throw error;
    }
  }

  async _loadCredentials() {
    const credentialsPath = path.join(__dirname, '../../config/credentials.json');
    try {
      if (await fs.pathExists(credentialsPath)) {
        if (this.logger) this.logger.debug('Loading credentials...');
        const credentials = await fs.readJson(credentialsPath);
        if (this.logger) this.logger.debug('Loaded credentials successfully.');
        return credentials;
      } else {
        if (this.logger) this.logger.warn('credentials.json not found. Running without authentication for sites that require it.');
        return null;
      }
    } catch (error) {
      console.error('Error loading credentials.json:', error);
      if (this.logger) this.logger.error('Error loading credentials.json', { error: error.message });
      return null;
    }
  }

  logAvailableSearches() {
    console.log('\nAvailable searches:');
    Object.entries(this.searchesConfig.searches).forEach(([searchName, config]) => {
      const enabledSites = Object.entries(config.sites)
        .filter(([_, siteConfig]) => siteConfig.enabled)
        .map(([siteName]) => siteName);
      
      console.log(`\n${searchName} (${config.scrapeSettings.enabled ? 'ENABLED' : 'DISABLED'}):`);
      console.log(`  Description: ${config.description}`);
      console.log(`  Frequency: ${config.scrapeSettings.runFrequency}`);
      console.log(`  Priority: ${config.scrapeSettings.priority}`);
      console.log(`  Active sites: ${enabledSites.join(', ') || 'none'}`);
      console.log(`  Price range: ${config.filters.priceRange.min} - ${config.filters.priceRange.max}`);
      console.log(`  Notifications: ${config.notifications.enabled ? 'enabled' : 'disabled'}`);
    });
  }

  getEnabledSearches() {
    return Object.entries(this.searchesConfig.searches)
      .filter(([_, config]) => config.scrapeSettings.enabled)
      .map(([searchName, config]) => ({ searchName, config }));
  }

  getSearchConfig(searchName) {
    return this.searchesConfig.searches[searchName];
  }

  getSiteConfig(siteConfigName) {
    return this.siteConfigs.get(siteConfigName);
  }

  async runSearch(searchName, siteName = null) {
    const searchConfig = this.getSearchConfig(searchName);
    if (!searchConfig) {
      throw new Error(`Search "${searchName}" not found`);
    }

    if (!searchConfig.scrapeSettings.enabled) {
      console.log(`Search "${searchName}" is disabled, skipping...`);
      return { results: [], skipped: true };
    }

    console.log(`\n=== Running search: ${searchName} ===`);
    console.log(`Description: ${searchConfig.description}`);

    const allResults = [];
    const sitesToRun = siteName ? 
      [[siteName, searchConfig.sites[siteName]]]
      : 
      Object.entries(searchConfig.sites).filter(([_, config]) => config.enabled);

    for (const [currentSiteName, siteSearchConfig] of sitesToRun) {
      if (!siteSearchConfig.enabled) {
        console.log(`Site ${currentSiteName} is disabled for search "${searchName}", skipping...`);
        continue;
      }

      try {
        console.log(`\n--- Scraping ${currentSiteName} for ${searchName} ---`);
        
        let siteConfig = this.getSiteConfig(siteSearchConfig.siteConfig);
        if (!siteConfig) {
          console.error(`Site configuration "${siteSearchConfig.siteConfig}" not found`);
          continue;
        }

        // Merge credentials into site config
        if (this.config.sites && this.config.sites[currentSiteName]) {
          siteConfig = _.merge(siteConfig, { authentication: { credentials: this.config.sites[currentSiteName] } });
        }

        // Create a dynamic search configuration for this site
        const dynamicSearchConfig = this.createDynamicSearchConfig(
          searchConfig, 
          siteSearchConfig, 
          siteConfig
        );

        // Update the site config with the dynamic search
        const updatedSiteConfig = { ...siteConfig };
        updatedSiteConfig.searchConfig = {
          [siteSearchConfig.searchKey]: dynamicSearchConfig
        };

        // Run the scrape using the new modular engine
        const engine = new ModularScrapingEngine(this.config);
        
        const results = await engine.scrapeUrl(
          siteSearchConfig.searchUrl,
          updatedSiteConfig,
          siteSearchConfig.searchKey,
          searchConfig.scrapeSettings.maxListingsPerSite
        );

        // Apply search-level filters
        const filteredResults = this.applySearchFilters(results, searchConfig.filters);
        
        // Add search metadata
        filteredResults.forEach(result => {
          result.searchName = searchName;
          result.siteName = currentSiteName;
        });

        allResults.push(...filteredResults);

        // Export to CSV
        await this.exportResults(searchName, currentSiteName, filteredResults);

        // Process notifications
        if (searchConfig.notifications.enabled && filteredResults.length > 0) {
          await this.processNotifications(searchName, currentSiteName, searchConfig.notifications, filteredResults);
        }

        console.log(`Completed ${currentSiteName}: ${filteredResults.length} results`);

      } catch (error) {
        console.error(`Error scraping ${currentSiteName} for ${searchName}:`, error.message);
      }
    }

    return { 
      results: allResults, 
      searchName,
      totalResults: allResults.length,
      skipped: false
    };
  }

   createDynamicSearchConfig(searchConfig, siteSearchConfig, siteConfig) {
    // Get the specific search configuration from the site config using the searchKey
    const baseConfig = siteConfig.searchConfig[siteSearchConfig.searchKey];
    
    if (!baseConfig) {
      // Fallback to first available config if specific key not found
      const fallbackKey = Object.keys(siteConfig.searchConfig)[0];
      console.warn(`Search key "${siteSearchConfig.searchKey}" not found in site config, using fallback: ${fallbackKey}`);
      const fallbackConfig = siteConfig.searchConfig[fallbackKey];
      
      return {
        url: siteSearchConfig.searchUrl,
        selectors: fallbackConfig.selectors,
        dataFields: fallbackConfig.dataFields,
        detailedScraping: fallbackConfig.detailedScraping,
        pagination: fallbackConfig.pagination,
        initialSearchParams: fallbackConfig.initialSearchParams,
        urlModifiers: fallbackConfig.urlModifiers,
        filters: {
          priceRange: searchConfig.filters.priceRange,
          keywords: searchConfig.filters.keywords
        }
      };
    }

    // Create a new search config with the custom URL and filters
    return {
      url: siteSearchConfig.searchUrl,
      selectors: baseConfig.selectors,
      dataFields: baseConfig.dataFields,
      detailedScraping: baseConfig.detailedScraping,
      pagination: baseConfig.pagination,
      initialSearchParams: baseConfig.initialSearchParams,
      urlModifiers: baseConfig.urlModifiers,
      filters: {
        priceRange: searchConfig.filters.priceRange,
        keywords: searchConfig.filters.keywords
      }
    };
  }

  applySearchFilters(results, filters) {
    return results.filter(item => {
      // Price range filter
      if (filters.priceRange && item.price !== null && item.price !== undefined) {
        if (item.price < filters.priceRange.min || item.price > filters.priceRange.max) {
          return false;
        }
      }

      // Keyword filters
      if (filters.keywords) {
        const title = (item.title || '').toLowerCase();
        
        // Check include keywords
        if (filters.keywords.include && filters.keywords.include.length > 0) {
          const hasIncludeKeyword = filters.keywords.include.some(keyword => 
            title.includes(keyword.toLowerCase())
          );
          if (!hasIncludeKeyword) return false;
        }

        // Check exclude keywords
        if (filters.keywords.exclude && filters.keywords.exclude.length > 0) {
          const hasExcludeKeyword = filters.keywords.exclude.some(keyword => 
            title.includes(keyword.toLowerCase())
          );
          if (hasExcludeKeyword) return false;
        }
      }

      // Exclude "wanted" listings
      if (filters.excludeWanted) {
        const title = (item.title || '').toLowerCase();
        if (title.includes('wanted') || title.includes('looking for') || title.includes('wtb')) {
          return false;
        }
      }

      return true;
    });
  }

  async exportResults(searchName, siteName, results) {
    if (results.length === 0) return;

    const timestamp = new Date().toISOString();
    const filename = this.searchesConfig.globalSettings.csvFormat.filenameTemplate
      .replace('{{searchName}}', searchName.replace(/\s+/g, '_').toLowerCase())
      .replace('{{siteName}}', siteName)
      .replace('{{timestamp}}', timestamp);

    const outputPath = path.join(
      this.searchesConfig.globalSettings.outputDirectory,
      filename
    );

    const exporter = new CsvExporter({
      output: {
        directory: this.searchesConfig.globalSettings.outputDirectory,
        timestampFormat: 'YYYY-MM-DD_HH-mm-ss',
        csvFilename: filename
      }
    });
    await exporter.exportToCsv(results, filename);
    
    console.log(`Results exported to: ${outputPath}`);
  }

  async processNotifications(searchName, siteName, notificationConfig, results) {
    try {
      const notifier = new EmailNotifier(this.config);
      
      // Process different notification triggers
      const notifications = [];

      // New listings
      if (notificationConfig.triggers.newListing) {
        const newListings = results.filter(r => r.isNew);
        if (newListings.length > 0) {
          notifications.push({
            trigger: 'New Listing',
            count: newListings.length,
            listings: newListings.slice(0, 5) // Limit to first 5
          });
        }
      }

      // Keyword matches
      if (notificationConfig.triggers.keywordMatch && notificationConfig.triggers.keywordMatch.length > 0) {
        const keywordMatches = results.filter(result => {
          const title = (result.title || '').toLowerCase();
          return notificationConfig.triggers.keywordMatch.some(keyword => 
            title.includes(keyword.toLowerCase())
          );
        });

        if (keywordMatches.length > 0) {
          notifications.push({
            trigger: 'Keyword Match',
            count: keywordMatches.length,
            listings: keywordMatches.slice(0, 3)
          });
        }
      }

      // Send notifications (pass siteName instead of searchName to populate {siteName} template)
      for (const notification of notifications) {
        await notifier.sendNotification(siteName, notification, notificationConfig);
      }

    } catch (error) {
      console.error('Error processing notifications:', error.message);
    }
  }

  async runAllEnabledSearches() {
    const enabledSearches = this.getEnabledSearches();
    
    if (enabledSearches.length === 0) {
      console.log('No enabled searches found');
      return [];
    }

    console.log(`Running ${enabledSearches.length} enabled searches...`);
    
    const allResults = [];
    for (const { searchName } of enabledSearches) {
      try {
        const result = await this.runSearch(searchName);
        if (!result.skipped) {
          allResults.push(result);
        }
      } catch (error) {
        console.error(`Error running search "${searchName}":`, error.message);
      }
    }

    return allResults;
  }

  // Utility method to add a new search programmatically
  async addSearch(searchName, searchConfig) {
    this.searchesConfig.searches[searchName] = searchConfig;
    
    // Save back to file
    const searchesPath = path.join(__dirname, '../../config/searches.json');
    await fs.writeJson(searchesPath, this.searchesConfig, { spaces: 2 });
    
    console.log(`Added new search: ${searchName}`);
  }

  // Utility method to update search configuration
  async updateSearch(searchName, updates) {
    if (!this.searchesConfig.searches[searchName]) {
      throw new Error(`Search "${searchName}" not found`);
    }

    // Deep merge the updates
    this.searchesConfig.searches[searchName] = {
      ...this.searchesConfig.searches[searchName],
      ...updates
    };

    // Save back to file
    const searchesPath = path.join(__dirname, '../../config/searches.json');
    await fs.writeJson(searchesPath, this.searchesConfig, { spaces: 2 });
    
    console.log(`Updated search: ${searchName}`);
  }
}

module.exports = SearchManager;
