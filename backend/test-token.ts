import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nocfqhhfizqtnvoolpyp.supabase.co',
  'sb_publishable_Pv7anTLyg0apBKjgwWKF2Q_N18p3p1T'
);

const token = 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImU5YzYyMWUyLTMxYTMtNGM5NS05NzY5LWU4YTBiOWY4MmQwZiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL25vY2ZxaGhmaXpxdG52b29scHlwLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJmYmEyZjIzMS0xNGYxLTQxMWMtOTEzMy01ZGIyOGFiYTdiYzIiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzk1MzU3NjQ2LCJpYXQiOjE3OTUzNTQwNDYsImVtYWlsIjoidGVzdDZAZXhhbXBsZS5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJuYW1lIjoiVGVzdCBVc2VyIDYifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc5NTM1NDA0Nn1dLCJzZXNzaW9uX2lkIjoiMjllZGJkMWEtZmZjYi00ZTNhLTlhMGQtZGJlYjRjMzhiNWFmIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.gwkqez_vRXun5Eac2llgCUZ3xJRVeftlO97rLfQuBzz3yTnxFpKbM5YgySo96-pDJRnS-oHAhgMm3VuoLk-eHg';

async function main() {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  console.log('Result:', { error, user: user ? { id: user.id, email: user.email } : null });
}

main().catch(console.error);