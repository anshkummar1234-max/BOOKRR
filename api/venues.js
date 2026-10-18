import { db } from 'hatchable';

export const access = 'public';
export const methods = ['GET'];

export default async function (req, res) {
  try {
    const result = await db.query(
      'SELECT id, name, area, sports, map_query FROM venues WHERE is_active = true ORDER BY name ASC LIMIT 100'
    );
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    return res.json({ venues: result.rows });
  } catch (error) {
    return res.status(500).json({ error: 'Venue directory is temporarily unavailable.' });
  }
}