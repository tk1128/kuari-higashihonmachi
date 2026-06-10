// Vercel Serverless Function
// LINE Notify + ntfy.sh プッシュ通知

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Line-Token');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).end();

  try {
    const { name, contact, community, checkin, checkout, guests, purpose, notes } = req.body;

    // LINE Notify token: Vercel環境変数 → フロントから渡したトークン の順で使用
    const LINE_TOKEN =
      process.env.LINE_NOTIFY_TOKEN ||
      req.headers['x-line-token'] ||
      '';

    const NTFY_TOPIC = process.env.NTFY_TOPIC || 'kuari-higashihonmachi-2026';

    // 通知メッセージ
    const msg = [
      '',
      '🏯【kuari東本町 新規予約】',
      `👤 氏名: ${name}`,
      `📅 IN: ${checkin}  OUT: ${checkout}`,
      `👥 人数: ${guests}`,
      `🌐 ${community}`,
      `✉️ 連絡先: ${contact}`,
      `📝 目的: ${purpose || '未記入'}`,
      notes ? `💬 備考: ${notes}` : null,
      '',
      '📱 管理者通知: 08020674324',
    ].filter(Boolean).join('\n');

    const results = {};

    // ── LINE Notify ─────────────────────────────────────────
    if (LINE_TOKEN) {
      try {
        const r = await fetch('https://notify-api.line.me/api/notify', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${LINE_TOKEN}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `message=${encodeURIComponent(msg)}`,
        });
        const body = await r.json().catch(() => ({}));
        results.line = { status: r.status, message: body.message };
      } catch (e) {
        results.line = { error: e.message };
      }
    } else {
      results.line = { skipped: 'トークン未設定' };
    }

    // ── ntfy.sh プッシュ通知 ─────────────────────────────────
    try {
      const r = await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic:    NTFY_TOPIC,
          title:    '🏯 kuari東本町 新規予約',
          message:  `${name} / ${checkin}〜${checkout} / ${guests}\n${contact} / ${community}`,
          priority: 5,
          tags:     ['tada', 'house'],
        }),
      });
      results.ntfy = { status: r.status };
    } catch (e) {
      results.ntfy = { error: e.message };
    }

    return res.status(200).json({ ok: true, results });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
