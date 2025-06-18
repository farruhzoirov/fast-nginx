#!/usr/bin/env node

const { Command } = require("commander");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const chalk = require("chalk");

const program = new Command();

// CLI Configuration
program
  .name("fastnginx")
  .description("Automate Nginx server block setup with SSL support")
  .version("0.1.0")
  .requiredOption("-d, --domain <domain>", "Domain name for the server block")
  .option("-p, --port <port>", "Port number for the upstream server", "3000")
  .option("--ssl", "Setup SSL certificate with Let's Encrypt")
  .option("--email <email>", "Email for SSL certificate (required with --ssl)")
  .option("--dry-run", "Show what would be done without executing")
  .parse();

const options = program.opts();

// Validation functions
function validateDomain(domain) {
  const domainRegex =
    /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
  return domainRegex.test(domain);
}

function validatePort(port) {
  const portNum = Number.parseInt(port);
  return portNum > 0 && portNum <= 65535;
}

// Nginx configuration template
function generateNginxConfig(domain, port) {
  return `server {
    listen 80;
    listen [::]:80;
    
    server_name ${domain} www.${domain};
    
    location / {
        proxy_pass http://localhost:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_redirect off;
    }
    
    # Optional: Add security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Optional: Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;
}`;
}

// SSL Certificate setup with Certbot
async function setupSSL(domain, email) {
  console.log(
    chalk.yellow("🔒 Setting up SSL certificate with Let's Encrypt...")
  );

  try {
    // Check if certbot is installed
    try {
      execSync("which certbot", { stdio: "pipe" });
    } catch (error) {
      console.log(chalk.yellow("📦 Installing Certbot..."));
      execSync(
        "sudo apt update && sudo apt install certbot python3-certbot-nginx -y",
        { stdio: "inherit" }
      );
    }

    // Run certbot
    const certbotCmd = `certbot --nginx -d ${domain} -d www.${domain} --email ${email} --agree-tos --non-interactive --redirect`;
    console.log(chalk.gray(`Running: ${certbotCmd}`));

    execSync(certbotCmd, { stdio: "inherit" });
    console.log(chalk.green("✅ SSL certificate installed successfully!"));

    // Test SSL configuration
    console.log(chalk.yellow("🧪 Testing SSL configuration..."));
    execSync("nginx -t", { stdio: "pipe" });
    console.log(chalk.green("✅ SSL configuration test passed"));

    return true;
  } catch (error) {
    console.error(chalk.red("❌ SSL setup failed:"), error.message);
    console.log(chalk.yellow("💡 You can set up SSL manually later with:"));
    console.log(chalk.gray(`   sudo certbot --nginx -d ${domain}`));
    return false;
  }
}

// Main execution function
async function setupNginxServerBlock() {
  const { domain, port, dryRun } = options;

  console.log(chalk.blue.bold("🚀 FastNginx - Nginx Server Block Setup"));
  console.log(chalk.gray("=====================================\n"));

  // Validation
  console.log(chalk.yellow("📋 Validating inputs..."));

  if (!validateDomain(domain)) {
    console.error(chalk.red("❌ Invalid domain format:", domain));
    process.exit(1);
  }

  if (!validatePort(port)) {
    console.error(chalk.red("❌ Invalid port number:", port));
    process.exit(1);
  }

  if (options.ssl && !options.email) {
    console.error(chalk.red("❌ Email is required when using --ssl option"));
    console.log(
      chalk.gray("   Use: fastnginx -d domain.com --ssl --email your@email.com")
    );
    process.exit(1);
  }

  console.log(chalk.green("✅ Domain:", domain));
  console.log(chalk.green("✅ Port:", port));

  if (options.ssl) {
    console.log(chalk.green("✅ SSL setup requested"));
    console.log(chalk.green("✅ Email:", options.email));
  }

  // Check if running as root/sudo
  if (process.getuid && process.getuid() !== 0 && !dryRun) {
    console.log(
      chalk.yellow(
        "⚠️  This script requires sudo privileges to write to /etc/nginx/"
      )
    );
    console.log(chalk.gray("   Run with: sudo fastnginx -d your-domain.com\n"));
  }

  // File paths
  const sitesAvailable = `/etc/nginx/sites-available/${domain}`;
  const sitesEnabled = `/etc/nginx/sites-enabled/${domain}`;

  console.log(chalk.yellow("\n📝 Generating Nginx configuration..."));
  const nginxConfig = generateNginxConfig(domain, port);

  if (dryRun) {
    console.log(
      chalk.blue("\n🔍 DRY RUN - Configuration that would be created:")
    );
    console.log(chalk.gray("─".repeat(50)));
    console.log(nginxConfig);
    console.log(chalk.gray("─".repeat(50)));
    console.log(chalk.blue(`\n📁 Would write to: ${sitesAvailable}`));
    console.log(chalk.blue(`🔗 Would create symlink: ${sitesEnabled}`));
    console.log(chalk.blue("🔄 Would reload Nginx"));
    return;
  }

  try {
    // Check if sites-available directory exists
    if (!fs.existsSync("/etc/nginx/sites-available")) {
      console.error(
        chalk.red("❌ /etc/nginx/sites-available directory not found")
      );
      console.log(
        chalk.yellow("   Make sure Nginx is installed and configured properly")
      );
      process.exit(1);
    }

    // Check if config already exists
    if (fs.existsSync(sitesAvailable)) {
      console.log(
        chalk.yellow(`⚠️  Configuration for ${domain} already exists`)
      );
      console.log(chalk.gray(`   Location: ${sitesAvailable}`));

      // Simple prompt simulation (in a real CLI, you might use inquirer)
      console.log(chalk.red("❌ Aborting to prevent overwrite"));
      console.log(
        chalk.gray("   Remove existing config first or use a different domain")
      );
      process.exit(1);
    }

    // Write configuration file
    console.log(chalk.yellow("📄 Writing configuration file..."));
    fs.writeFileSync(sitesAvailable, nginxConfig, "utf8");
    console.log(chalk.green("✅ Configuration written to:", sitesAvailable));

    // Create symbolic link
    console.log(chalk.yellow("🔗 Creating symbolic link..."));
    if (fs.existsSync(sitesEnabled)) {
      fs.unlinkSync(sitesEnabled);
    }
    fs.symlinkSync(sitesAvailable, sitesEnabled);
    console.log(chalk.green("✅ Symbolic link created:", sitesEnabled));

    // Test Nginx configuration
    console.log(chalk.yellow("🧪 Testing Nginx configuration..."));
    try {
      execSync("nginx -t", { stdio: "pipe" });
      console.log(chalk.green("✅ Nginx configuration test passed"));
    } catch (error) {
      console.error(chalk.red("❌ Nginx configuration test failed"));
      console.error(chalk.red(error.message));

      // Cleanup on failure
      console.log(chalk.yellow("🧹 Cleaning up..."));
      if (fs.existsSync(sitesEnabled)) fs.unlinkSync(sitesEnabled);
      if (fs.existsSync(sitesAvailable)) fs.unlinkSync(sitesAvailable);
      process.exit(1);
    }

    // Reload Nginx
    console.log(chalk.yellow("🔄 Reloading Nginx..."));
    try {
      execSync("nginx -s reload", { stdio: "pipe" });
      console.log(chalk.green("✅ Nginx reloaded successfully"));
    } catch (error) {
      console.error(chalk.red("❌ Failed to reload Nginx"));
      console.error(chalk.red(error.message));
      process.exit(1);
    }

    let sslSuccess = false;
    if (options.ssl) {
      sslSuccess = await setupSSL(domain, options.email);
    }

    // Success message
    console.log(
      chalk.green.bold("\n🎉 Server block setup completed successfully!")
    );
    console.log(chalk.gray("====================================="));
    console.log(chalk.white(`Domain: ${domain}`));
    console.log(chalk.white(`Upstream: http://localhost:${port}`));
    console.log(chalk.white(`Config: ${sitesAvailable}`));
    if (sslSuccess) {
      console.log(chalk.green(`SSL: ✅ HTTPS enabled`));
      console.log(chalk.white(`URL: https://${domain}`));
    } else if (options.ssl) {
      console.log(chalk.yellow(`SSL: ⚠️ Setup attempted but may have failed`));
    }
    console.log(chalk.gray("\n💡 Next steps:"));
    console.log(
      chalk.gray(`   1. Make sure your app is running on port ${port}`)
    );
    if (!sslSuccess && !options.ssl) {
      console.log(chalk.gray(`   2. Point your domain DNS to this server`));
      console.log(
        chalk.gray(`   3. Set up SSL: sudo certbot --nginx -d ${domain}`)
      );
    } else if (sslSuccess) {
      console.log(chalk.gray(`   2. Your site is ready at https://${domain}`));
      console.log(
        chalk.gray(
          `   3. SSL will auto-renew (check with: sudo certbot renew --dry-run)`
        )
      );
    }
  } catch (error) {
    console.error(chalk.red("❌ Error during setup:"), error.message);

    if (error.code === "EACCES") {
      console.log(
        chalk.yellow(
          "💡 Try running with sudo: sudo fastnginx -d your-domain.com"
        )
      );
    }

    process.exit(1);
  }
}

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error(chalk.red("❌ Unexpected error:"), error.message);
  process.exit(1);
});

// Run the main function
setupNginxServerBlock().catch((error) => {
  console.error(chalk.red("❌ Setup failed:"), error.message);
  process.exit(1);
});
