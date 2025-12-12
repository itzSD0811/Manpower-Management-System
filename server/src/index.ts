import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import admin from 'firebase-admin';

dotenv.config();

// Initialize Firebase Admin SDK
let adminInitialized = false;
const initializeFirebaseAdmin = async () => {
  if (adminInitialized) return;
  
  try {
    // Try to get Firebase config from environment or config file
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const firebaseConfigPath = path.join(__dirname, '..', 'config.json');
    
    if (serviceAccountPath) {
      // Use service account file if provided
      const serviceAccount = require(path.resolve(serviceAccountPath));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      adminInitialized = true;
      console.log('Firebase Admin SDK initialized with service account');
    } else {
      // Try to read from config.json
      try {
        const configData = await fs.readFile(firebaseConfigPath, 'utf-8');
        const config = JSON.parse(configData);
        
        if (config.firebaseConfig && config.firebaseConfig.projectId) {
          // Initialize with config from file
          // Note: For production, you should use a service account JSON file
          // This is a fallback that may not work for all operations
          try {
            admin.initializeApp({
              projectId: config.firebaseConfig.projectId
            });
            adminInitialized = true;
            console.log('Firebase Admin SDK initialized with project ID');
          } catch (error) {
            console.warn('Firebase Admin SDK initialization failed. User deletion from Auth will not work. Set FIREBASE_SERVICE_ACCOUNT_PATH in .env with path to service account JSON file.');
          }
        }
      } catch (error) {
        console.warn('Could not initialize Firebase Admin SDK. User deletion from Auth will not work.');
      }
    }
  } catch (error) {
    console.warn('Firebase Admin SDK not initialized. User deletion from Auth will not work:', error);
  }
};

// Initialize on startup
initializeFirebaseAdmin();

const app = express();
const port = process.env.PORT || 3001;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true,
});

app.use(cors());
app.use(express.json());
app.use(express.text({ type: ['text/plain', 'application/sql'] }));

// Config file path - stored in server directory
const CONFIG_FILE_PATH = path.join(__dirname, '..', 'config.json');

app.get('/', (req, res) => {
  res.send('DNS Manpower Manager API is running!');
});

// Configuration API - Read config.json
app.get('/api/config', async (req, res) => {
  try {
    const configData = await fs.readFile(CONFIG_FILE_PATH, 'utf-8');
    const config = JSON.parse(configData);
    
    // Override administratorEmail from .env if set
    const adminEmail = process.env.ADMINISTRATOR_EMAIL;
    if (adminEmail) {
      config.administratorEmail = adminEmail;
    }
    
    res.json(config);
  } catch (error: any) {
    // If file doesn't exist, return default config
    if (error.code === 'ENOENT') {
      const defaultConfig: any = {
        dbType: 'firebase',
        mysqlConfig: {},
        firebaseConfig: {},
        recaptchaConfig: {}
      };
      
      // Add administratorEmail from .env if set
      const adminEmail = process.env.ADMINISTRATOR_EMAIL;
      if (adminEmail) {
        defaultConfig.administratorEmail = adminEmail;
      }
      
      res.json(defaultConfig);
    } else {
      console.error('Error reading config:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
});

// Configuration Password Verification API
app.post('/api/config/verify-password', async (req, res) => {
  try {
    const { password, token } = req.body;
    const configPassword = process.env.CONFIG_PASSWORD;
    
    if (!configPassword) {
      return res.status(500).json({ 
        success: false, 
        message: 'Configuration password not set. Please set CONFIG_PASSWORD in .env file.' 
      });
    }

    // If password is provided, verify it
    if (password) {
      if (password === configPassword) {
        return res.json({ success: true, message: 'Password verified' });
      } else {
        return res.status(401).json({ success: false, message: 'Invalid password' });
      }
    }

    // If token (2FA) is provided, verify it
    if (token) {
      // Get 2FA secret from config file (login is always handled by Firebase)
      try {
        const config = await readConfig();
        
        if (!config.twoFactorAuth || !config.twoFactorAuth.enabled || !config.twoFactorAuth.secret) {
          return res.status(400).json({ success: false, message: '2FA not enabled' });
        }

        const secret = config.twoFactorAuth.secret;
        const verified = speakeasy.totp.verify({
          secret: secret,
          encoding: 'base32',
          token: token,
          window: 2
        });

        if (verified) {
          return res.json({ success: true, message: '2FA verified' });
        } else {
          return res.status(401).json({ success: false, message: 'Invalid 2FA code' });
        }
      } catch (error: any) {
        console.error('Error reading config for 2FA verification:', error);
        // Make sure we don't accidentally query MySQL - return error instead
        return res.status(500).json({ 
          success: false, 
          message: error.message || 'Failed to verify 2FA. Please ensure 2FA is enabled in system configuration.' 
        });
      }
    }

    return res.status(400).json({ success: false, message: 'Password or token required' });
  } catch (error: any) {
    console.error('Error verifying password:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Configuration API - Write config.json
app.post('/api/config', async (req, res) => {
  try {
    const { config, password, token } = req.body;
    
    // Validate config structure
    if (!config || typeof config !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid config data' });
    }

    // Verify password or 2FA token
    const configPassword = process.env.CONFIG_PASSWORD;
    if (!configPassword) {
      return res.status(500).json({ 
        success: false, 
        message: 'Configuration password not set. Please set CONFIG_PASSWORD in .env file.' 
      });
    }

    let verified = false;

    // Try password first
    if (password && password === configPassword) {
      verified = true;
    } 
    // If password failed or not provided, try 2FA token
    else if (token) {
      try {
        // Get 2FA secret from config file (login is always handled by Firebase)
        const config = await readConfig();
        
        if (config.twoFactorAuth && config.twoFactorAuth.enabled && config.twoFactorAuth.secret) {
          const secret = config.twoFactorAuth.secret;
          verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 2
          });
        }
      } catch (error: any) {
        console.error('Error reading config for 2FA verification:', error);
        // Don't query MySQL - just set verified to false if config read fails
        verified = false;
      }
    }

    if (!verified) {
      return res.status(401).json({ success: false, message: 'Invalid password or 2FA token' });
    }

    // Ensure directory exists
    const configDir = path.dirname(CONFIG_FILE_PATH);
    await fs.mkdir(configDir, { recursive: true });

    // Don't save administratorEmail to config.json - it comes from .env
    // Remove it from config before saving
    const configToSave = { ...config };
    delete configToSave.administratorEmail;

    // Write config file
    await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(configToSave, null, 2), 'utf-8');
    
    res.json({ success: true, message: 'Configuration saved successfully' });
  } catch (error: any) {
    console.error('Error writing config:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/test-mysql-connection', async (req, res) => {
  const { host, port, user, password, database } = req.body;

  try {
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
    });
    await connection.end();
    res.status(200).json({ success: true, message: 'Successfully connected to MySQL.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Sections API
app.get('/api/sections', async (req, res) => {
  console.log('GET /api/sections hit');
  try {
    const [rows] = await pool.query('SELECT * FROM sections');
    console.log('Sections data:', rows);
    res.json(rows);
  } catch (error: any) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/sections', async (req, res) => {
  const { id, name, codeId } = req.body;
  try {
    const [result] = await pool.execute(
      'INSERT INTO sections (id, name, codeId) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = ?, codeId = ?',
      [id, name, codeId, name, codeId]
    );
    res.status(201).json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/sections/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.execute('DELETE FROM sections WHERE id = ?', [id]);
    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Groups API
app.get('/api/groups', async (req, res) => {
  console.log('GET /api/groups hit');
  try {
    const [groups] = await pool.query('SELECT * FROM `groups`');
    console.log('Groups data:', groups);
    for (const group of groups as any[]) {
        const [salaries] = await pool.query('SELECT month, amount FROM group_salaries WHERE groupId = ?', [group.id]);
        group.salaryHistory = salaries;
        const [otPayments] = await pool.query('SELECT month, amount FROM group_ot_payments WHERE groupId = ?', [group.id]);
        group.otPaymentHistory = otPayments;
    }
    console.log('Groups data with salaries and OT payments:', groups);
    res.json(groups);
  } catch (error: any) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/groups', async (req, res) => {
    const { id, name, codeId, sectionId, salaryHistory, otPaymentHistory } = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await connection.execute(
            'INSERT INTO `groups` (id, name, codeId, sectionId) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = ?, codeId = ?, sectionId = ?',
            [id, name, codeId, sectionId, name, codeId, sectionId]
        );
        
        // Handle salary history
        if (salaryHistory && salaryHistory.length > 0) {
            await connection.execute('DELETE FROM group_salaries WHERE groupId = ?', [id]);
            for (const record of salaryHistory) {
                await connection.execute('INSERT INTO group_salaries (groupId, month, amount) VALUES (?, ?, ?)', [id, record.month, record.amount]);
            }
        }
        
        // Handle OT payment history
        // Always delete existing records first, then insert new ones (even if empty array)
        await connection.execute('DELETE FROM group_ot_payments WHERE groupId = ?', [id]);
        if (otPaymentHistory && otPaymentHistory.length > 0) {
            for (const record of otPaymentHistory) {
                await connection.execute('INSERT INTO group_ot_payments (groupId, month, amount) VALUES (?, ?, ?)', [id, record.month, record.amount]);
            }
        }
        
        await connection.commit();
        res.status(201).json({ success: true });
    } catch (error: any) {
        await connection.rollback();
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
});

app.delete('/api/groups/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute('DELETE FROM `groups` WHERE id = ?', [id]);
        res.status(200).json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Employees API
app.get('/api/employees', async (req, res) => {
    console.log('GET /api/employees hit');
    try {
        const [rows] = await pool.query('SELECT * FROM employees');
        console.log('Employees data:', rows);
        res.json(rows);
    } catch (error: any) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/employees/section/:sectionId', async (req, res) => {
    const { sectionId } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM employees WHERE sectionId = ?', [sectionId]);
        res.json(rows);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/employees', async (req, res) => {
    const { id, fullName, nic, employeeNumber, phoneNumber, address, sectionId, groupId, joinedDate } = req.body;
    try {
        await pool.execute(
            'INSERT INTO employees (id, fullName, nic, employeeNumber, phoneNumber, address, sectionId, groupId, joinedDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE fullName = ?, nic = ?, employeeNumber = ?, phoneNumber = ?, address = ?, sectionId = ?, groupId = ?, joinedDate = ?',
            [id, fullName, nic, employeeNumber, phoneNumber, address, sectionId, groupId, joinedDate, fullName, nic, employeeNumber, phoneNumber, address, sectionId, groupId, joinedDate]
        );
        res.status(201).json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/employees/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute('DELETE FROM employees WHERE id = ?', [id]);
        res.status(200).json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Attendance API
app.get('/api/attendance-records', async (req, res) => {
    try {
        const [records] = await pool.query('SELECT * FROM attendance_records');
        for (const record of records as any[]) {
            const [attendance] = await pool.query('SELECT * FROM attendance_data WHERE recordId = ?', [record.id]);
            const [metadata] = await pool.query('SELECT * FROM employee_attendance_metadata WHERE recordId = ?', [record.id]);

            const metadataMap = (metadata as any[]).reduce((acc, meta) => {
                acc[meta.employeeId] = meta.additional_shifts;
                return acc;
            }, {} as { [key: string]: number });

            const attendanceData = (attendance as any[]).reduce((acc, ad) => {
                if (!acc[ad.employeeId]) {
                    acc[ad.employeeId] = { daily: {}, additionalShifts: 0 };
                }
                acc[ad.employeeId].daily[ad.day] = {
                    day: ad.day_status,
                    night: ad.night_status,
                    dayHalf: ad.day_half_status,
                    nightHalf: ad.night_half_status,
                };
                return acc;
            }, {} as any);

            // Merge metadata into the final structure
            for (const empId in metadataMap) {
                if (!attendanceData[empId]) {
                    attendanceData[empId] = { daily: {}, additionalShifts: 0 };
                }
                attendanceData[empId].additionalShifts = metadataMap[empId];
            }

            // Ensure all employees in attendanceData have the additionalShifts field
            for (const empId in attendanceData) {
                if (!attendanceData[empId].additionalShifts) {
                    attendanceData[empId].additionalShifts = 0;
                }
            }
            
            record.attendanceData = attendanceData;
        }
        res.json(records);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/attendance-record/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [records] = await pool.query('SELECT * FROM attendance_records WHERE id = ?', [id]);
        if ((records as any[]).length === 0) {
            return res.status(404).json({ success: false, message: 'Record not found' });
        }
        const record = (records as any[])[0];
        const [attendance] = await pool.query('SELECT * FROM attendance_data WHERE recordId = ?', [record.id]);
        const [metadata] = await pool.query('SELECT * FROM employee_attendance_metadata WHERE recordId = ?', [record.id]);

        const metadataMap = (metadata as any[]).reduce((acc, meta) => {
            acc[meta.employeeId] = meta.additional_shifts;
            return acc;
        }, {} as { [key: string]: number });

        const attendanceData = (attendance as any[]).reduce((acc, ad) => {
            if (!acc[ad.employeeId]) {
                acc[ad.employeeId] = { daily: {}, additionalShifts: 0 };
            }
            acc[ad.employeeId].daily[ad.day] = {
                day: ad.day_status,
                night: ad.night_status,
                dayHalf: ad.day_half_status,
                nightHalf: ad.night_half_status,
            };
            return acc;
        }, {} as any);

        // Merge metadata into the final structure
        for (const empId in metadataMap) {
            if (!attendanceData[empId]) {
                attendanceData[empId] = { daily: {}, additionalShifts: 0 };
            }
            attendanceData[empId].additionalShifts = metadataMap[empId];
        }

        // Ensure all employees in attendanceData have the additionalShifts field
        for (const empId in attendanceData) {
            if (!attendanceData[empId].additionalShifts) {
                attendanceData[empId].additionalShifts = 0;
            }
        }

        record.attendanceData = attendanceData;
        res.json(record);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/attendance-records', async (req, res) => {
    const { id, year, month, sectionId, attendanceData } = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await connection.execute(
            'INSERT INTO attendance_records (id, year, month, sectionId) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE year = ?, month = ?, sectionId = ?',
            [id, year, month, sectionId, year, month, sectionId]
        );

        if (attendanceData) {
            // Clear previous data for this record
            await connection.execute('DELETE FROM attendance_data WHERE recordId = ?', [id]);
            await connection.execute('DELETE FROM employee_attendance_metadata WHERE recordId = ?', [id]);

            for (const employeeId in attendanceData) {
                const employeeData = attendanceData[employeeId];

                // Save daily attendance
                if (employeeData.daily) {
                    for (const day in employeeData.daily) {
                        const status = employeeData.daily[day];
                        await connection.execute(
                            'INSERT INTO attendance_data (recordId, employeeId, day, day_status, night_status, day_half_status, night_half_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                            [id, employeeId, Number(day), status.day, status.night, status.dayHalf, status.nightHalf]
                        );
                    }
                }

                // Save additional shifts if they exist
                if (employeeData.additionalShifts && employeeData.additionalShifts > 0) {
                    await connection.execute(
                        'INSERT INTO employee_attendance_metadata (recordId, employeeId, additional_shifts) VALUES (?, ?, ?)',
                        [id, employeeId, employeeData.additionalShifts]
                    );
                }
            }
        }
        await connection.commit();
        res.status(201).json({ success: true });
    } catch (error: any) {
        await connection.rollback();
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
});

app.delete('/api/attendance-records/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute('DELETE FROM attendance_records WHERE id = ?', [id]);
        res.status(200).json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Prepayments API
app.get('/api/prepayments', async (req, res) => {
    try {
        // Explicitly select all columns including id
        const [rows] = await pool.query('SELECT id, type, month, employeeId, amount, reason, createdAt FROM prepayments ORDER BY createdAt DESC');
        const rowsArray = rows as any[];
        console.log('Raw MySQL rows count:', rowsArray.length);
        if (rowsArray.length > 0) {
            console.log('First row raw:', rowsArray[0]);
            console.log('First row keys:', Object.keys(rowsArray[0]));
        }
        
        // Convert MySQL DATETIME to ISO string format and ensure amount is a number
        // Also ensure id field is properly included
        const formattedRows = rowsArray.map((row, index) => {
            // Get ID from row - check all possible variations
            const rowId = row.id || row.ID || row.Id;
            
            if (!rowId) {
                console.error(`Row ${index} has no ID! Row data:`, row);
                // Generate a new ID for records that don't have one (shouldn't happen, but handle it)
                const newId = generateUUID();
                console.warn(`Generated new ID ${newId} for row ${index} without ID`);
                // Update the database with the new ID
                pool.execute('UPDATE prepayments SET id = ? WHERE createdAt = ? AND employeeId = ? AND month = ? LIMIT 1', 
                    [newId, row.createdAt, row.employeeId, row.month]).catch(err => {
                    console.error('Failed to update prepayment ID:', err);
                });
                return {
                    id: newId,
                    type: row.type,
                    month: row.month,
                    employeeId: row.employeeId || row.employee_id,
                    amount: typeof row.amount === 'string' ? parseFloat(row.amount) : Number(row.amount),
                    reason: row.reason || null,
                    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString()
                };
            }
            
            const formatted = {
                id: rowId,
                type: row.type,
                month: row.month,
                employeeId: row.employeeId || row.employee_id,
                amount: typeof row.amount === 'string' ? parseFloat(row.amount) : Number(row.amount),
                reason: row.reason || null,
                createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString()
            };
            return formatted;
        });
        res.json(formattedRows);
    } catch (error: any) {
        console.error('Error fetching prepayments:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Generate UUID for prepayments
const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

app.post('/api/prepayments', async (req, res) => {
    const { id, type, month, employeeId, amount, reason } = req.body;
    try {
        // Generate UUID if ID is missing or empty
        const prepaymentId = (id && id.trim() !== '') ? id : generateUUID();
        console.log('Saving prepayment with ID:', prepaymentId);
        
        // createdAt is now auto-generated by MySQL, so we don't need to pass it
        await pool.execute(
            'INSERT INTO prepayments (id, type, month, employeeId, amount, reason) VALUES (?, ?, ?, ?, ?, ?)',
            [prepaymentId, type, month, employeeId, amount, reason || null]
        );
        res.status(201).json({ success: true, id: prepaymentId });
    } catch (error: any) {
        console.error('Error saving prepayment:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/prepayments/:id', async (req, res) => {
    const { id } = req.params;
    console.log('DELETE /api/prepayments/:id called with id:', id);
    try {
        if (!id) {
            return res.status(400).json({ success: false, message: 'Prepayment ID is required' });
        }
        const [result] = await pool.execute('DELETE FROM prepayments WHERE id = ?', [id]);
        const deleteResult = result as any;
        if (deleteResult.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Prepayment not found' });
        }
        res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('Error deleting prepayment:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// MySQL Backup and Restore API
app.get('/api/mysql-backup', (req, res) => {
    const dbName = process.env.DB_DATABASE;
    const user = process.env.DB_USER;
    const password = process.env.DB_PASSWORD;
    const host = process.env.DB_HOST;
    const port = process.env.DB_PORT;
    const dumpPath = process.env.MYSQLDUMP_PATH || 'mysqldump';
    
    let finalDumpPath = dumpPath;
    // If a custom path is provided and it's a directory, append the executable name.
    if (dumpPath !== 'mysqldump' && !dumpPath.toLowerCase().endsWith('.exe')) {
        finalDumpPath = path.join(dumpPath, 'mysqldump.exe');
    }

    if (!dbName || !user || !password || !host || !port) {
        return res.status(500).json({ success: false, message: 'Database environment variables are not fully configured.' });
    }
    
    const mysqldump = spawn(finalDumpPath, [
        `--host=${host}`,
        `--port=${port}`,
        `--user=${user}`,
        `--password=${password}`,
        dbName,
    ]);

    let sqlContent = '';
    let errorOutput = '';

    mysqldump.stdout.on('data', (data) => {
        sqlContent += data.toString();
    });

    mysqldump.stderr.on('data', (data) => {
        const errorString = data.toString();
        console.error(`mysqldump stderr: ${errorString}`);
        errorOutput += errorString;
    });
    
    mysqldump.on('error', (error) => {
        console.error(`mysqldump process error: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            message: `Backup process error: ${error.message}. Is mysqldump installed and in your system's PATH?` 
        });
    });

    mysqldump.on('close', (code) => {
        console.log(`mysqldump process exited with code ${code}`);
        if (code !== 0) {
            return res.status(500).json({ 
                success: false, 
                message: `Backup failed with exit code ${code}. Error: ${errorOutput}` 
            });
        }
        
        const date = new Date().toISOString().slice(0, 10);
        const filename = `dns_manpower_backup_${date}.sql`;
        
        // Return JSON with SQL content and filename
        res.json({
            success: true,
            filename: filename,
            content: sqlContent
        });
    });
});

app.post('/api/mysql-restore', async (req, res) => {
    const sql = req.body;
    if (typeof sql !== 'string' || !sql.trim()) {
        return res.status(400).json({ success: false, message: 'Request body must contain SQL content.' });
    }

    try {
        await pool.query(sql);
        res.status(200).json({ success: true, message: 'Database restored successfully.' });
    } catch (error: any) {
        console.error('Error during database restore:', error);
        res.status(500).json({ success: false, message: `Restore failed: ${error.message}` });
    }
});

// Helper function to read config
const readConfig = async () => {
    try {
        const configData = await fs.readFile(CONFIG_FILE_PATH, 'utf-8');
        return JSON.parse(configData);
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            return { dbType: 'firebase', mysqlConfig: {}, firebaseConfig: {}, recaptchaConfig: {}, twoFactorAuth: { enabled: false } };
        }
        throw error;
    }
};

// Delete user from Firebase Auth (requires Admin SDK)
app.delete('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    // Ensure Firebase Admin is initialized
    await initializeFirebaseAdmin();

    // Check if Firebase Admin is initialized
    if (!admin.apps.length) {
      return res.status(500).json({ 
        success: false, 
        message: 'Firebase Admin SDK not initialized. Please configure FIREBASE_SERVICE_ACCOUNT_PATH in .env file with path to your Firebase service account JSON file.' 
      });
    }

    try {
      // Delete user from Firebase Auth
      await admin.auth().deleteUser(userId);
      res.status(200).json({ success: true, message: 'User deleted from Firebase Auth' });
    } catch (error: any) {
      // If user doesn't exist in Auth, that's okay - they might have been deleted already
      if (error.code === 'auth/user-not-found') {
        res.status(200).json({ success: true, message: 'User not found in Firebase Auth (may have been deleted already)' });
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    console.error('Error deleting user from Firebase Auth:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete user from Firebase Auth' });
  }
});

// Helper function to write config
const writeConfig = async (config: any) => {
    const configDir = path.dirname(CONFIG_FILE_PATH);
    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8');
};

// 2FA API - Generate secret and QR code (user-specific)
app.post('/api/2fa/generate-secret', async (req, res) => {
    try {
        const { userId, email } = req.body;

        if (!userId || !email) {
            return res.status(400).json({ success: false, message: 'UserId and email are required' });
        }
        
        // Generate secret
        const secret = speakeasy.generateSecret({
            name: `DNS Manpower (${email})`,
            issuer: 'DNS Manpower Management',
            length: 32
        });

        // Generate QR code
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

        res.json({
            success: true,
            secret: secret.base32,
            qrCode: qrCodeUrl,
            manualEntryKey: secret.base32
        });
    } catch (error: any) {
        console.error('Error generating 2FA secret:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2FA API - Verify and Enable 2FA (user-specific)
app.post('/api/2fa/enable', async (req, res) => {
    try {
        const { userId, secret, token } = req.body;

        if (!userId || !secret || !token) {
            return res.status(400).json({ success: false, message: 'UserId, secret, and token are required' });
        }

        // Verify the token
        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 2 // Allow 2 time steps (60 seconds) of tolerance
        });

        if (!verified) {
            return res.status(400).json({ success: false, message: 'Invalid verification code. Please try again.' });
        }

        // Note: The frontend will save to Firestore directly
        // This endpoint just verifies the token is valid
        res.json({ success: true, message: 'Two-factor authentication enabled successfully' });
    } catch (error: any) {
        console.error('Error enabling 2FA:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2FA API - Verify TOTP code (user-specific, accepts secret from frontend)
app.post('/api/2fa/verify', async (req, res) => {
    try {
        const { userId, token, secret } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, message: 'Token is required' });
        }

        if (!secret) {
            return res.status(400).json({ success: false, message: 'Secret is required for verification' });
        }

        // Verify the token
        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 2 // Allow 2 time steps (60 seconds) of tolerance
        });

        if (!verified) {
            return res.status(400).json({ success: false, message: 'Invalid verification code' });
        }

        res.json({ success: true, message: 'Verification successful' });
    } catch (error: any) {
        console.error('Error verifying 2FA:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2FA API - Disable 2FA (user-specific)
app.post('/api/2fa/disable', async (req, res) => {
    try {
        const { userId, token, secret } = req.body;
        
        if (!token) {
            return res.status(400).json({ success: false, message: '2FA verification code is required' });
        }

        if (!secret) {
            return res.status(400).json({ success: false, message: 'Secret is required for verification' });
        }

        // Verify the token before disabling
        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 2 // Allow 2 time steps (60 seconds) of tolerance
        });

        if (!verified) {
            return res.status(400).json({ success: false, message: 'Invalid verification code. Please try again.' });
        }

        // Note: The frontend will update Firestore directly
        // This endpoint just verifies the token is valid
        res.json({ success: true, message: 'Two-factor authentication disabled successfully' });
    } catch (error: any) {
        console.error('Error disabling 2FA:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2FA API - Get 2FA status (user-specific)
app.get('/api/2fa/status', async (req, res) => {
    try {
        const { userId } = req.query;
        
        // Note: The frontend will read from Firestore directly
        // This endpoint is kept for backward compatibility but returns false
        // The frontend should use Firestore to get the actual status
        res.json({
            success: true,
            enabled: false // Frontend should check Firestore
        });
    } catch (error: any) {
        console.error('Error getting 2FA status:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// reCAPTCHA API - Verify reCAPTCHA token
app.post('/api/recaptcha/verify', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, message: 'reCAPTCHA token is required' });
        }

        // Try to get secret key from config.json first, then fallback to environment variable
        const config = await readConfig();
        
        // Check if reCAPTCHA is enabled
        if (!config.recaptchaConfig?.enabled) {
            // If reCAPTCHA is disabled, allow the request
            return res.json({ success: true, message: 'reCAPTCHA verification skipped (disabled)' });
        }
        
        const recaptchaSecretKey = config.recaptchaConfig?.secretKey || process.env.RECAPTCHA_SECRET_KEY;
        
        if (!recaptchaSecretKey) {
            // If secret key is not configured, allow the request (for development)
            console.warn('reCAPTCHA secret key not configured, skipping verification');
            return res.json({ success: true, message: 'reCAPTCHA verification skipped (not configured)' });
        }

        // Verify token with Google reCAPTCHA API
        const verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
        const response = await fetch(verifyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `secret=${recaptchaSecretKey}&response=${token}`
        });

        const data = await response.json();

        if (data.success) {
            res.json({ 
                success: true, 
                message: 'reCAPTCHA verification successful',
                score: data.score // For v3, includes a score (0.0 to 1.0)
            });
        } else {
            res.status(400).json({ 
                success: false, 
                message: 'reCAPTCHA verification failed',
                errors: data['error-codes'] || []
            });
        }
    } catch (error: any) {
        console.error('Error verifying reCAPTCHA:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
