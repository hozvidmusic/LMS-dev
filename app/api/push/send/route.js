import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY
);

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function POST(req) {
  try {
    const { user_ids, title, body, url } = await req.json();

    // Obtener admins para incluirlos siempre
    const { data: admins } = await supabase
      .from('profiles').select('id').eq('role', 'admin');
    const adminIds = (admins || []).map(a => a.id);

    let query = supabase.from('push_subscriptions').select('*');
    if (user_ids && user_ids.length > 0) {
      const allIds = [...new Set([...user_ids, ...adminIds])];
      query = query.in('user_id', allIds);
    }

    const { data: subs, error } = await query;
    if (error) return Response.json({ error: error.message }, { status: 500 });

    const payload = JSON.stringify({ title, body, url: url || '/' });

    const results = await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        ).catch(async (err) => {
          // Limpiar suscripciones inválidas automáticamente
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          }
          throw err;
        })
      )
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    return Response.json({ ok: true, sent });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
