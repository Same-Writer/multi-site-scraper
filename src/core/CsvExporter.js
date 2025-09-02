import { createObjectCsvWriter } from 'csv-writer';
import fs from 'fs-extra';
import path from 'path';
import moment from 'moment';

class CsvExporter {
  constructor(config) {
    this.config = config;
  }

  async exportToCsv(data, filename = null) {
    if (!data || data.length === 0) {
      console.log('No data to export');
      return null;
    }

    // Ensure output directory exists
    await fs.ensureDir(this.config.output.directory);

    // Generate filename if not provided
    if (!filename) {
      const timestamp = moment().format(this.config.output.timestampFormat);
      filename = this.config.output.csvFilename.replace('{timestamp}', timestamp);
    }

    const filePath = path.join(this.config.output.directory, filename);

    // Prepare data for CSV export (serialize complex fields)
    const processedData = data.map(item => this.processItemForCsv(item));

    // Determine headers from the first processed data item
    const headers = this.generateHeaders(processedData[0]);

    // Create CSV writer
    const csvWriter = createCsvWriter({
      path: filePath,
      header: headers
    });

    try {
      // Write data to CSV
      await csvWriter.writeRecords(processedData);
      console.log(`Successfully exported ${data.length} records to ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('Error writing CSV file:', error.message);
      throw error;
    }
  }

  processItemForCsv(item) {
    const processedItem = { ...item };

    // Handle array fields by converting them to strings
    const arrayFields = ['allImages', 'attributes', 'changes'];
    
    arrayFields.forEach(field => {
      if (processedItem[field] && Array.isArray(processedItem[field])) {
        if (field === 'changes') {
          // Special handling for changes array - create a readable summary
          processedItem[field] = processedItem[field].map(change => 
            `${change.field}: ${change.previousValue} → ${change.currentValue}`
          ).join('; ');
        } else {
          // For other arrays, join with semicolons
          processedItem[field] = processedItem[field].join('; ');
        }
      }
    });

    // Ensure all values are strings or null
    Object.keys(processedItem).forEach(key => {
      if (processedItem[key] === undefined) {
        processedItem[key] = null;
      } else if (typeof processedItem[key] === 'object' && processedItem[key] !== null) {
        processedItem[key] = JSON.stringify(processedItem[key]);
      }
    });

    return processedItem;
  }

  generateHeaders(sampleItem) {
    const headers = [];
    
    // Define preferred order for common fields including new detailed fields
    const preferredOrder = [
      'title',
      'detailedTitle',
      'price',
      'detailedPrice',
      'location',
      'mapLocation',
      'date',
      'postingDate',
      'postingId',
      'url',
      'imageUrl',
      'allImages',
      'description',
      'attributes',
      'replyEmail',
      'isNew',
      'isChanged',
      'changes',
      'scrapedAt',
      'source'
    ];

    // Add preferred fields first
    preferredOrder.forEach(field => {
      if (sampleItem.hasOwnProperty(field)) {
        headers.push({
          id: field,
          title: this.formatHeaderTitle(field)
        });
      }
    });

    // Add any remaining fields
    Object.keys(sampleItem).forEach(field => {
      if (!preferredOrder.includes(field)) {
        headers.push({
          id: field,
          title: this.formatHeaderTitle(field)
        });
      }
    });

    return headers;
  }

  formatHeaderTitle(field) {
    // Convert camelCase to Title Case
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  async appendToCsv(data, filePath) {
    if (!data || data.length === 0) {
      console.log('No data to append');
      return;
    }

    try {
      // Check if file exists
      const fileExists = await fs.pathExists(filePath);
      
      if (!fileExists) {
        // If file doesn't exist, create it
        return await this.exportToCsv(data, path.basename(filePath));
      }

      // Read existing CSV to get headers
      const existingContent = await fs.readFile(filePath, 'utf8');
      const lines = existingContent.split('\n');
      const headerLine = lines[0];
      
      // Generate CSV content for new data
      const headers = this.generateHeaders(data[0]);
      const csvWriter = createCsvWriter({
        path: filePath,
        header: headers,
        append: true
      });

      await csvWriter.writeRecords(data);
      console.log(`Successfully appended ${data.length} records to ${filePath}`);
      
    } catch (error) {
      console.error('Error appending to CSV file:', error.message);
      throw error;
    }
  }

  async readExistingData(filePath) {
    try {
      const fileExists = await fs.pathExists(filePath);
      if (!fileExists) {
        return [];
      }

      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      if (lines.length <= 1) {
        return []; // Only header or empty file
      }

      // Parse CSV manually (simple implementation)
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      const data = [];

      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCsvLine(lines[i]);
        if (values.length === headers.length) {
          const item = {};
          headers.forEach((header, index) => {
            item[this.headerToFieldName(header)] = values[index];
          });
          data.push(item);
        }
      }

      return data;
    } catch (error) {
      console.error('Error reading existing CSV data:', error.message);
      return [];
    }
  }

  parseCsvLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values.map(v => v.replace(/^"|"$/g, ''));
  }

  headerToFieldName(header) {
    // Convert "Title Case" back to camelCase
    return header
      .toLowerCase()
      .replace(/\s+(.)/g, (match, char) => char.toUpperCase());
  }

  async getUniqueRecords(newData, existingFilePath) {
    const existingData = await this.readExistingData(existingFilePath);
    
    if (existingData.length === 0) {
      return newData;
    }

    // Create a set of existing URLs for quick lookup
    const existingUrls = new Set(existingData.map(item => item.url).filter(Boolean));
    
    // Filter out duplicates based on URL
    const uniqueData = newData.filter(item => !existingUrls.has(item.url));
    
    console.log(`Found ${uniqueData.length} new unique records out of ${newData.length} total`);
    return uniqueData;
  }
}

export default CsvExporter;
