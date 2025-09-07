const SearchManager = require('./core/SearchManager');
const path = require('path');

async function testMockScraper() {
  console.log('Testing Mock Scraper for Notification Logic...');
  
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
    
    // Run a search using the mock scraper
    console.log('\n--- Running BMW Z3 search with Mock Scraper ---');
    const results = await searchManager.runSearch('BMW Z3', 'mock_scraper');
    
    console.log('\n--- Mock Scraper Test Results ---');
    console.log(`Total results: ${results.results.length}`);
    console.log(`Search name: ${results.searchName}`);
    console.log(`Skipped: ${results.skipped}`);
    
    // Display first few results
    console.log('\n--- Sample Results ---');
    results.results.slice(0, 3).forEach((result, index) => {
      console.log(`${index + 1}. ${result.title} - $${result.price}`);
      console.log(`   Location: ${result.location}`);
      console.log(`   URL: ${result.url}`);
      console.log(`   New: ${result.isNew}, Price Drop: ${result.hasPriceDrop}, Keyword Match: ${result.isKeywordMatch}`);
      console.log('');
    });
    
    console.log('Mock scraper test completed successfully!');
    
  } catch (error) {
    console.error('Error testing mock scraper:', error.message);
    console.error(error.stack);
 }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testMockScraper();
}

module.exports = testMockScraper;
