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

### Automated Installation (Recommended - Linux Only)

The easiest way to get started on Linux is using our automated installation script. It handles everything automatically including dependency installation, database setup, SSL certificate configuration, and systemd service creation.

**Prerequisites:**
- Linux system (Ubuntu/Debian recommended)
- Root/sudo access
- Internet connection

**Installation Steps:**

1. **Clone the repository:**
   ```bash
   git clone https://github.com/itzSD0811/Manpower-Management-System.git
   cd Manpower-Management-System
   ```

2. **Run the installation script:**
   ```bash
   sudo python3 installation-methods/install.py
   ```

3. **Follow the interactive prompts:**
   - The script will check and install missing dependencies (Node.js, npm, MySQL, Nginx, Certbot, etc.)
   - Configure MySQL database credentials
   - Set up master password and administrator email
   - Configure domain name and SSL certificate (Let's Encrypt)
   - Create systemd services for automatic startup

**Installation Script Features:**
- ✅ Automatic dependency checking and installation
- ✅ MySQL database setup and schema migration
- ✅ Let's Encrypt SSL certificate configuration
- ✅ Nginx reverse proxy setup with HTTPS
- ✅ Systemd service creation for auto-start on boot
- ✅ Interactive configuration wizard
- ✅ Uninstall, restart, stop, and start options
- ✅ Configuration change utilities

**Post-Installation:**
After installation, your application will be:
- Running on HTTPS with your configured domain
- Automatically starting on system boot
- Accessible via the domain you configured

**Management Options:**
The installation script provides a menu for managing your installation:
- **Install** - Full installation process
- **Uninstall** - Complete removal
- **Restart** - Restart services
- **Stop** - Stop services and disable boot
- **Start Again** - Start services and enable boot
- **Change Config** - Modify configuration (domain, passwords, MySQL credentials, etc.)

### Manual Installation

If you prefer to set things up manually or are using a non-Linux system:

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
