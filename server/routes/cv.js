const express = require('express');
const router = express.Router();
const { generateCVContent, enhanceSection } = require('../services/aiService');

// POST /api/cv/generate
router.post('/generate', async (req, res, next) => {
    try {
        const { name, role, experience, skills, education, tone } = req.body;

        if (!name || !role) {
            return res.status(400).json({ error: 'name and role are required' });
        }

        const cv = await generateCVContent({ name, role, experience, skills, education, tone });
        res.json({ success: true, cv });
    } catch (err) {
        next(err);
    }
});

// POST /api/cv/enhance
router.post('/enhance', async (req, res, next) => {
    try {
        const { section, text } = req.body;
        if (!text) return res.status(400).json({ error: 'text is required' });

        const enhanced = await enhanceSection(section, text);
        res.json({ success: true, enhanced });
    } catch (err) {
        next(err);
    }
});

module.exports = router;