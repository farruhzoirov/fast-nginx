#!/usr/bin/env node
const { Command } = require("commander");

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const chalk = require("chalk");
const readline = require("readline");

const program = new Command();

// Version from package.json
const packageJson = require("../package.json");
const { sudoWriteFsFile, sudoLinkFsFile, sudoUnlinkFsFile } = require("../src/utils/file.helper");
const {generateBasicNginxConfigTemplate} = require("../src/templates/basic.template");

// CLI Configuration
program
  .name("fast-nginx")
  .description("🚀 Automate Nginx server block setup with SSL support")
  .version(packageJson.version)
  .requiredOption("-d, --domain <domain>", "Domain name for the server block")
  .option("-p, --port <port>", "Port number for the upstream server", "3000")
  .option("--ssl", "Setup SSL certificate with Let's Encrypt")
  .option("--email <email>", "Email for SSL certificate (required with --ssl)")
  .option("--www <www>", "Include www subdomain in SSL certificate")
  .option("--force", "Overwrite existing configuration")
  .option("--dry-run", "Show what would be done without executing")
  .option(
    "--template <template>",
    "Use custom template (basic|api|spa)",
    "basic"
  )
  .option("--no-reload", "Skip Nginx reload")
  .option("--yes", "Auto-answer yes to all prompts")
  .parse();

const options = program.opts();

// Helper function to prompt user
function askUser(question) {
  if (options.yes) {
    console.log(chalk.gray(`${question} (auto-answered: yes)`));
    return Promise.resolve(true);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(chalk.yellow(`${question} (y/N): `), (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

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

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Template functions
function getTemplate(templateType, domain, port) {
  const templates = {
    basic: generateBasicNginxConfigTemplate(options, domain, port),
    // api: generateApiTemplate(domain, port),
    // spa: generateSpaTemplate(domain, port),
  };

  return templates[templateType] || templates.basic;
}




// Enhanced system checks with directory creation
async function checkSystemRequirements() {
  const checks = [];

  // Check if running on Linux/macOS
  if (process.platform === "win32") {
    checks.push({
      name: "Operating System",
      status: "error",
      message: "Windows is not supported",
    });
  } else {
    checks.push({
      name: "Operating System",
      status: "ok",
      message: process.platform,
    });
  }

  // Check if running as root (for production operations)
  if (process.getuid && process.getuid() !== 0 && !options.dryRun) {
    checks.push({
      name: "Permissions",
      status: "warning",
      message: "Not running as root - some operations may fail",
    });
  } else if (!options.dryRun) {
    checks.push({
      name: "Permissions",
      status: "ok",
      message: "Running with sufficient privileges",
    });
  }

  // Check if Nginx is installed
  try {
    execSync("which nginx", { stdio: "pipe" });
    checks.push({ name: "Nginx", status: "ok", message: "Installed" });
  } catch (error) {
    checks.push({ name: "Nginx", status: "error", message: "Not installed" });
  }

  // Check and create Nginx directories
  const nginxConfigDir = "/etc/nginx";
  const sitesAvailableDir = "/etc/nginx/sites-available";
  const sitesEnabledDir = "/etc/nginx/sites-enabled";

  // Check main nginx config directory
  if (!fs.existsSync(nginxConfigDir)) {
    checks.push({
      name: "Nginx Configuration",
      status: "error",
      message: "Nginx config directory not found",
    });
    return checks;
  }

  // Check sites-available directory
  if (!fs.existsSync(sitesAvailableDir)) {
    if (options.dryRun) {
      checks.push({
        name: "Nginx sites-available",
        status: "warning",
        message: "Directory missing (would create)",
      });
    } else {
      console.log(
        chalk.yellow(`⚠️  Directory ${sitesAvailableDir} does not exist`)
      );
      const shouldCreate = await askUser(
        "Would you like to create the sites-available directory?"
      );

      if (shouldCreate) {
        try {
          fs.mkdirSync(sitesAvailableDir, { recursive: true });
          console.log(
            chalk.green(`✅ Created directory: ${sitesAvailableDir}`)
          );
          checks.push({
            name: "Nginx sites-available",
            status: "ok",
            message: "Directory created",
          });
        } catch (error) {
          console.error(
            chalk.red(`❌ Failed to create directory: ${error.message}`)
          );
          checks.push({
            name: "Nginx sites-available",
            status: "error",
            message: "Failed to create directory",
          });
        }
      } else {
        checks.push({
          name: "Nginx sites-available",
          status: "error",
          message: "Directory missing and not created",
        });
      }
    }
  } else {
    checks.push({
      name: "Nginx sites-available",
      status: "ok",
      message: "Directory exists",
    });
  }

  // Check sites-enabled directory
  if (!fs.existsSync(sitesEnabledDir)) {
    if (options.dryRun) {
      checks.push({
        name: "Nginx sites-enabled",
        status: "warning",
        message: "Directory missing (would create)",
      });
    } else {
      console.log(
        chalk.yellow(`⚠️  Directory ${sitesEnabledDir} does not exist`)
      );
      const shouldCreate = await askUser(
        "Would you like to create the sites-enabled directory?"
      );

      if (shouldCreate) {
        try {
          fs.mkdirSync(sitesEnabledDir, { recursive: true });
          console.log(chalk.green(`✅ Created directory: ${sitesEnabledDir}`));
          checks.push({
            name: "Nginx sites-enabled",
            status: "ok",
            message: "Directory created",
          });
        } catch (error) {
          console.error(
            chalk.red(`❌ Failed to create directory: ${error.message}`)
          );
          checks.push({
            name: "Nginx sites-enabled",
            status: "error",
            message: "Failed to create directory",
          });
        }
      } else {
        checks.push({
          name: "Nginx sites-enabled",
          status: "error",
          message: "Directory missing and not created",
        });
      }
    }
  } else {
    checks.push({
      name: "Nginx sites-enabled",
      status: "ok",
      message: "Directory exists",
    });
  }

  // Check if we need to add include directive to nginx.conf
  const nginxConfPath = "/etc/nginx/nginx.conf";
  if (fs.existsSync(nginxConfPath)) {
    try {
      const nginxConf = fs.readFileSync(nginxConfPath, "utf8");
      const hasInclude = nginxConf.includes(
        "include /etc/nginx/sites-enabled/*"
      );

      if (!hasInclude) {
        if (options.dryRun) {
          checks.push({
            name: "Nginx include directive",
            status: "warning",
            message: "sites-enabled include missing (would add)",
          });
        } else {
          console.log(
            chalk.yellow(
              "⚠️  nginx.conf doesn't include sites-enabled directory"
            )
          );
          const shouldAdd = await askUser(
            "Would you like to add the include directive to nginx.conf?"
          );

          if (shouldAdd) {
            try {
              // Add include directive to http block
              const updatedConf = nginxConf.replace(
                /(http\s*{[^}]*)/,
                `$1\n\t# Include server blocks\n\tinclude /etc/nginx/sites-enabled/*;\n`
              );

              // Backup original
              fs.writeFileSync(
                `${nginxConfPath}.backup.${Date.now()}`,
                nginxConf
              );
              fs.writeFileSync(nginxConfPath, updatedConf);

              console.log(
                chalk.green("✅ Added include directive to nginx.conf")
              );
              console.log(chalk.gray("   (Original backed up)"));
              checks.push({
                name: "Nginx include directive",
                status: "ok",
                message: "Added to nginx.conf",
              });
            } catch (error) {
              console.error(
                chalk.red(`❌ Failed to update nginx.conf: ${error.message}`)
              );
              checks.push({
                name: "Nginx include directive",
                status: "error",
                message: "Failed to update nginx.conf",
              });
            }
          } else {
            checks.push({
              name: "Nginx include directive",
              status: "warning",
              message: "Include directive not added",
            });
          }
        }
      } else {
        checks.push({
          name: "Nginx include directive",
          status: "ok",
          message: "Present in nginx.conf",
        });
      }
    } catch (error) {
      checks.push({
        name: "Nginx include directive",
        status: "error",
        message: "Cannot read nginx.conf",
      });
    }
  }

  return checks;
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
      console.log(chalk.green("✅ Certbot found"));
    } catch (error) {
      console.log(chalk.yellow("📦 Installing Certbot..."));

      // Detect OS and install accordingly
      try {
        if (fs.existsSync("/etc/debian_version")) {
          execSync(
            "sudo apt update && apt install certbot python3-certbot-nginx -y",
            { stdio: "inherit" }
          );
        } else if (fs.existsSync("/etc/redhat-release")) {
          execSync("sudo yum install certbot python3-certbot-nginx -y", {
            stdio: "inherit",
          });
        } else {
          throw new Error("Unsupported OS for automatic certbot installation");
        }
      } catch (installError) {
        console.error(chalk.red("❌ Failed to install certbot automatically"));
        console.log(chalk.yellow("💡 Please install certbot manually:"));
        console.log(
          chalk.gray(
            "   Ubuntu/Debian: sudo apt install certbot python3-certbot-nginx"
          )
        );
        console.log(
          chalk.gray(
            "   CentOS/RHEL: sudo yum install certbot python3-certbot-nginx"
          )
        );
        return false;
      }
    }

    // Build certbot command
    const domains = options.www
      ? `-d ${domain} -d www.${domain}`
      : `-d ${domain}`;
    const certbotCmd = `sudo certbot --nginx ${domains} --email ${email} --agree-tos --non-interactive --redirect`;

    console.log(chalk.gray(`Running: ${certbotCmd}`));

    execSync(certbotCmd, { stdio: "inherit" });
    console.log(chalk.green("✅ SSL certificate installed successfully!"));

    // Test SSL configuration
    console.log(chalk.yellow("🧪 Testing SSL configuration..."));
    execSync("sudo ginx -t", { stdio: "pipe" });
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
  const { domain, port, dryRun, force, template } = options;

  console.log(chalk.blue.bold("🚀 fast-nginx v" + packageJson.version));
  console.log(chalk.gray("Nginx Server Block Automation Tool"));
  console.log(chalk.gray("=====================================\n"));

  // System requirements check
  console.log(chalk.yellow("🔍 Checking system requirements..."));
  const systemChecks = await checkSystemRequirements();

  for (const check of systemChecks) {
    const icon =
      check.status === "ok" ? "✅" : check.status === "warning" ? "⚠️" : "❌";
    const color =
      check.status === "ok"
        ? "green"
        : check.status === "warning"
        ? "yellow"
        : "red";
    console.log(chalk[color](`${icon} ${check.name}: ${check.message}`));
  }

  // Check for critical errors
  const criticalErrors = systemChecks.filter(
    (check) => check.status === "error"
  );
  if (criticalErrors.length > 0 && !dryRun) {
    console.log(
      chalk.red("\n❌ Critical system requirements not met. Aborting.")
    );
    process.exit(1);
  }

  console.log();

  // Input validation
  console.log(chalk.yellow("📋 Validating inputs..."));

  if (!validateDomain(domain)) {
    console.error(chalk.red("❌ Invalid domain format:", domain));
    console.log(chalk.gray("   Example: myapp.com or api.myapp.com"));
    process.exit(1);
  }

  if (!validatePort(port)) {
    console.error(chalk.red("❌ Invalid port number:", port));
    console.log(chalk.gray("   Port must be between 1 and 65535"));
    process.exit(1);
  }

  if (options.ssl && !options.email) {
    console.error(chalk.red("❌ Email is required when using --ssl option"));
    console.log(
      chalk.gray(
        "   Use: fast-nginx -d domain.com --ssl --email your@email.com"
      )
    );
    process.exit(1);
  }

  if (options.ssl && options.email && !validateEmail(options.email)) {
    console.error(chalk.red("❌ Invalid email format:", options.email));
    process.exit(1);
  }

  console.log(chalk.green("✅ Domain:", domain));
  console.log(chalk.green("✅ Port:", port));
  console.log(chalk.green("✅ Template:", template));

  if (options.ssl) {
    console.log(chalk.green("✅ SSL setup requested"));
    console.log(chalk.green("✅ Email:", options.email));
    if (options.www) {
      console.log(chalk.green("✅ Including www subdomain"));
    }
  }

  // File paths
  const sitesAvailable = `/etc/nginx/sites-available/${domain}`;
  const sitesEnabled = `/etc/nginx/sites-enabled/${domain}`;

  console.log(chalk.yellow("\n📝 Generating Nginx configuration..."));
  console.log("template", template)
  console.log("domain", domain)
  console.log("port", port)
  const nginxConfig = getTemplate(template, domain, port);

  if (dryRun) {
    console.log(
      chalk.blue("\n🔍 DRY RUN - Configuration that would be created:")
    );
    console.log(chalk.gray("─".repeat(60)));
    console.log(nginxConfig);
    console.log(chalk.gray("─".repeat(60)));
    console.log(chalk.blue(`\n📁 Would write to: ${sitesAvailable}`));
    console.log(chalk.blue(`🔗 Would create symlink: ${sitesEnabled}`));
    if (!options.noReload) {
      console.log(chalk.blue("🔄 Would reload Nginx"));
    }
    if (options.ssl) {
      console.log(
        chalk.blue(
          `🔒 Would setup SSL for: ${domain}${
            options.www ? " and www." + domain : ""
          }`
        )
      );
    }
    return;
  }

  try {
    // Check if config already exists
    if (fs.existsSync(sitesAvailable) && !force) {
      console.log(
        chalk.yellow(`⚠️  Configuration for ${domain} already exists`)
      );
      console.log(chalk.gray(`   Location: ${sitesAvailable}`));
      console.log(chalk.gray("   Use --force to overwrite"));
      process.exit(1);
    }

    // Write configuration file
    console.log(chalk.yellow("📄 Writing configuration file..."));
    // fs.accessSync(sitesAvailable, nginxConfig, "utf8");
    await sudoWriteFsFile(`fs.writeFileSync`, sitesAvailable, nginxConfig, (err) => {
      if (err) {
        console.error(chalk.red("❌ Failed to write configuration file:"), err);
        process.exit(1);
      }
    });
    // fs.writeFileSync(sitesAvailable, nginxConfig, "utf8");
    console.log(chalk.green("✅ Configuration written to:", sitesAvailable));

    // Create symbolic link
    console.log(chalk.yellow("🔗 Creating symbolic link..."));
    // if (fs.existsSync(sitesEnabled)) {
    //   await sudoUnlinkFsFile(`fs.unlinkSync`, sitesEnabled, (err) => {
    //     if (err) {
    //       console.error(
    //         chalk.red("❌ Failed to remove existing symlink:"),
    //         err
    //       );
    //       process.exit(1);
    //     }
    //   });
    //   //   fs.unlinkSync(sitesEnabled);
    // }
    // fs.symlinkSync(sitesAvailable, sitesEnabled);
    await sudoLinkFsFile(`fs.symlinkSync`, sitesAvailable, sitesEnabled, (err) => {
      if (err) {
        console.error(
            chalk.red("❌ Failed to link:"),
            err
        );
        process.exit(1);
      }
    });
    console.log(chalk.green("✅ Symbolic link created:", sitesEnabled));

    // Test Nginx configuration
    console.log(chalk.yellow("🧪 Testing Nginx configuration..."));
    try {
      execSync(" sudo nginx -t", { stdio: "pipe" });
      console.log(chalk.green("✅ Nginx configuration test passed"));
    } catch (error) {
      console.error(chalk.red("❌ Nginx configuration test failed"));
      console.error(chalk.red(error.message));


      process.exit(1);
    }

    // Reload Nginx
    // if (!options.noReload) {
    //   console.log(chalk.yellow("🔄 Reloading Nginx..."));
    //   try {
    //     execSync("sudo systemctl reload nginx", { stdio: "pipe" });
    //     console.log(chalk.green("✅ Nginx reloaded successfully"));
    //   } catch (error) {
    //     console.error(chalk.red("❌ Failed to reload Nginx"));
    //     console.error(chalk.red(error.message));
    //     console.log(chalk.yellow("💡 Try: sudo systemctl reload nginx"));
    //   }
    // }

    let sslSuccess = false;
    if (options.ssl) {
      sslSuccess = await setupSSL(domain, options.email);
    }

    // Success message
    console.log(
      chalk.green.bold("\n🎉 Server block setup completed successfully!")
    );
    console.log(chalk.gray("====================================="));
    console.log(chalk.white(`📋 Configuration Summary:`));
    console.log(chalk.white(`   Domain: ${domain}`));
    console.log(chalk.white(`   Template: ${template}`));
    console.log(chalk.white(`   Upstream: http://localhost:${port}`));
    console.log(chalk.white(`   Config: ${sitesAvailable}`));

    if (sslSuccess) {
      console.log(chalk.green(`   SSL: ✅ HTTPS enabled`));
      console.log(chalk.white(`   URL: https://${domain}`));
    } else if (options.ssl) {
      console.log(
        chalk.yellow(`   SSL: ⚠️ Setup attempted but may have failed`)
      );
    }

    console.log(chalk.gray("\n💡 Next steps:"));
    console.log(chalk.gray(`   1. Ensure your app is running on port ${port}`));

    if (!sslSuccess && !options.ssl) {
      console.log(chalk.gray(`   2. Point your domain DNS to this server`));
      console.log(
        chalk.gray(
          `   3. Set up SSL: fast-nginx -d ${domain} --ssl --email your@email.com`
        )
      );
    } else if (sslSuccess) {
      console.log(chalk.gray(`   2. Your site is ready at https://${domain}`));
      console.log(
        chalk.gray(
          `   3. SSL will auto-renew (check: sudo certbot renew --dry-run)`
        )
      );
    }

    console.log(
      chalk.gray(
        `   4. Monitor logs: sudo tail -f /var/log/nginx/${domain}_*.log`
      )
    );
  } catch (error) {
    console.error(chalk.red("❌ Error during setup:"), error.message);

    if (error.code === "EACCES") {
      console.log(
        chalk.yellow(
          "💡 Try running with sudo: sudo fast-nginx -d your-domain.com"
        )
      );
    }

    process.exit(1);
  }
}

// Handle uncaught errors gracefully
process.on("uncaughtException", (error) => {
  console.error(chalk.red("❌ Unexpected error:"), error.message);
  console.log(
    chalk.gray(
      "Please report this issue at: https://github.com/farruhzoirov/fast-nginx/issues"
    )
  );
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(chalk.red("❌ Unhandled promise rejection:"), reason);
  process.exit(1);
});

// Run the main function
setupNginxServerBlock().catch((error) => {
  console.error(chalk.red("❌ Setup failed:"), error.message);
  process.exit(1);
});
