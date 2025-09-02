const SearchManager = require('./SearchManager');
const Logger = require('./Logger');
const moment = require('moment');

class ContinuousScheduler {
  constructor(config) {
    this.config = config;
    this.searchManager = new SearchManager();
    this.logger = new Logger(config.logging || {});
    this.scheduledTasks = new Map(); // Store scheduled task timers
    this.running = false;
    this.nextRunTimes = new Map(); // Track next run times for each search
  }

  /**
   * Convert frequency string to milliseconds
   * @param {string} frequency - Frequency string (e.g., 'hourly', 'daily')
   * @returns {number} Milliseconds
   */
  getFrequencyInMs(frequency) {
    const frequencyMap = {
      'every_30_minutes': 30 * 60 * 1000, // 30 minutes
      'hourly': 60 * 60 * 1000, // 1 hour
      'daily': 24 * 60 * 60 * 1000, // 24 hours
      'weekly': 7 * 24 * 60 * 60 * 1000 // 7 days
    };

    return frequencyMap[frequency] || 60 * 60 * 1000; // Default to 1 hour
  }

 /**
   * Schedule a search to run at its configured frequency
   * @param {string} searchName - Name of the search
   * @param {Object} searchConfig - Search configuration
   */
  scheduleSearch(searchName, searchConfig) {
    const frequency = searchConfig.scrapeSettings.runFrequency;
    const intervalMs = this.getFrequencyInMs(frequency);
    
    console.log(`Scheduling search "${searchName}" to run every ${intervalMs / 1000 / 60} minutes`);
    
    // Run the search immediately
    this.runSearch(searchName);
    
    // Schedule subsequent runs
    const task = setInterval(() => {
      this.runSearch(searchName);
    }, intervalMs);
    
    // Store the task and next run time
    this.scheduledTasks.set(searchName, task);
    const nextRun = moment().add(intervalMs, 'milliseconds');
    this.nextRunTimes.set(searchName, nextRun);
    
    console.log(`Search "${searchName}" scheduled. Next run: ${nextRun.format('YYYY-MM-DD HH:mm:ss')}`);
  }

  /**
   * Run a specific search
   * @param {string} searchName - Name of the search
   */
  async runSearch(searchName) {
    try {
      console.log(`\n=== Running scheduled search: ${searchName} ===`);
      console.log(`Time: ${new Date().toISOString()}`);
      
      // Run the search
      const result = await this.searchManager.runSearch(searchName);
      
      if (result.skipped) {
        console.log(`Search "${searchName}" was skipped (disabled)`);
      } else {
        console.log(`\n=== Search completed: ${result.totalResults} total results ===`);
      }
      
      // Note: We can't update next run time here because we don't have access to the search config
      // This is handled in the scheduleSearch method when setting up the interval
      
    } catch (error) {
      console.error(`Error running scheduled search "${searchName}":`, error.message);
      this.logger.error(`Error running scheduled search "${searchName}"`, { error: error.message, stack: error.stack });
    }
  }

  /**
   * Start the continuous scheduler
   */
  async start() {
    console.log('Starting continuous scheduler...');
    
    // Load configurations
    await this.searchManager.loadConfigurations();
    this.searchManager.setLogger(this.logger);
    
    // Get enabled searches
    const enabledSearches = this.searchManager.getEnabledSearches();
    
    if (enabledSearches.length === 0) {
      console.log('No enabled searches found. Exiting.');
      return;
    }
    
    console.log(`Found ${enabledSearches.length} enabled searches:`);
    enabledSearches.forEach(({ searchName, config }) => {
      console.log(`  - ${searchName} (${config.scrapeSettings.runFrequency})`);
    });
    
    // Schedule each enabled search
    enabledSearches.forEach(({ searchName, config }) => {
      this.scheduleSearch(searchName, config);
    });
    
    this.running = true;
    console.log('\nContinuous scheduler started. Press Ctrl+C to stop.');
    
    // Handle graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  /**
   * Stop the continuous scheduler
   */
  stop() {
    console.log('\nStopping continuous scheduler...');
    
    // Clear all scheduled tasks
    this.scheduledTasks.forEach((task, searchName) => {
      clearInterval(task);
      console.log(`Cancelled scheduled task for "${searchName}"`);
    });
    
    this.scheduledTasks.clear();
    this.nextRunTimes.clear();
    this.running = false;
    
    console.log('Continuous scheduler stopped.');
    
    // Finalize logger
    this.logger.finalize();
    this.logger.displayLogPathOnExit();
    
    process.exit(0);
  }

  /**
   * Get status of all scheduled searches
   * @returns {Object} Status information
   */
  getStatus() {
    const status = {
      running: this.running,
      scheduledSearches: [],
      nextRuns: {}
    };
    
    this.scheduledTasks.forEach((_, searchName) => {
      status.scheduledSearches.push(searchName);
    });
    
    this.nextRunTimes.forEach((nextRun, searchName) => {
      status.nextRuns[searchName] = nextRun.format('YYYY-MM-DD HH:mm:ss');
    });
    
    return status;
  }
}

module.exports = ContinuousScheduler;
