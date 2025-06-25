const { execSync } = require("child_process");
const fs = require("fs");
const chalk = require("chalk");
const { askUser } = require("../utils/ask.helper");
const { sudoCreateFileOrFolder } = require("../utils/file.helper");

async function checkSystemRequirements(options) {
  const checks = [];
  // Check if running on Linux
  if (process.platform !== "linux") {
    checks.push({
      name: "Operating System",
      status: "error",
      message: "These operating system is not supported",
    });
    return checks;
  }
  checks.push({
    name: "Operating System",
    status: "ok",
    message: process.platform,
  });

  // Check if running as root (for production operations) Because linux's root privileges equal to 0
  if (process.getuid && process.getuid() !== 0) {
    checks.push({
      name: "Permissions",
      status: "warning",
      message: "Not running as root - some operations may fail",
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

  if (!fs.existsSync(nginxConfigDir)) {
    const userResponse = await askUser(
      options,
      `⚠️ etc/nginx file doesn't exists. Will create it in ${nginxConfigDir} directory. Continue?`,
    );

    if (userResponse) {
      await sudoCreateFileOrFolder(nginxConfigDir, "folder", (err) => {
        if (err) {
          console.log(
            chalk.red(`❌ Failed to create ${nginxConfigDir} folder: `, err),
          );
          process.exit(1);
        }
      });
    }
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
        chalk.yellow(`⚠️  Directory ${sitesAvailableDir} does not exist`),
      );
      const shouldCreate = await askUser(
        options,
        "Would you like to create the sites-available directory?",
      );

      if (shouldCreate) {
        try {
          fs.mkdirSync(sitesAvailableDir, { recursive: true });
          console.log(
            chalk.green(`✅ Created directory: ${sitesAvailableDir}`),
          );
          checks.push({
            name: "Nginx sites-available",
            status: "ok",
            message: "Directory created",
          });
        } catch (error) {
          console.error(
            chalk.red(`❌ Failed to create directory: ${error.message}`),
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
        chalk.yellow(`⚠️  Directory ${sitesEnabledDir} does not exist`),
      );
      const shouldCreate = await askUser(
        options,
        "Would you like to create the sites-enabled directory?",
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
            chalk.red(`❌ Failed to create directory: ${error.message}`),
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

  const nginxConfPath = "/etc/nginx/nginx.conf";
  if (fs.existsSync(nginxConfPath)) {
    try {
      const nginxConf = fs.readFileSync(nginxConfPath, "utf8");
      const hasInclude = nginxConf.includes(
        "include /etc/nginx/sites-enabled/*",
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
              "⚠️  nginx.conf doesn't include sites-enabled directory",
            ),
          );
          const shouldAdd = await askUser(
            options,
            "Would you like to add the include directive to nginx.conf?",
          );

          if (shouldAdd) {
            try {
              // Add include directive to http block
              const updatedConf = nginxConf.replace(
                /(http\s*{[^}]*)/,
                `$1\n\t# Include server blocks\n\tinclude /etc/nginx/sites-enabled/*;\n`,
              );

              // Backup original
              fs.writeFileSync(
                `${nginxConfPath}.backup.${Date.now()}`,
                nginxConf,
              );
              fs.writeFileSync(nginxConfPath, updatedConf);

              console.log(
                chalk.green("✅ Added include directive to nginx.conf"),
              );
              console.log(chalk.gray("   (Original backed up)"));
              checks.push({
                name: "Nginx include directive",
                status: "ok",
                message: "Added to nginx.conf",
              });
            } catch (error) {
              console.error(
                chalk.red(`❌ Failed to update nginx.conf: ${error.message}`),
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

module.exports = checkSystemRequirements;
