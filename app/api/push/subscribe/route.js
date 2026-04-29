import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY
);

export async function POST(req) {
  try {
    const { subscription, user_id } = await req.json();
    const { endpoint, keys: { p256dh, auth } } = subscription;

    // Eliminar suscripción anterior del mismo endpoint (otro usuario en el mismo dispositivo)
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint).neq('user_id', user_id);

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({ user_id, endpoint, p256dh, auth }, { onConflict: 'user_id,endpoint' });

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
