import express from 'express';
import crypto from 'crypto';

const router = express.Router();

function getSecret() {
  return process.env.JWT_SECRET || process.env.SESSION_SECRET || 'kambam_finance_secret_key_2026';
}

function generateAuthToken(password) {
  const payload = {
    auth: true,
    issuedAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  };
  const dataStr = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = crypto
    .createHmac('sha256', getSecret())
    .update(dataStr)
    .digest('hex');
  return `${dataStr}.${signature}`;
}

export function verifyAuthToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [dataStr, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', getSecret())
    .update(dataStr)
    .digest('hex');

  if (signature !== expectedSig) return false;

  try {
    const payload = JSON.parse(Buffer.from(dataStr, 'base64').toString('utf8'));
    if (!payload.auth) return false;
    if (payload.expiresAt && Date.now() > payload.expiresAt) return false;
    return true;
  } catch (err) {
    return false;
  }
}

// POST /api/app-auth/login
router.post('/login', (req, res) => {
  try {
    const { password } = req.body;
    const configuredPassword = process.env.APP_PASSWORD || process.env.POSTGRES_PASSWORD || '1607';

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    if (String(password).trim() !== String(configuredPassword).trim()) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password. Access denied.'
      });
    }

    const token = generateAuthToken(password);
    if (req.session) {
      req.session.isAppAuthenticated = true;
    }

    return res.json({
      success: true,
      message: 'Access granted',
      token
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/app-auth/verify
router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const isSessionAuth = req.session && req.session.isAppAuthenticated;

  if (isSessionAuth || (token && verifyAuthToken(token))) {
    return res.json({
      authenticated: true,
      message: 'Active session'
    });
  }

  return res.status(401).json({
    authenticated: false,
    message: 'Authentication required'
  });
});

// POST /api/app-auth/logout
router.post('/logout', (req, res) => {
  if (req.session) {
    req.session.isAppAuthenticated = false;
  }
  return res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

export default router;
