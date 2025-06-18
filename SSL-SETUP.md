# SSL Certificate Setup Guide

## Automatic SSL Setup

Use the enhanced FastNginx CLI with SSL support:

\`\`\`bash

# Setup domain with SSL in one command

sudo fastnginx --domain myapp.com --port 3000 --ssl --email admin@myapp.com

# Or use the complete setup script

sudo ./scripts/complete-setup.sh myapp.com 3000 admin@myapp.com
\`\`\`

## Manual SSL Setup

If you prefer to set up SSL manually:

### 1. Install Certbot

\`\`\`bash

# Ubuntu/Debian

sudo apt update
sudo apt install certbot python3-certbot-nginx

# CentOS/RHEL

sudo yum install certbot python3-certbot-nginx
\`\`\`

### 2. Get SSL Certificate

\`\`\`bash

# Basic SSL setup

sudo certbot --nginx -d yourdomain.com

# With www subdomain

sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Non-interactive (for scripts)

sudo certbot --nginx -d yourdomain.com --email your@email.com --agree-tos --non-interactive
\`\`\`

### 3. Test Auto-Renewal

\`\`\`bash

# Test renewal process

sudo certbot renew --dry-run

# Check renewal timer (systemd)

sudo systemctl status certbot.timer
\`\`\`

## DNS Configuration

### Required DNS Records

\`\`\`
Type Name Value TTL
A @ YOUR_SERVER_IP 300
A www YOUR_SERVER_IP 300
\`\`\`

### Check DNS Propagation

\`\`\`bash

# Check if DNS is pointing to your server

dig yourdomain.com +short
nslookup yourdomain.com

# Check from multiple locations

# Use online tools like whatsmydns.net

\`\`\`

## Complete Domain Setup Workflow

### 1. Prepare Your Server

\`\`\`bash

# Update system

sudo apt update && sudo apt upgrade -y

# Install required packages

sudo apt install nginx nodejs npm curl -y

# Start services

sudo systemctl start nginx
sudo systemctl enable nginx
\`\`\`

### 2. Deploy Your Application

\`\`\`bash

# Example: Deploy Node.js app

git clone your-app-repo
cd your-app
npm install
npm start # or use PM2: pm2 start app.js
\`\`\`

### 3. Configure DNS

- Go to your domain registrar (GoDaddy, Namecheap, etc.)
- Add A record pointing to your server IP
- Wait for DNS propagation (5-30 minutes)

### 4. Run FastNginx Setup

\`\`\`bash

# Install FastNginx CLI

sudo npm install -g fastnginx

# Complete setup with SSL

sudo fastnginx --domain yourdomain.com --port 3000 --ssl --email your@email.com
\`\`\`

### 5. Verify Everything Works

\`\`\`bash

# Check Nginx status

sudo systemctl status nginx

# Test configuration

sudo nginx -t

# Check SSL certificate

sudo certbot certificates

# Test your site

curl -I https://yourdomain.com
\`\`\`

## Troubleshooting SSL Issues

### Common Problems

**Certificate request failed:**
\`\`\`bash

# Check if domain points to your server

dig yourdomain.com +short

# Ensure port 80 and 443 are open

sudo ufw allow 80
sudo ufw allow 443
\`\`\`

**Rate limiting:**
\`\`\`bash

# Let's Encrypt has rate limits

# Use staging environment for testing:

sudo certbot --nginx -d yourdomain.com --staging
\`\`\`

**Renewal issues:**
\`\`\`bash

# Check renewal logs

sudo journalctl -u certbot.timer

# Manual renewal

sudo certbot renew --force-renewal
\`\`\`

## Security Best Practices

### 1. Configure Firewall

\`\`\`bash

# UFW (Ubuntu)

sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
\`\`\`

### 2. Set Up Auto-Renewal

\`\`\`bash

# Certbot usually sets this up automatically

# Check crontab

sudo crontab -l

# Or systemd timer

sudo systemctl list-timers | grep certbot
\`\`\`

### 3. Monitor SSL Status

\`\`\`bash

# Check certificate expiry

sudo certbot certificates

# Test SSL configuration

# Use online tools like SSL Labs SSL Test

\`\`\`
\`\`\`
