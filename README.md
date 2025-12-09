# DNS Manpower Management System

## Overview
A comprehensive Enterprise Resource Planning (ERP) dashboard designed for DNS Suppliers to manage manpower resources, organizational structures, and payroll configurations. Built with a modern React stack focusing on performance, scalability, and clean UI/UX.

## Tech Stack
- **Frontend Framework:** React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS (Dark/Light mode support)
- **Database:** Google Firebase (Firestore)
- **Routing:** React Router DOM
- **Icons:** Lucide React
- **Build Tool:** Vite

## Key Features
- **Dashboard:** Real-time analytics and system status monitoring.
- **Manpower Management:** Comprehensive CRUD operations for employee records with advanced filtering.
- **Organization Structure:** Dynamic management of Sections and Groups.
- **Payroll Config:** Monthly salary history tracking per group.
- **System Health:** Integrated connection diagnostics for Firebase services.

## Setup & Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure reCAPTCHA (Optional but recommended for login security):
   - Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
   - Register a new site and select reCAPTCHA v3
   - Copy your Site Key and Secret Key
   - Create a `.env` file in the root directory with:
     ```
     VITE_RECAPTCHA_SITE_KEY=your_site_key_here
     ```
   - For backend verification, add to `server/.env`:
     ```
     RECAPTCHA_SECRET_KEY=your_secret_key_here
     ```
   - Note: If reCAPTCHA keys are not configured, the login will still work (useful for development)

3. Run development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## Developer
Developed by **Sethru Dineth (ItzSD)**

## License
Proprietary software for DNS Suppliers.