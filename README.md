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

### Automated Installation (Recommended)

The easiest way to get started is to download the installation package from the releases. Just extract it and run the appropriate script for your system - it handles everything automatically. Check the README files inside the package for detailed instructions.

### Manual Installation

If you prefer to set things up manually:

1. **Download the release package** from the releases page and extract it

2. **Install dependencies:**
   ```bash
   npm install
   cd server
   npm install
   cd ..
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Start the backend (in a separate terminal):**
   ```bash
   cd server
   npm start
   ```

That's it! The app will be running on `http://localhost:3000` and the backend API on `http://localhost:3001`.

## Configuration

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
