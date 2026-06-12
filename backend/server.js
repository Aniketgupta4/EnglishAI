const express = require('express');
const cors = require('cors');
require('dotenv').config();
const chatRoutes = require('./routes/chatRoutes');

const app = express();
app.use(cors({ origin: 'http://localhost:5173' })); 
app.use(express.json());

// API Routes
app.use('/api', chatRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));