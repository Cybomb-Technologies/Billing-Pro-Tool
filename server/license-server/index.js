// license-server/index.js (simplified)
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken'); // npm i jsonwebtoken
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(bodyParser.json());

const JWT_PRIVATE = process.env.JWT_SECRET || 'change_this_secret';
const LICENSES = { 'LIC-CLIENTA-001': { customerId: 'clientA', seats: 10 } }; // replace DB

app.post('/license/activate', (req, res) => {
  const { licenseKey, deviceId } = req.body;
  const lic = LICENSES[licenseKey];
  if (!lic) return res.status(400).json({ error: 'Invalid license' });

  // optionally check seats, expiry, allowed domains etc.
  const sessionId = uuidv4();
  const accessToken = jwt.sign({
    sub: lic.customerId,
    sessionId,
    deviceId
  }, JWT_PRIVATE, { expiresIn: '15m' });

  const refreshToken = jwt.sign({
    sub: lic.customerId,
    sessionId,
  }, JWT_PRIVATE, { expiresIn: '30d' });

  // persist sessionId => device mapping in DB (omitted)
  return res.json({ accessToken, refreshToken, customerId: lic.customerId });
});

app.post('/license/refresh', (req, res) => {
  const { refreshToken } = req.body;
  try {
    const payload = jwt.verify(refreshToken, JWT_PRIVATE);
    const accessToken = jwt.sign({ sub: payload.sub, sessionId: payload.sessionId }, JWT_PRIVATE, { expiresIn: '15m' });
    return res.json({ accessToken });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid refresh' });
  }
});

app.listen(4001, () => console.log('License server listening on 4001'));
