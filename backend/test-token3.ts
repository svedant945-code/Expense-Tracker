import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nocfqhhfizqtnvoolpyp.supabase.co',
  'sb_publishable_Pv7anTLyg0apBKjgwWKF2Q_N18p3p1T'
);

// Fresh token from login
const token = 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImU5YzYyMWUyLTMxYTMtNGM5NS05NzY5LWU4YTBiOWY4MmQwZiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL25vY2ZxaGhmaXpxdG52b29scHlwLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIwOWY3ODFmYy00ODUxLTQwNmYtODgyNS04NTdjMDAyZWI1YzUiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzk1MzU4NzY0LCJpYXQiOjE3OTUzNTUxNjQsImVtYWlsIjoiYnJvd3Nlci10ZXN0QGV4YW1wbGUuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwibmFtZSI6IkJyb3dzZXIgVGVzdCJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzk1MzU1MTY0fV1dLCJzZXNzaW9uX2lkIjoiZjRiMDVhMGItODU0Mi00ZGU5LTk1YmMtMmU1Zjg3OTcxOTkxIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.VfAdKsxYR10wXTjeOASI1skFc7iLeARSJGmHFiSm5qErFyc-4QjtrRB2tUtTeJLrKH4r_kV0YlTTuTXRxZkfGw';

async function main() {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  console.log('Result:', { error, user: user ? { id: user.id, email: user.email } : null });
}

main().catch(console.error);