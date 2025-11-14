// server.js
const express = require('express');
const connectDB = require('./config/connectDB');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const fs = require('fs');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const onboardingRoutes = require('./routes/onboardingRoutes');
const verifyToken = require('./middleware/verifyTokenHandler');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Register Mongoose models
require('./models/userModel');

// Passport config (Google login, etc.)
require('./config/passport')();

const app = express();
const server = http.createServer(app);


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: process.env.FRONTEND_APP_URL || 'http://localhost:8080',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key', 'Authorization', 'session_logininfo'],
}));
app.options(/.*/, cors());


// Session & passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

// Static file serving with per-folder fallback
const serveWithFallback = (urlPath, folderPath, fallbackFile) => {
  app.use(urlPath, express.static(folderPath));

  app.get(`${urlPath}/:filename`, (req, res) => {
    const filePath = path.join(folderPath, req.params.filename);

    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        res.sendFile(fallbackFile);
      } else {
        res.sendFile(filePath);
      }
    });
  });
};



app.use('/api/users',verifyToken, userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/onboarding',onboardingRoutes);

// Health check and root
app.get('/', (req, res) => res.send('Server is up and running!'));
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', uptime: process.uptime() }));

// Error handling
app.use((err, req, res, next) => {
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  console.error('Error middleware:', { message: err.message, statusCode, stack: err.stack });
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

// Catch unhandled promises and exceptions
process.on('unhandledRejection', (err) => console.error('Unhandled Rejection:', err));
process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));

// Start server
const HOST = '0.0.0.0';
const PORT = process.env.PORT || 5000;
server.listen(PORT, HOST, () => console.log(`App is running on port: ${PORT}`));

// Export server and getIO for use in other modules
module.exports = {
  server,
  getIO,
};