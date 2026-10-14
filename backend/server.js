require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const studentRoutes = require('./routes/studentRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS: only the Netlify frontend(s) listed in FRONTEND_URL may call this API from a browser.
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin(origin, cb) {
      // No Origin header = curl / Render health checks (browsers always send one on cross-origin calls).
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
  })
);
app.use(express.json({ limit: '10kb' }));

app.get('/', (req, res) => res.json({ success: true, message: 'Student API is running' }));
app.get('/health', (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ success: dbUp, database: dbUp ? 'connected' : 'disconnected' });
});

app.use('/api/students', studentRoutes);
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Central error handler: never leak stack traces or DB details to clients.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') return res.status(403).json({ success: false, message: 'Origin not allowed' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ success: false, message: 'Invalid JSON body' });
  if (err.code === 11000) return res.status(409).json({ success: false, message: 'A student with this studentId already exists' });
  if (err.name === 'ValidationError') return res.status(400).json({ success: false, message: 'Validation failed', errors: Object.values(err.errors).map((e) => e.message) });
  if (err.name === 'MongooseServerSelectionError') return res.status(503).json({ success: false, message: 'Database unavailable, please retry' });
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

connectDB()
  .then(() => app.listen(PORT, () => console.log(`API listening on port ${PORT}`)))
  .catch((err) => {
    console.error('Startup failed:', err.message);
    process.exit(1);
  });
