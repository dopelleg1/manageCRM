import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'crm-super-secret-key-12345';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
await fs.mkdir(UPLOADS_DIR, { recursive: true });

app.use(cors({ origin: '*' })); // Allow any origin for simplicity during development/preview
app.use(express.json());

// Set up file upload storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// --- AUTH ROUTE ---
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const agent = await prisma.agents.findFirst({
      where: { email }
    });

    if (!agent) {
      return res.status(400).json({ error: 'Invalid login credentials' });
    }

    const isPasswordValid = agent.password 
      ? await bcrypt.compare(password, agent.password) 
      : password === 'Lbh1108a!'; // default fallback password for bootstrap

    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid login credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: agent.id, email: agent.email, role: agent.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      session: {
        access_token: token,
        token_type: 'bearer',
        expires_in: 604800,
        user: {
          id: agent.id,
          email: agent.email,
          user_metadata: { name: agent.name, role: agent.role }
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password and name are required' });
  }

  try {
    const existing = await prisma.agents.findFirst({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Agent already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    const newAgent = await prisma.agents.create({
      data: {
        id: userId,
        email,
        name,
        password: hashedPassword,
        role: role || 'agente',
        color: '#3b82f6'
      }
    });

    res.json({ success: true, user: { id: newAgent.id, email: newAgent.email } });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// --- GENERIC DATABASE CRUD PORT (SUPABASE EMULATOR) ---
app.post('/api/db/query', async (req, res) => {
  const { table, action, data, filters, limit, order, single } = req.body;

  if (!table) {
    return res.status(400).json({ error: 'Table name is required' });
  }

  try {
    const where = {};
    if (filters && Array.isArray(filters)) {
      for (const filter of filters) {
        const { type, column, value } = filter;
        if (type === 'eq') {
          where[column] = value;
        } else if (type === 'neq') {
          where[column] = { not: value };
        } else if (type === 'gt') {
          where[column] = { gt: value };
        } else if (type === 'gte') {
          where[column] = { gte: value };
        } else if (type === 'lt') {
          where[column] = { lt: value };
        } else if (type === 'lte') {
          where[column] = { lte: value };
        } else if (type === 'in') {
          where[column] = { in: value };
        } else if (type === 'contains') {
          where[column] = { contains: value };
        }
      }
    }

    let result = null;

    const serializeResult = (obj) => {
      return JSON.parse(JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ));
    };

    switch (action) {
      case 'select':
        if (single) {
          result = await prisma[table].findFirst({ where });
        } else {
          const queryOptions = { where };
          if (limit) queryOptions.take = limit;
          if (order) {
            queryOptions.orderBy = { [order.column]: order.ascending ? 'asc' : 'desc' };
          }
          result = await prisma[table].findMany(queryOptions);
        }
        break;

      case 'insert':
        if (Array.isArray(data)) {
          result = await prisma[table].createMany({ data });
        } else {
          result = await prisma[table].create({ data });
        }
        break;

      case 'update':
        if (where.id) {
          result = await prisma[table].update({
            where: { id: where.id },
            data
          });
        } else {
          result = await prisma[table].updateMany({
            where,
            data
          });
        }
        break;

      case 'delete':
        if (where.id) {
          result = await prisma[table].delete({
            where: { id: where.id }
          });
        } else {
          result = await prisma[table].deleteMany({
            where
          });
        }
        break;

      default:
        return res.status(400).json({ error: `Unsupported database action: ${action}` });
    }

    res.json({ data: serializeResult(result), error: null });

  } catch (error) {
    console.error(`Database query error on table ${table}:`, error);
    res.status(500).json({ data: null, error: error.message });
  }
});

// --- STORAGE ROUTES ---
app.post('/api/storage/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const relativePath = req.file.filename;
  res.json({ data: { path: relativePath }, error: null });
});

app.get('/api/storage/download/:filename', async (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(UPLOADS_DIR, filename);

  try {
    await fs.access(filePath);
    res.sendFile(filePath);
  } catch (error) {
    res.status(404).json({ error: 'File not found' });
  }
});

app.delete('/api/storage/delete/:filename', async (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(UPLOADS_DIR, filename);

  try {
    await fs.unlink(filePath);
    res.json({ data: true, error: null });
  } catch (error) {
    // Return success anyway to avoid blocking database deletion
    res.json({ data: false, error: null });
  }
});

// --- STATIC FILES SERVING (Single-server deployment) ---
const DIST_DIR = path.join(__dirname, '../dist');
app.use(express.static(DIST_DIR));

// Serve index.html for any other route to support client-side routing (React Router)
app.get('*', (req, res) => {
  // If request is for an API route that didn't match, return 404
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 API Server running on port ${PORT}`);
});
