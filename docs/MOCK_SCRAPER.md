# Mock Scraper for Notification Testing

## Overview

The Mock Scraper is a specialized scraper implementation designed for testing notification logic without relying on actual web scraping. It generates mock data with various characteristics that can trigger different types of notifications.

## Purpose

The Mock Scraper helps developers test and debug notification logic by:

1. Generating consistent, predictable test data
2. Simulating different notification triggers (new listings, price drops, keyword matches)
3. Avoiding the complexity and variability of real web scraping
4. Providing a controlled environment for testing email notifications

## Implementation Details

### File Structure

- `src/scrapers/MockScraper.js` - The main scraper implementation
- `sites/mock-scraper.json` - Site configuration file
- `config/searches.json` - Updated to include mock scraper as a site option

### Key Features

1. **No Authentication Required** - Simplifies testing by not requiring login credentials
2. **Configurable Mock Data** - Generates realistic mock listings with various attributes
3. **Notification Trigger Simulation** - Creates listings with flags for different notification types:
   - `isNew` - Simulates new listings
   - `hasPriceDrop` - Simulates price drops
   - `isKeywordMatch` - Simulates keyword matches

## Notification Triggers Testing

The mock scraper generates data that can test all configured notification triggers:

### New Listing Trigger
- 50% of generated listings are marked with `isNew: true`
- Triggers "New Listing" notifications when enabled

### Price Drop Trigger
- 33% of generated listings are marked with `hasPriceDrop: true`
- Simulates listings with reduced prices
- Tests both percentage and absolute amount triggers
- The ModularScrapingEngine adds special handling to ensure price drop notifications work consistently

### Keyword Match Trigger
- 25% of generated listings are marked with `isKeywordMatch: true`
- Contains keywords from the search configuration
- Tests keyword-based notifications

## Usage

### Running Tests

To test the mock scraper directly:

```bash
node src/test-mock-scraper.js
```

To test notification triggers specifically:

```bash
node src/test-notifications.js
```

### Running with Docker

To run the mock scraper with Docker:

```bash
docker-compose run --rm scraper node src/test-mock-scraper.js
```

### Configuration

The mock scraper is automatically configured in `config/searches.json` as a site option for the "BMW Z3" search. You can run it with:

```bash
node src/index.js "BMW Z3" mock_scraper
```

## Testing Different Scenarios

### Testing New Listings

The mock scraper generates listings with the `isNew` flag set on 50% of items, which will trigger new listing notifications when the "newListing" trigger is enabled.

### Testing Price Drops

33% of generated listings have the `hasPriceDrop` flag, simulating price reductions that can trigger price drop notifications based on percentage or absolute amount thresholds.

### Testing Keyword Matches

25% of generated listings have the `isKeywordMatch` flag and include keywords from the search configuration, triggering keyword match notifications.

## Customization

### Modifying Mock Data

You can customize the mock data by modifying the `generateMockListings` method in `src/scrapers/MockScraper.js`:

- Adjust the `titles` array to change listing titles
- Modify the `locations` array to change locations
- Change the probability of different flags by adjusting the modulo operations
- Modify price ranges and other attributes

### Adding New Notification Types

To test additional notification types, you can:

1. Add new flags to the generated mock listings
2. Modify the notification processing logic in `SearchManager.js`
3. Update the mock scraper to set the appropriate flags

## Debugging Notifications

### Checking Email Delivery

The system will log email message IDs when notifications are sent:

```
Email notification sent successfully: <message-id@gmail.com>
```

### Verifying CSV Output

Generated mock data is exported to CSV files in the `output/` directory with filenames following the pattern:
`{searchName}_mock_scraper_{timestamp}.csv`

### Reviewing Logs

Check the console output for detailed information about:
- Generated listings and their attributes
- Notification triggers that were activated
- Email sending status
- CSV export status

## Best Practices

1. **Use for Development Only** - The mock scraper is designed for testing and should not be used in production
2. **Verify Real Scrapers** - Always test with actual scrapers before deploying changes
3. **Check Notification Configuration** - Ensure notification triggers are properly configured in `config/searches.json`
4. **Test Edge Cases** - Modify the mock data to test edge cases like empty results or extreme values

## Troubleshooting

### No Email Notifications

If emails are not being sent:

1. Check that email credentials are properly configured in `config/credentials.json`
2. Verify that notifications are enabled in the search configuration
3. Confirm that the notification triggers are enabled
4. Check the email sending logs for error messages

### Missing CSV Output

If CSV files are not being generated:

1. Verify that the `output/` directory is writable
2. Check that the search configuration includes proper CSV export settings
3. Review the export logs for error messages

### Incorrect Mock Data

If the mock data doesn't match your testing needs:

1. Modify the `generateMockListings` method in `MockScraper.js`
2. Adjust the probability flags for different notification types
3. Customize the sample data arrays for more realistic testing
