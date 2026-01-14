require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const routes = require('./routes/index');
const usersRoute = require('./routes/users');
const projectsRoute = require('./routes/projects');
const tasksRoute = require('./routes/tasks');
const groupsRoute = require('./routes/groups');
const groupMembersRoute = require('./routes/groupMembers');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware (prints method, path, status, timing and JSON body when present)
app.use((req, res, next) => {
  const start = Date.now();
  const now = new Date().toISOString();
  if (req.body && Object.keys(req.body).length) {
    try {
      console.log(`[${now}] ${req.method} ${req.originalUrl} - body: ${JSON.stringify(req.body)}`);
    } catch (e) {
      console.log(`[${now}] ${req.method} ${req.originalUrl} - body: <unserializable>`);
    }
  } else {
    console.log(`[${now}] ${req.method} ${req.originalUrl}`);
  }

  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });

  next();
});

// Routes
app.use('/api/data', routes);
app.use('/api/users', usersRoute);
app.use('/api/projects', projectsRoute);
app.use('/api/tasks', tasksRoute);
app.use('/api/groups', groupsRoute);
app.use('/api/group-members', groupMembersRoute);
app.use('/api/reports', reportRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to BeeFriendz Backend API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📊 Supabase connected: ${process.env.SUPABASE_URL ? 'Yes' : 'No'}`);
});

module.exports = app;
