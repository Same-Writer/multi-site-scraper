const express = require('express');
const cors = require('cors');
const path = require('path');
const SearchManager = require('./core/SearchManager');
const ContinuousScheduler = require('./core/ContinuousScheduler');
const fs = require('fs-extra');
const config = require('../config/default.json');

class WebUIServer {
  constructor() {
    this.app = express();
    this.searchManager = new SearchManager();
    this.scheduler = null;
    this.setupMiddleware();
    this.setupRoutes();
  }

 setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'webui/dist')));
  }

  setupRoutes() {
    // API Routes
    this.app.get('/api/searches', (req, res) => this.getSearches(req, res));
    this.app.get('/api/searches/:name', (req, res) => this.getSearch(req, res));
    this.app.post('/api/searches', (req, res) => this.createSearch(req, res));
    this.app.put('/api/searches/:name', (req, res) => this.updateSearch(req, res));
    this.app.delete('/api/searches/:name', (req, res) => this.deleteSearch(req, res));
    
    this.app.get('/api/sites', (req, res) => this.getSites(req, res));
    this.app.get('/api/sites/:name', (req, res) => this.getSite(req, res));
    this.app.put('/api/sites/:name', (req, res) => this.updateSite(req, res));
    
    this.app.post('/api/run/search/:name', (req, res) => this.runSearch(req, res));
    this.app.post('/api/run/all', (req, res) => this.runAllSearches(req, res));
    
    this.app.get('/api/scheduler/status', (req, res) => this.getSchedulerStatus(req, res));
    this.app.post('/api/scheduler/start', (req, res) => this.startScheduler(req, res));
    this.app.post('/api/scheduler/stop', (req, res) => this.stopScheduler(req, res));
    
    this.app.get('/api/config', (req, res) => this.getConfig(req, res));
    this.app.put('/api/config', (req, res) => this.updateConfig(req, res));
    
    // Serve frontend app
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'webui/dist/index.html'));
    });
  }

  async initialize() {
    try {
      await this.searchManager.loadConfigurations();
      console.log('SearchManager initialized');
    } catch (error) {
      console.error('Error initializing SearchManager:', error);
    }
  }

  // Search Management API
  async getSearches(req, res) {
    try {
      const searchesConfig = require('../config/searches.json');
      res.json(searchesConfig.searches);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getSearch(req, res) {
    try {
      const searchesConfig = require('../config/searches.json');
      const searchName = req.params.name;
      const search = searchesConfig.searches[searchName];
      
      if (!search) {
        return res.status(404).json({ error: 'Search not found' });
      }
      
      res.json(search);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async createSearch(req, res) {
    try {
      const { name, config } = req.body;
      await this.searchManager.addSearch(name, config);
      res.status(201).json({ message: 'Search created successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateSearch(req, res) {
    try {
      const searchName = req.params.name;
      const updates = req.body;
      await this.searchManager.updateSearch(searchName, updates);
      res.json({ message: 'Search updated successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async deleteSearch(req, res) {
    try {
      const searchName = req.params.name;
      const searchesConfig = require('../config/searches.json');
      
      if (!searchesConfig.searches[searchName]) {
        return res.status(404).json({ error: 'Search not found' });
      }
      
      delete searchesConfig.searches[searchName];
      
      const searchesPath = path.join(__dirname, '../config/searches.json');
      await fs.writeJson(searchesPath, searchesConfig, { spaces: 2 });
      
      res.json({ message: 'Search deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Site Configuration API
  async getSites(req, res) {
    try {
      const sitesDir = path.join(__dirname, '../sites');
      const siteFiles = await fs.readdir(sitesDir);
      const sites = {};
      
      for (const file of siteFiles) {
        if (file.endsWith('.json')) {
          const siteName = path.basename(file, '.json');
          const siteConfig = await fs.readJson(path.join(sitesDir, file));
          sites[siteName] = siteConfig;
        }
      }
      
      res.json(sites);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getSite(req, res) {
    try {
      const siteName = req.params.name;
      const sitePath = path.join(__dirname, `../sites/${siteName}.json`);
      
      if (!await fs.pathExists(sitePath)) {
        return res.status(404).json({ error: 'Site configuration not found' });
      }
      
      const siteConfig = await fs.readJson(sitePath);
      res.json(siteConfig);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateSite(req, res) {
    try {
      const siteName = req.params.name;
      const siteConfig = req.body;
      const sitePath = path.join(__dirname, `../sites/${siteName}.json`);
      
      await fs.writeJson(sitePath, siteConfig, { spaces: 2 });
      res.json({ message: 'Site configuration updated successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Execution API
  async runSearch(req, res) {
    try {
      const searchName = req.params.name;
      const siteName = req.query.site || null;
      
      const result = await this.searchManager.runSearch(searchName, siteName);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async runAllSearches(req, res) {
    try {
      const results = await this.searchManager.runAllEnabledSearches();
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Scheduler API
  async getSchedulerStatus(req, res) {
    try {
      if (this.scheduler) {
        const status = this.scheduler.getStatus();
        res.json(status);
      } else {
        res.json({ running: false, scheduledSearches: [], nextRuns: {} });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async startScheduler(req, res) {
    try {
      if (!this.scheduler) {
        this.scheduler = new ContinuousScheduler(config);
        await this.scheduler.start();
        res.json({ message: 'Scheduler started' });
      } else {
        res.json({ message: 'Scheduler is already running' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async stopScheduler(req, res) {
    try {
      if (this.scheduler) {
        this.scheduler.stop();
        this.scheduler = null;
        res.json({ message: 'Scheduler stopped' });
      } else {
        res.json({ message: 'Scheduler is not running' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Configuration API
  async getConfig(req, res) {
    try {
      const configPath = path.join(__dirname, '../config/default.json');
      const config = await fs.readJson(configPath);
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateConfig(req, res) {
    try {
      const newConfig = req.body;
      const configPath = path.join(__dirname, '../config/default.json');
      
      await fs.writeJson(configPath, newConfig, { spaces: 2 });
      res.json({ message: 'Configuration updated successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  start(port = 3000) {
    this.app.listen(port, () => {
      console.log(`Web UI server running at http://localhost:${port}`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is already in use, trying ${port + 1}...`);
        this.start(port + 1);
      } else {
        console.error('Server error:', err);
      }
    });
  }
}

module.exports = WebUIServer;
