import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  // অ্যাপ থেকে ডেটা রিসিভ করার অনুমতি
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ব্রাউজার থেকে চেক করার জন্য
  if (req.method === 'GET') {
    return res.status(200).json({ success: true, message: 'Backend is ready to receive data from the Flutter App!' });
  }

  // অ্যাপ যখন ডেটা পাঠাবে (POST)
  if (req.method === 'POST') {
    try {
      const results = req.body;

      if (!results || !Array.isArray(results)) {
        return res.status(400).json({ success: false, error: 'Invalid data format from app' });
      }

      const client = await pool.connect();

      await client.query(`
        CREATE TABLE IF NOT EXISTS wingo_history (
          issue_id VARCHAR(255) PRIMARY KEY,
          number INTEGER NOT NULL,
          color VARCHAR(255) NOT NULL,
          signal VARCHAR(50) NOT NULL,
          fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      for (const item of results) {
        const num = parseInt(item.number);
        const signal = (num >= 0 && num <= 4) ? 'SMALL' : (num >= 5 && num <= 9) ? 'BIG' : 'UNKNOWN';

        await client.query(`
          INSERT INTO wingo_history (issue_id, number, color, signal)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (issue_id) DO NOTHING;
        `, [item.issueNumber, num, item.color, signal]);
      }

      client.release();
      return res.status(200).json({ success: true, message: 'Data saved successfully from App!' });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}
