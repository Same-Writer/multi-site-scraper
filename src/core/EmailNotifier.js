const nodemailer = require('nodemailer');
const fs = require('fs-extra');
const path = require('path');

class EmailNotifier {
  constructor(config) {
    this.config = config;
    this.transporter = null;
  }

  async initialize() {
    if (!this.config.email.enabled) {
      console.log('Email notifications are disabled');
      return;
    }

    try {
      // Create transporter
      this.transporter = nodemailer.createTransporter({
        host: this.config.email.smtp.host,
        port: this.config.email.smtp.port,
        secure: this.config.email.smtp.secure,
        auth: {
          user: this.config.email.auth.user,
          pass: this.config.email.auth.pass
        }
      });

      // Verify connection
      await this.transporter.verify();
      console.log('Email transporter initialized successfully');
    } catch (error) {
      console.error('Failed to initialize email transporter:', error.message);
      this.transporter = null;
    }
  }

  async sendNotification(searchName, notification, subject) {
    // PLACEHOLDER IMPLEMENTATION
    console.log('\n=== EMAIL NOTIFICATION (PLACEHOLDER) ===');
    console.log(`Search: ${searchName}`);
    console.log(`Trigger: ${notification.trigger}`);
    console.log(`New matches found: ${notification.count}`);
    
    if (notification.listings && notification.listings.length > 0) {
      console.log('\nNew listings:');
      notification.listings.forEach((match, index) => {
        console.log(`${index + 1}. ${match.title || 'No title'}`);
        console.log(`   Price: ${match.price ? '$' + match.price : 'Not specified'}`);
        console.log(`   Location: ${match.location || 'Not specified'}`);
        console.log(`   URL: ${match.url || 'No URL'}`);
        console.log('');
      });
    }
    
    console.log('=== END EMAIL NOTIFICATION ===\n');

    // If email is actually enabled and configured, send real email
    if (this.config && this.config.email && this.config.email.enabled && this.transporter) {
      try {
        await this.sendRealEmail(notification.listings, searchName, subject);
      } catch (error) {
        console.error('Failed to send email notification:', error.message);
      }
    }
  }

  async sendRealEmail(newMatches, siteName) {
    if (!this.transporter) {
      console.log('Email transporter not available');
      return;
    }

    const subject = this.config.email.subject.replace('{siteName}', siteName);
    const htmlContent = await this.generateEmailContent(newMatches, siteName);

    const mailOptions = {
      from: this.config.email.from,
      to: this.config.email.to,
      subject: subject,
      html: htmlContent
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email notification sent successfully:', info.messageId);
    } catch (error) {
      console.error('Error sending email:', error.message);
      throw error;
    }
  }

  async generateEmailContent(matches, siteName) {
    const template = await this.loadEmailTemplate();
    
    let matchesHtml = '';
    matches.forEach(match => {
      matchesHtml += `
        <div style="border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px;">
          <h3 style="margin: 0 0 10px 0; color: #333;">
            <a href="${match.url || '#'}" style="text-decoration: none; color: #0066cc;">
              ${match.title || 'No title'}
            </a>
          </h3>
          <p style="margin: 5px 0; font-size: 16px; font-weight: bold; color: #009900;">
            Price: ${match.price ? '$' + match.price.toLocaleString() : 'Not specified'}
          </p>
          <p style="margin: 5px 0; color: #666;">
            Location: ${match.location || 'Not specified'}
          </p>
          <p style="margin: 5px 0; color: #666; font-size: 12px;">
            Listed: ${match.date || 'Unknown date'}
          </p>
          ${match.imageUrl ? `<img src="${match.imageUrl}" alt="Listing image" style="max-width: 200px; height: auto; margin-top: 10px;">` : ''}
        </div>
      `;
    });

    return template
      .replace('{siteName}', siteName)
      .replace('{matchCount}', matches.length)
      .replace('{matches}', matchesHtml)
      .replace('{timestamp}', new Date().toLocaleString());
  }

  async loadEmailTemplate() {
    const templatePath = path.join(__dirname, '../templates/email-notification.html');
    
    try {
      const templateExists = await fs.pathExists(templatePath);
      if (templateExists) {
        return await fs.readFile(templatePath, 'utf8');
      }
    } catch (error) {
      console.warn('Could not load email template, using default');
    }

    // Default template
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Matches Found - {siteName}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #0066cc; border-bottom: 2px solid #0066cc; padding-bottom: 10px;">
          New Matches Found on {siteName}
        </h1>
        
        <p style="font-size: 16px; margin: 20px 0;">
          We found <strong>{matchCount}</strong> new listing(s) that match your criteria:
        </p>
        
        <div style="margin: 20px 0;">
          {matches}
        </div>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #666; text-align: center;">
          This notification was generated on {timestamp}<br>
          Workarea UI Scraper Framework
        </p>
      </body>
      </html>
    `;
  }

  async testEmailConfiguration() {
    if (!this.config.email.enabled) {
      console.log('Email is disabled - skipping test');
      return false;
    }

    if (!this.transporter) {
      console.log('Email transporter not initialized');
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('Email configuration test passed');
      return true;
    } catch (error) {
      console.error('Email configuration test failed:', error.message);
      return false;
    }
  }

  // Method to send test email
  async sendTestEmail() {
    const testMatches = [
      {
        title: 'Test BMW Z3 Listing',
        price: 15000,
        location: 'San Francisco',
        date: new Date().toISOString(),
        url: 'https://example.com/test-listing'
      }
    ];

    await this.sendNotification(testMatches, 'Test Site');
  }
}

module.exports = EmailNotifier;
