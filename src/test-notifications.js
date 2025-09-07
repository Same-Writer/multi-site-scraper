const SearchManager = require('./core/SearchManager');
const fs = require('fs-extra');
const path = require('path');

async function testNotificationTriggers() {
  console.log('Testing Notification Triggers with Mock Scraper...');
  
  try {
    const searchManager = new SearchManager();
    
    // Wait a moment for configurations to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if configurations loaded properly
    if (!searchManager.searchesConfig) {
      console.error('Searches configuration not loaded properly');
      return;
    }
    
    console.log('Available searches:', Object.keys(searchManager.searchesConfig.searches));
    
    // Test 1: New listings trigger
    console.log('\n=== Test 1: New Listings Trigger ===');
    const results1 = await searchManager.runSearch('BMW Z3', 'mock_scraper');
    console.log(`Generated ${results1.results.length} listings with new listing flags`);
    
    // Show how many listings have the isNew flag
    const newItems = results1.results.filter(item => item.isNew);
    console.log(`Listings marked as new: ${newItems.length}`);
    
    // Test 2: Price drop trigger
    console.log('\n=== Test 2: Price Drop Trigger ===');
    // For testing purposes, we'll simulate that some items have price drop changes
    // In a real scenario, these would be detected by the ChangeDetector
    const priceDropItems = results1.results.filter(item => item.hasPriceDrop);
    console.log(`Listings flagged for price drops: ${priceDropItems.length}`);
    priceDropItems.slice(0, 2).forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.title} - $${item.price}`);
    });
    
    // Also show items that have price changes (what the notification system actually looks for)
    const itemsWithPriceChanges = results1.results.filter(item => 
      item.changes && item.changes.some(change => 
        change.field && change.field.toLowerCase().includes('price')
      )
    );
    console.log(`Listings with actual price changes detected: ${itemsWithPriceChanges.length}`);
    
    // Test 3: Keyword match trigger
    console.log('\n=== Test 3: Keyword Match Trigger ===');
    const keywordMatchItems = results1.results.filter(item => item.isKeywordMatch);
    console.log(`Listings with keyword matches: ${keywordMatchItems.length}`);
    keywordMatchItems.slice(0, 2).forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.title} - $${item.price}`);
    });
    
    // Show the notification configuration for BMW Z3
    console.log('\n=== BMW Z3 Notification Configuration ===');
    const bmwConfig = searchManager.getSearchConfig('BMW Z3');
    if (bmwConfig && bmwConfig.notifications) {
      console.log('Notifications enabled:', bmwConfig.notifications.enabled);
      console.log('Triggers:');
      Object.entries(bmwConfig.notifications.triggers).forEach(([trigger, value]) => {
        console.log(`  ${trigger}: ${JSON.stringify(value)}`);
      });
    }
    
    // Show the generated CSV file
    console.log('\n=== Generated CSV File ===');
    const outputDir = './output';
    const csvFiles = await fs.readdir(outputDir);
    const mockCsvFiles = csvFiles.filter(file => file.includes('mock_scraper')).sort();
    if (mockCsvFiles.length > 0) {
      console.log(`Latest mock scraper CSV: ${mockCsvFiles[mockCsvFiles.length - 1]}`);
    }
    
    console.log('\nNotification trigger tests completed successfully!');
    
  } catch (error) {
    console.error('Error testing notification triggers:', error.message);
    console.error(error.stack);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testNotificationTriggers();
}

module.exports = testNotificationTriggers;
