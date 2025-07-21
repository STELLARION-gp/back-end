const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5174'
    ],
    credentials: true
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// Test endpoint without authentication
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'Backend is working',
        timestamp: new Date().toISOString()
    });
});

// Start server
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`✅ Test server running on http://localhost:${PORT}`);
    console.log('📡 Test endpoint: http://localhost:5000/api/test');
    console.log('❤️  Health check: http://localhost:5000/health');
});
