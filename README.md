# fastnginx

🚀 **fastnginx** is a lightweight and developer-friendly CLI tool that automates Nginx configuration for your domains. No more copy-pasting server blocks — just run a command and you're good to go.

### ✅ Features
- Automatically generates and places Nginx config files
- Creates symbolic links between `sites-available` and `sites-enabled`
- Reloads Nginx for you
- Simple usage with `--domain` and `--port`
- Saves you time and reduces human errors

### 🔧 Example

```bash
sudo fastnginx --domain=example.com --port=3000
