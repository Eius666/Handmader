import { NextRequest, NextResponse } from 'next/server';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(req: NextRequest) {
  if (!BOT_TOKEN) {
    console.error('[notify] TELEGRAM_BOT_TOKEN is not set');
    return NextResponse.json({ success: false, error: 'Bot not configured' }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { telegramId, message } = body as { telegramId?: unknown; message?: unknown };

  if (typeof telegramId !== 'number' || !Number.isInteger(telegramId)) {
    return NextResponse.json({ success: false, error: 'telegramId must be an integer' }, { status: 400 });
  }
  if (typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ success: false, error: 'message must be a non-empty string' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = (await res.json()) as { ok: boolean; description?: string };

    if (!data.ok) {
      console.error('[notify] Telegram API error:', data.description);
      return NextResponse.json({ success: false, error: data.description }, { status: 200 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[notify] fetch error:', err);
    return NextResponse.json({ success: false, error: 'Network error' }, { status: 502 });
  }
}
