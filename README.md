# DNS Manpower Management System

A modern web application designed to help DNS Suppliers manage their workforce efficiently. This system lets you track employees, organize them into sections and groups, manage attendance records, and handle payroll configurations all in one place.

## What It Does

Think of it as your all-in-one HR management tool. You can:
- Keep track of all your employees with their details
- Organize your workforce into sections and groups
- Record and monitor attendance
- Manage salary configurations per group
- Generate reports and export data
- Get a quick overview of everything on the dashboard

The interface is clean, modern, and works great in both light and dark modes. Everything is built with React and TypeScript, so it's fast and reliable.

## Quick Start

### Automated Installation (Linux Only)

> **Note:** Automated installation scripts are only supported on Linux systems (Ubuntu/Debian recommended). For Windows or custom setups, see the [Manual Installation](#manual-installation) section below.

The easiest way to get started on Linux is using our automated installation scripts. We provide two options:

1. **Standard Installation** - `install.py` - For normal servers with adequate resources
2. **Optimized Installation** - `install_for_lowend.py` - For low-end machines with limited RAM/CPU

Both scripts handle everything automatically including dependency installation, database setup, SSL certificate configuration, and systemd service creation.

**Prerequisites:**
- Linux system (Ubuntu/Debian recommended)
- Root/sudo access
- Internet connection
- Python 3 installed

**Installation Steps:**

1. **Download and extract the installation package:**
   - Download `Manpower ERP-installation.zip` from the [Latest Release](https://github.com/itzSD0811/Manpower-Management-System/releases) page
   - Extract the zip file to your desired location

2. **Install system dependencies:**
   ```bash
   chmod +x deps.sh
   ./deps.sh
   ```
   This will install all required system dependencies (Node.js, npm, MySQL, Nginx, Certbot, etc.)

3. **Run the installation script:**
   
   **Option A: Standard Installation (Recommended for normal servers)**
   ```bash
   sudo python3 install.py
   ```
   
   **Option B: Optimized Installation (For low-end machines)**
   ```bash
   sudo python3 install_for_lowend.py
   ```

4. **Follow the interactive prompts:**
   - The script will automatically clone the repository from GitHub
   - Configure MySQL database credentials (creates database and user automatically)
   - Set up master password and administrator email
   - Configure domain name and SSL certificate (Let's Encrypt)
   - Build the application and create systemd services for automatic startup

**How the Installation Scripts Work:**

The installation scripts automate the entire setup process:

1. **Repository Setup**: Automatically clones the repository from GitHub to your specified installation directory

2. **Application Building**: 
   - Installs frontend and backend npm dependencies
   - Builds the production-ready frontend

3. **Environment Setup**:
   - Creates `.env` file from `.env.example`
   - Configures all required environment variables
   - Sets up master password and administrator email

4. **Database Configuration**:
   - Prompts for MySQL username, password, and database name
   - Creates the MySQL database and user with full privileges
   - Automatically finds and configures `MYSQLDUMP_PATH`
   - Runs database schema migration (`npm run migrate`)

5. **SSL Certificate**: 
   - Configures Let's Encrypt SSL certificate for your domain
   - Sets up automatic renewal

6. **Web Server Configuration**:
   - Configures Nginx as reverse proxy
   - Sets up HTTPS redirect
   - Configures API proxying to backend server
   - Disables default Nginx site

7. **Service Management**:
   - Creates systemd service for backend
   - Enables automatic start on boot
   - Restarts services to load all configurations

**Installation Script Features:**
- ✅ Automatic dependency checking and installation
- ✅ MySQL database and user creation with privileges
- ✅ Let's Encrypt SSL certificate configuration
- ✅ Nginx reverse proxy setup with HTTPS
- ✅ Systemd service creation for auto-start on boot
- ✅ Interactive configuration wizard
- ✅ Resume functionality (can resume interrupted installations)
- ✅ Uninstall, restart, stop, and start options
- ✅ Configuration change utilities (domain, passwords, MySQL credentials, etc.)

**Differences Between Scripts:**

| Feature | `install.py` | `install_for_lowend.py` |
|---------|-------------|------------------------|
| Target System | Normal servers | Low-end machines |
| Memory Usage | Standard | Optimized (reduced RAM usage) |
| Installation Speed | Faster | Slower (pauses between operations) |
| Resource Limits | Standard | Limited (1GB RAM, 50% CPU) |
| Swap File | Not created | Auto-created if needed |

**Post-Installation:**
After installation, your application will be:
- Running on HTTPS with your configured domain
- Automatically starting on system boot
- Accessible via the domain you configured
- Backend service restarted and ready

**Management Options:**
The installation script provides a menu for managing your installation:
- **Install** - Full installation process
- **Uninstall** - Complete removal (removes services, configs, and optionally the installation directory)
- **Restart** - Restart backend services
- **Stop** - Stop services and disable auto-start on boot
- **Start Again** - Start services and enable auto-start on boot
- **Change Config** - Modify configuration:
  - Change Domain (updates Nginx and SSL)
  - Change Master Password
  - Change MySQL Credentials
  - Migrate MySQL from Schema

### Manual Installation (Linux, Windows, macOS)

If you prefer to set things up manually, are using a non-Linux system, or need a custom configuration:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/itzSD0811/Manpower-Management-System.git
   cd Manpower-Management-System
   ```

2. **Install dependencies:**
   ```bash
   npm install
   cd server
   npm install
   cd ..
   ```

3. **Create environment file:**
   ```bash
   cd server
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Start the backend (in a separate terminal):**
   ```bash
   cd server
   npm start
   ```

That's it! The app will be running on `http://localhost:3000` and the backend API on `http://localhost:3001`.

## Configuration

### Environment Variables (Backend)

The backend requires a `.env` file in the `server/` directory with the following variables:

```env
# MySQL Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_DATABASE=manpower_db

# MySQL Dump Path
MYSQLDUMP_PATH=/usr/bin/mysqldump

# Configuration Password (for protected config changes)
CONFIG_PASSWORD=your_master_password

# Administrator Email (for Firebase admin access)
ADMINISTRATOR_EMAIL=admin@example.com

# Server Port
PORT=3001

# Firebase Service Account (Optional)
# FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/service-account.json
```

### Application Configuration

The first time you run the app, you'll need to configure your database. The system supports both Firebase and MySQL - you can choose whichever works best for you. Just head to the Settings page in the app and follow the setup guides there. The webapp includes step-by-step instructions for:
- Setting up Firebase
- Configuring Two-Factor Authentication
- Setting up Google reCAPTCHA for login security

All of these are optional, but recommended for production use.

## Building for Production

When you're ready to deploy:

```bash
npm run build
```

This creates an optimized production build in the `dist` folder that you can serve with any web server.

**Note:** If you used the automated installation script, the build process is handled automatically during installation. The production build is served via Nginx with HTTPS enabled.

## Tech Stack

- **Frontend:** React 19 + TypeScript
- **Styling:** Tailwind CSS (with dark mode)
- **Backend:** Node.js + Express
- **Database:** Firebase Firestore or MySQL
- **Build Tool:** Vite

## Credits

Developed by **ItzSD** (Sethru Dineth)

GitHub: [@itzsd0811](https://github.com/itzsd0811)

## License

Proprietary software for DNS Suppliers.
