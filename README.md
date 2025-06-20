# FastNginx 🚀

[![npm version](https://badge.fury.io/js/fastnginx.svg)](https://badge.fury.io/js/fastnginx)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://github.com/yourusername/fastnginx/workflows/Node.js%20CI/badge.svg)](https://github.com/yourusername/fastnginx/actions)

**The fastest way to set up Nginx server blocks with SSL support.**

FastNginx is a production-ready CLI tool that automates the entire process of setting up Nginx reverse proxy configurations, from basic server blocks to SSL certificates with Let's Encrypt.

## ✨ Features

- 🚀 **One-command setup** - Domain to production in seconds
- 🔒 **Automatic SSL** - Let's Encrypt integration with auto-renewal
- 📋 **Multiple templates** - Basic, API, and SPA configurations
- 🛡️ **Security headers** - Production-ready security configurations
- 🔍 **System validation** - Checks requirements before execution
- 🎯 **Dry-run mode** - Preview changes before applying
- 📊 **Detailed logging** - Clear feedback and error handling
- 🌐 **Cross-platform** - Linux support

## 🚀 Quick Start

### Installation

\`\`\`bash

# Install globally via npm

npm install -g fast-nginx

# Verify installation

fast-nginx --version
\`\`\`

### Basic Usage

\`\`\`bash

# Basic HTTP setup

sudo fast-nginx --domain myapp.com --port 3000

# Complete HTTPS setup

sudo fast-nginx --domain myapp.com --port 3000 --ssl --email admin@myapp.com


## 📖 Documentation

### Command Options

| Option                  | Description                         | Default |
| ----------------------- | ----------------------------------- | ------- |
| `-d, --domain <domain>` | Domain name (required)              | -       |
| `-p, --port <port>`     | Upstream port                       | 3000    |
| `--ssl`                 | Setup SSL certificate               | false   |
| `--email <email>`       | Email for SSL (required with --ssl) | -       |
| `--www`                 | Include www subdomain               | false   |
| `--template <type>`     | Configuration template              | basic   |
| `--force`               | Overwrite existing config           | false   |
| `--dry-run`             | Preview without executing           | false   |
| `--no-reload`           | Skip Nginx reload                   | false   |

### Templates

#### Basic Template

Perfect for most web applications:
\`\`\`bash
fast-nginx --domain myapp.com --template basic
\`\`\`


### Examples

#### Simple Website

\`\`\`bash

# Setup a basic website

sudo fast-nginx --domain mywebsite.com --port 3000 --ssl --email admin@mywebsite.com
\`\`\`


#### Preview Changes

\`\`\`bash

# See what would be created without executing

fast-nginx --domain test.com --ssl --email test@test.com --dry-run
\`\`\`

## 🔧 Requirements

- **Operating System**: Linux, Ubuntu
- **Node.js**: 14.0.0 or higher
- **Nginx**: Installed and running
- **Permissions**: Root/sudo access for system operations
- **Network**: Ports 80 and 443 accessible from internet (for SSL)

## 📋 Installation Requirements

### Ubuntu/Debian

\`\`\`bash

# Update system

sudo apt update && sudo apt upgrade -y

# Install Node.js

curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx

sudo apt install nginx -y

# Install FastNginx (that's it!)

sudo npm install -g fast-nginx
\`\`\`

### CentOS/RHEL

\`\`\`bash

# Install Node.js

curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install Nginx

sudo yum install nginx -y

# Install FastNginx

sudo npm install -g fast-nginx
\`\`\`

## 🛡️ Security Features

FastNginx includes production-ready security configurations:

- **Security Headers**: X-Frame-Options, X-XSS-Protection, X-Content-Type-Options
- **SSL/TLS**: Automatic HTTPS redirect and modern cipher suites

## 🔍 Troubleshooting

### Common Issues

**Permission Denied**
\`\`\`bash

# Always run with sudo for system operations

sudo fast-nginx --domain myapp.com
\`\`\`

**Domain Not Accessible**
\`\`\`bash

# Check DNS resolution

dig myapp.com +short

# Verify app is running

netstat -tuln | grep :3000
\`\`\`

**SSL Certificate Failed**
\`\`\`bash

# Ensure domain points to your server

# Check firewall allows ports 80 and 443

sudo ufw allow 80
sudo ufw allow 443
\`\`\`

**Nginx Configuration Error**
\`\`\`bash

# Test configuration

sudo nginx -t

# Check logs

sudo tail -f /var/log/nginx/error.log
\`\`\`

### Getting Help

- 📖 [Documentation](https://github.com/yourusername/fastnginx#readme)
- 🐛 [Report Issues](https://github.com/yourusername/fastnginx/issues)
- 💬 [Discussions](https://github.com/yourusername/fastnginx/discussions)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

\`\`\`bash

# Clone repository

git clone https://github.com/yourusername/fastnginx.git
cd fast-nginx

# Install dependencies

npm install

# Make executable

chmod +x bin/cli.js

# Test locally

./bin/cli.js --help

# Install globally for testing

npm link
\`\`\`

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Nginx](https://nginx.org/) - High-performance web server
- [Let's Encrypt](https://letsencrypt.org/) - Free SSL certificates
- [Commander.js](https://github.com/tj/commander.js/) - CLI framework
- [Chalk](https://github.com/chalk/chalk) - Terminal styling

## 📊 Stats

![GitHub stars](https://img.shields.io/github/stars/farruhzoirov/fastnginx?style=social)
![GitHub forks](https://img.shields.io/github/forks/farruhzoirov/fastnginx?style=social)
![npm downloads](https://img.shields.io/npm/dm/fast-nginx)

---

**Made with ❤️ for the DevOps community**
