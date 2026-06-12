const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const chatRoutes = require('./routes/chatRoutes');

const app = express();

// CORS is open for development, but in production, both run on the same domain
app.use(cors()); 
app.use(express.json());

// API Routes
app.use('/api', chatRoutes);

// --- 🚀 DEPLOYMENT LOGIC (Serve Frontend) ---
// Find the frontend build directory
const frontendDistPath = path.join(__dirname, '../frontend/dist');

// Serve static files from the React app
app.use(express.static(frontendDistPath));

// Catch-all route to serve index.html for any unknown routes (React Router support)
app.get('/*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
});
// --------------------------------------------

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));