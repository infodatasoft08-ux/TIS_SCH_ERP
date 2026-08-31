const jwt = require('jsonwebtoken');
require('dotenv').config();

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token' });
  const token = authHeader.split(' ')[1];
  try {
    const secret = process.env.JWT_SECRET || 'SECRET_KEY';
    const payload = jwt.verify(token, secret);
    req.user = payload;

    // Rolling session extension:
    // If token is older than 24 hours (86400s), issue a refreshed token for 30d
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (payload.iat && (nowInSeconds - payload.iat) > 86400) {
      try {
        const { iat, exp, nbf, jti, ...userPayload } = payload;
        const newToken = jwt.sign(userPayload, secret, { expiresIn: '30d' });
        res.setHeader('x-refreshed-token', newToken);
        res.setHeader('Access-Control-Expose-Headers', 'x-refreshed-token');
      } catch (refreshErr) {
        console.error('Error refreshing token in middleware:', refreshErr);
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = authMiddleware;