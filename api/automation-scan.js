import { scanBookrrAutomation } from 'lib/bookrr-automation.js';

export const access = 'scheduler';
export const schedule = '0 * * * *';

export default async function (req, res) {
  try {
    const result = await scanBookrrAutomation('scheduled');
    console.log('BOOKRR automation scan complete', JSON.stringify({ checked: result.checked, open: result.open, critical: result.critical }));
    return res.json({ ok: true, result });
  } catch (error) {
    console.error('BOOKRR scheduled automation scan failed', error);
    return res.status(500).json({ error: 'Automation scan failed.' });
  }
}