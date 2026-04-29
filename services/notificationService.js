export async function sendPushNotification({ user_ids, title, body, url }) {
  try {
    await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_ids, title, body, url }),
    });
  } catch (err) {
    console.error('Error sending push notification:', err);
  }
}
