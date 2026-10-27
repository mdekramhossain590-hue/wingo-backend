import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const API_URL = 'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?pageNo=1&pageSize=10';

export default async function handler(req, res) {
  try {
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

    const response = await fetch(API_URL);
    const data = await response.json();
    const results = data.data.list;

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
    res.status(200).json({ success: true, message: 'Data updated successfully via Neon!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
