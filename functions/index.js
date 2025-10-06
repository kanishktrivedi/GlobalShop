import functions from 'firebase-functions';
import admin from 'firebase-admin';
import corsLib from 'cors';
import fetch from 'node-fetch';

admin.initializeApp();
const cors = corsLib({ origin: true });

// Callable HTTP function to fetch secure FX rates via server
export const getRates = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { base, target } = req.query;
      if (!base) {
        res.status(400).json({ error: 'Missing base' });
        return;
      }
      const apiKey = functions.config().exchangerate.key; // set with: firebase functions:config:set exchangerate.key="YOUR_KEY"
      if (!apiKey) {
        res.status(500).json({ error: 'Server not configured' });
        return;
      }
      const url = target
        ? `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${encodeURIComponent(base)}/${encodeURIComponent(target)}`
        : `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${encodeURIComponent(base)}`;
      const r = await fetch(url);
      if (!r.ok) {
        const txt = await r.text();
        res.status(502).json({ error: 'Upstream error', details: txt });
        return;
      }
      const data = await r.json();
      res.set('Cache-Control', 'public, max-age=60');
      res.status(200).json(data);
    } catch (e) {
      res.status(500).json({ error: 'Internal error' });
    }
  });
});


