import { db } from 'hatchable';

export const access = 'admin';
export const methods = ['GET', 'PUT'];

export default async function (req, res) {
  try {
    if (req.method === 'GET') {
      const result = await db.query(
        "SELECT id, user_id, applicant_name, contact_phone, venue_name, area, sports, map_query, hourly_rate, opening_time::text AS opening_time, closing_time::text AS closing_time, status, created_at FROM venue_owner_applications ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END, created_at DESC LIMIT 200"
      );
      return res.json({ applications: result.rows });
    }
    if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed.' });
    const id = Number(req.body?.id);
    const status = req.body?.status;
    if (!Number.isSafeInteger(id) || id < 1 || !['approved','rejected'].includes(status)) return res.status(400).json({ error: 'Provide a valid application ID and approved/rejected status.' });
    if (status === 'rejected') {
      const result = await db.query(
        "UPDATE venue_owner_applications SET status = 'rejected', updated_at = now() WHERE id = $1 AND status = 'pending' RETURNING id, status",
        [id]
      );
      if (!result.rows.length) return res.status(404).json({ error: 'Pending application not found.' });
      return res.json({ application: result.rows[0] });
    }
    const tx = await db.transaction([
      { sql: "SELECT * FROM venue_owner_applications WHERE id = $1 AND status = 'pending' FOR UPDATE", params: [id] },
      {
        sql: "INSERT INTO venues (name, area, sports, map_query, listing_source, is_active, owner_user_id, owner_contact_phone, hourly_rate, opening_time, closing_time, verification_status) " +
          "SELECT a.venue_name, a.area, a.sports, a.map_query, 'BOOKRR owner application', true, a.user_id, a.contact_phone, a.hourly_rate, a.opening_time, a.closing_time, 'verified' " +
          "FROM venue_owner_applications a WHERE a.id = $1 AND a.status = 'pending' " +
          "AND NOT EXISTS (SELECT 1 FROM venues v WHERE lower(v.name) = lower(a.venue_name)) RETURNING id, name",
        params: [id]
      },
      {
        sql: "UPDATE venue_owner_applications a SET status = 'approved', venue_id = v.id, updated_at = now() " +
          "FROM venues v WHERE a.id = $1 AND a.status = 'pending' AND v.owner_user_id = a.user_id AND lower(v.name) = lower(a.venue_name) " +
          "RETURNING a.id, a.status, a.venue_id",
        params: [id]
      }
    ]);
    const inserted = tx?.results?.[1]?.rows || [];
    const updated = tx?.results?.[2]?.rows || [];
    if (!inserted.length || !updated.length) return res.status(409).json({ error: 'Could not approve this application. Check whether a venue with this name already exists.' });
    return res.json({ application: updated[0], message: 'Venue approved and added to the public directory.' });
  } catch (error) {
    return res.status(500).json({ error: 'Owner application operation failed.' });
  }
}