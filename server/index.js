const express = require('express');
const cors = require('cors');
require('dotenv').config();

const cvRoutes = require('./routes/cv');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ✅ Health check (fixes "HTTP 500" for unknown routes)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/cv', cvRoutes);

// ✅ Proper error handler so you never get a bare 500
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.url}` });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));