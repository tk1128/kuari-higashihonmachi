// Vercel Serverless Function — booking notification
// LINE Notify + ntfy.sh

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, contact, community, checkin, checkout, guests, purpose, notes } = req.body;

    const msg = [
      '',
      '🏯 【kuari東本町 新規予約】',
      `👤 お名前: ${name}`,
      `📅 チェックイン: ${checkin}`,
      `📅 チェックアウト: ${checkout}`,
      `👥 人数: ${guests}名`,
      `🌐 コミュニティ: ${community}`,
      `✉️ 連絡先: ${contact}`,
      `📝 目的: ${purpose || '未記入'}`,
      notes ? `💬 備考: ${notes}` : '',
    ].filter(Boolean).join('\n');

    const results = [];

    // LINE Notify
    const LINE_TOKEN = process.env.LINE_NOTIFY_TOKEN;
    if (LINE_TOKEN) {
      try {
        const lr = await fetch('https://notify-api.line.me/api/notify', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LINE_TOKEN}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `message=${encodeURIComponent(msg)}`,
        });
        results.push({ line: lr.status });
      } catch (e) {
        results.push({ line: 'error', msg: e.message });
      }
    }

    // ntfy.sh push notification
    const NTFY_TOPIC = process.env.NTFY_TOPIC || 'kuari-higashihonmachi-2026';
    try {
      const nr = await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: NTFY_TOPIC,
          title: '🏯 kuari東本町 新規予約',
          message: `${name} / ${checkin}〜${checkout} / ${guests}名`,
          priority: 5,
          tags: ['tada', 'house'],
        }),
      });
      results.push({ ntfy: nr.status });
    } catch (e) {
      results.push({ ntfy: 'error' });
    }

    return res.status(200).json({ ok: true, results });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
