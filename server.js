const express = require('express');
const { verifyEmail } = require('./index');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check 
app.get('/', (req, res) => {
  res.json({
    service: 'Email Verification API',
    status: 'running',
    endpoints: {
      GET: '/verify?email=user@example.com',
      POST: '/verify  →  body: { "email": "user@example.com" }',
    },
  });
});


app.get('/verify', async (req, res) => {
  const email = req.query.email;

  if (!email) {
    return res.status(400).json({
      error: 'Missing query parameter: email',
      usage: '/verify?email=user@example.com',
    });
  }

  try {
    const result = await verifyEmail(email);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});


app.post('/verify', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      error: 'Missing field in request body: email',
      usage: '{ "email": "user@example.com" }',
    });
  }

  try {
    const result = await verifyEmail(email);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  
});

module.exports = app;