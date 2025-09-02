const SearchManager = require('./core/SearchManager');
const ContinuousScheduler = require('./core/ContinuousScheduler');
const Logger = require('./core/Logger');
const config = require('../config/default.json');
const EmailNotifier = require('./core/EmailNotifier');

// Global logger instance
let logger = null;

async function main() {
  try {
    // Initialize logger first
    logger = new Logger(config.logging);
    logger.info('Initializing Workarea UI Scraper...');
    
    console.log('Initializing Workarea UI Scraper...');

    // Check for test-email command first
    const args = process.argv.slice(2);
    if (args[0] === 'test-email') {
      const recipient = args[1];
      if (!recipient) {
        console.error('Please provide a recipient email address for the test.');
        process.exit(1);
      }

      console.log(`Sending test email to ${recipient}...`);
      const emailNotifier = new EmailNotifier(config);
      await emailNotifier.initialize();
      await emailNotifier.sendTestEmail(recipient);
      return; // Exit after sending test email
    }
    
    // Check for continuous mode
    if (args[0] === 'continuous') {
      console.log('Starting continuous mode scheduler...');
      const scheduler = new ContinuousScheduler(config);
      await scheduler.start();
      return; // Exit after starting scheduler
    }
    
    // Initialize the search manager
    const searchManager = new SearchManager();
    await searchManager.loadConfigurations();
    
    // Pass logger to search manager
    searchManager.setLogger(logger);
    
    logger.info('Workarea UI Scraper initialized successfully');
    console.log('Workarea UI Scraper initialized successfully');
    
    if (args.length > 0) {
      const searchName = args[0];
      const siteName = args[1] || null; // Optional site filter
      
      console.log(`\n=== Running specific search: ${searchName} ${siteName ? `(${siteName} only)` : ''} ===`);
      
      try {
        const result = await searchManager.runSearch(searchName, siteName);
        
        if (result.skipped) {
          console.log(`Search "${searchName}" was skipped (disabled)`);
        } else {
          console.log(`\n=== Search completed: ${result.totalResults} total results ===`);
          
          // Show sample results
          if (result.results.length > 0) {
            console.log('\nSample results:');
            result.results.slice(0, 3).forEach((item, index) => {
              console.log(`\n${index + 1}. ${item.title}`);
              console.log(`   Price: ${item.price || 'Not specified'}`);
              console.log(`   Location: ${item.location || 'Not specified'}`);
              console.log(`   URL: ${item.url}`);
            });
          }
        }
      } catch (error) {
        console.error(`Error running search "${searchName}":`, error.message);
        process.exit(1);
      }
    } else {
      // Run all enabled searches
      console.log('\n=== Running all enabled searches ===');
      
      const results = await searchManager.runAllEnabledSearches();
      
      if (results.length === 0) {
        console.log('No searches were run (all disabled or none configured)');
      } else {
        console.log(`\n=== All searches completed ===`);
        
        let totalResults = 0;
        results.forEach(result => {
          console.log(`${result.searchName}: ${result.totalResults} results`);
          totalResults += result.totalResults;
        });
        
        console.log(`\nGrand total: ${totalResults} results across ${results.length} searches`);
      }
    }

    console.log('\nScraping completed successfully!');
    logger.info('Scraping completed successfully');
    
    // Finalize logger and display path
    if (logger) {
      logger.finalize();
      logger.displayLogPathOnExit();
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
    if (logger) {
      logger.error('Fatal error occurred', { error: error.message, stack: error.stack });
      logger.finalize();
      logger.displayLogPathOnExit();
    }
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  if (logger) {
    logger.info('Received SIGINT, shutting down gracefully');
    logger.finalize();
    logger.displayLogPathOnExit();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  if (logger) {
    logger.info('Received SIGTERM, shutting down gracefully');
    logger.finalize();
    logger.displayLogPathOnExit();
  }
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (logger) {
    logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
    logger.finalize();
    logger.displayLogPathOnExit();
  }
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (logger) {
    logger.error('Unhandled Promise Rejection', { reason: reason.toString(), promise: promise.toString() });
    logger.finalize();
    logger.displayLogPathOnExit();
  }
  process.exit(1);
});

// Run the application
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { main };
