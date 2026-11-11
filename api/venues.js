import { db } from 'hatchable';

export const access = 'public';
export const methods = ['GET'];

function cleanQuery(value) {
  return typeof value === 'string'
    ? value.trim().replace(/[\\%_]/g, '').slice(0, 80)
    : '';
}

export default async function (req, res) {
  const city = cleanQuery(req.query?.city) || 'Gorakhpur';
  const result = await db.query(
    'SELECT id, name, area, sports, map_query, hourly_rate, opening_time::text AS opening_time, closing_time::text AS closing_time, verification_status FROM venues WHERE is_active = true AND (area ILIKE $1 OR name ILIKE $1 OR COALESCE(map_query, \'\') ILIKE $1) ORDER BY CASE WHEN verification_status = \'verified\' THEN 0 ELSE 1 END, name ASC LIMIT 100',
    ['%' + city + '%']
  );
  res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
  return res.json({ city, venues: result.rows });
}
