const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const moment = require('moment');

class ChangeDetector {
  constructor(config) {
    this.config = config;
    this.storageFile = config.changeDetection?.storageFile || 'data/change_history.json';
    this.enabled = config.changeDetection?.enabled || false;
    this.notifyOnChanges = config.changeDetection?.notifyOnChanges || [];
    this.history = {};
    
    this.ensureDataDirectory();
    this.loadHistory();
  }

  async ensureDataDirectory() {
    const dataDir = path.dirname(this.storageFile);
    await fs.ensureDir(dataDir);
  }

  async loadHistory() {
    try {
      if (await fs.pathExists(this.storageFile)) {
        this.history = await fs.readJson(this.storageFile);
      }
    } catch (error) {
      console.warn(`Warning: Could not load change history: ${error.message}`);
      this.history = {};
    }
  }

  async saveHistory() {
    try {
      await fs.writeJson(this.storageFile, this.history, { spaces: 2 });
    } catch (error) {
      console.error(`Error saving change history: ${error.message}`);
    }
  }

  generateHash(content) {
    if (Array.isArray(content)) {
      content = content.join('|');
    }
    return crypto.createHash('md5').update(String(content || '')).digest('hex');
  }

  generateListingId(listing) {
    // Use URL or posting ID as unique identifier
    return listing.url || listing.postingId || listing.title;
  }

  detectChanges(currentListing, searchKey) {
    if (!this.enabled) {
      return { isNew: true, changes: [] };
    }

    const listingId = this.generateListingId(currentListing);
    const historyKey = `${searchKey}_${listingId}`;
    
    const previousListing = this.history[historyKey];
    
    if (!previousListing) {
      // New listing
      this.history[historyKey] = {
        ...currentListing,
        firstSeen: moment().toISOString(),
        lastUpdated: moment().toISOString(),
        changeCount: 0
      };
      return { isNew: true, changes: [] };
    }

    // Check for changes
    const changes = [];
    const trackFields = currentListing.detailedScraping?.changeDetection?.trackFields || 
                       ['title', 'price', 'description', 'images'];

    for (const field of trackFields) {
      const currentValue = currentListing[field];
      const previousValue = previousListing[field];

      if (this.hasFieldChanged(currentValue, previousValue, field)) {
        changes.push({
          field,
          previousValue,
          currentValue,
          timestamp: moment().toISOString()
        });
      }
    }

    if (changes.length > 0) {
      // Update history with changes
      this.history[historyKey] = {
        ...currentListing,
        firstSeen: previousListing.firstSeen,
        lastUpdated: moment().toISOString(),
        changeCount: (previousListing.changeCount || 0) + 1,
        changes: [...(previousListing.changes || []), ...changes]
      };

      return { isNew: false, changes, hasChanges: true };
    }

    // No changes, just update last seen
    this.history[historyKey].lastSeen = moment().toISOString();
    
    return { isNew: false, changes: [], hasChanges: false };
  }

  hasFieldChanged(currentValue, previousValue, fieldName) {
    // Handle arrays (like images)
    if (Array.isArray(currentValue) && Array.isArray(previousValue)) {
      return this.generateHash(currentValue) !== this.generateHash(previousValue);
    }

    // Handle strings and numbers
    const current = String(currentValue || '').trim();
    const previous = String(previousValue || '').trim();

    // For price fields, normalize the comparison
    if (fieldName.toLowerCase().includes('price')) {
      const currentPrice = this.extractNumericPrice(current);
      const previousPrice = this.extractNumericPrice(previous);
      return currentPrice !== previousPrice;
    }

    return current !== previous;
  }

  extractNumericPrice(priceString) {
    if (!priceString) return 0;
    const match = priceString.match(/[\d,]+/);
    return match ? parseInt(match[0].replace(/,/g, '')) : 0;
  }

  async processListings(listings, searchKey, siteConfig) {
    const results = {
      newListings: [],
      changedListings: [],
      unchangedListings: []
    };

    for (const listing of listings) {
      const changeResult = this.detectChanges(listing, searchKey);
      
      if (changeResult.isNew) {
        results.newListings.push(listing);
      } else if (changeResult.hasChanges) {
        results.changedListings.push({
          ...listing,
          changes: changeResult.changes
        });
      } else {
        results.unchangedListings.push(listing);
      }
    }

    await this.saveHistory();
    return results;
  }

  getChangesSummary(searchKey) {
    const summary = {
      totalListings: 0,
      newListings: 0,
      changedListings: 0,
      recentChanges: []
    };

    const cutoffTime = moment().subtract(24, 'hours');

    for (const [key, listing] of Object.entries(this.history)) {
      if (!key.startsWith(searchKey)) continue;
      
      summary.totalListings++;
      
      if (moment(listing.firstSeen).isAfter(cutoffTime)) {
        summary.newListings++;
      }
      
      if (listing.changes && listing.changes.length > 0) {
        const recentChanges = listing.changes.filter(change => 
          moment(change.timestamp).isAfter(cutoffTime)
        );
        
        if (recentChanges.length > 0) {
          summary.changedListings++;
          summary.recentChanges.push({
            listingId: this.generateListingId(listing),
            title: listing.title || listing.detailedTitle,
            url: listing.url,
            changes: recentChanges
          });
        }
      }
    }

    return summary;
  }

  async cleanup(daysToKeep = 30) {
    const cutoffTime = moment().subtract(daysToKeep, 'days');
    let removedCount = 0;

    for (const [key, listing] of Object.entries(this.history)) {
      const lastSeen = listing.lastSeen || listing.lastUpdated || listing.firstSeen;
      if (moment(lastSeen).isBefore(cutoffTime)) {
        delete this.history[key];
        removedCount++;
      }
    }

    if (removedCount > 0) {
      await this.saveHistory();
      console.log(`Cleaned up ${removedCount} old listing records`);
    }

    return removedCount;
  }
}

module.exports = ChangeDetector;
