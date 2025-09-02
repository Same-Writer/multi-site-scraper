import nodemailer from 'nodemailer';
import fs from 'fs-extra';
import path from 'path';

class EmailNotifier {
  constructor(config) {
    this.config = config;
    this.transporter = null;
    this.initialize();
  }

  async initialize() {
    if (!this.config.email.enabled) {
      console.log('Email notifications are disabled');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: this.config.email.smtp.host,
        port: this.config.email.smtp.port,
        secure: this.config.email.smtp.secure,
        auth: this.config.email.auth,
      });

      await this.transporter.verify();
      console.log('Email transporter initialized successfully');
    } catch (error) {
      console.error('Failed to initialize email transporter:', error.message);
      this.transporter = null;
    }
  }

  async sendNotification(searchName, notification, notificationConfig) {
    if (!this.config.email.enabled || !this.transporter) {
      console.log('Email notifications are disabled or transporter is not initialized.');
      return;
    }

    // Use recipients from credentials.json if available, otherwise fall back to config
    const to = notificationConfig.emailSettings.to || 
               this.config.email.recipients || 
               this.config.email.to || 
               [];
    
    if (!to || to.length === 0) {
      console.log(`No email recipients configured for search: ${searchName}`);
      return;
    }

    const subject = (notificationConfig.emailSettings.subject || 'New Matches Found - {searchName}')
      .replace('{searchName}', searchName)
      .replace('{trigger}', notification.trigger)
      .replace('{{trigger}}', notification.trigger)
      .replace('{{title}}', notification.listings[0]?.title || 'Multiple listings');

    try {
      await this.sendRealEmail(notification.listings, searchName, subject, to);
    } catch (error) {
      console.error(`Failed to send email notification for search "${searchName}":`, error.message);
    }
  }

  async sendRealEmail(newMatches, searchName, subject, to) {
    if (!this.transporter) {
      console.log('Email transporter not available');
      return;
    }

    const htmlContent = await this.generateEmailContent(newMatches, searchName);

    const mailOptions = {
      from: this.config.email.from,
      to: to.join(','),
      subject: subject,
      html: htmlContent,
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

  async sendTestEmail(recipient) {
    if (!this.config.email.enabled || !this.transporter) {
      console.log('Email notifications are disabled or transporter is not initialized.');
      return;
    }

    const testMatches = [
      {
        title: 'Test Listing: 2023 Awesome Car',
        price: 25000,
        location: 'Virtual City',
        date: new Date().toLocaleDateString(),
        url: '#',
        imageUrl: 'https://via.placeholder.com/200'
      },
      {
        title: 'Test Listing: Another Great Find',
        price: 12500,
        location: 'Digital Town',
        date: new Date().toLocaleDateString(),
        url: '#',
        imageUrl: 'https://via.placeholder.com/200'
      }
    ];

    const subject = 'Test Email from Scraper';
    
    try {
      await this.sendRealEmail(testMatches, 'Test Site', subject, [recipient]);
      console.log(`Test email sent successfully to ${recipient}`);
    } catch (error) {
      console.error(`Failed to send test email to ${recipient}:`, error.message);
    }
  }
}

export default EmailNotifier;
