const token = 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImU5YzYyMWUyLTMxYTMtNGM5NS05NzY5LWU4YTBiOWY4MmQwZiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL25vY2ZxaGhmaXpxdG52b29scHlwLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIwOWY3ODFmYy00ODUxLTQwNmYtODgyNS04NTdjMDAyZWI1YzUiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzk1MzU4OTg5LCJpYXQiOjE3OTUzNTUzODksImVtYWlsIjoiYnJvd3Nlci10ZXN0QGV4YW1wbGUuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwibmFtZSI6IkJyb3dzZXIgVGVzdCJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzk1MzU1Mzg5fV1dLCJzZXNzaW9uX2lkIjoiYTkxYWIwNzMtNzY1MS00OGY0LTgwYzQtNzBiYjI0NWQzZGYxIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.LeN7yw0wAnGyT597R8wr2w5yN0CrMKwOHPLfBv-rY7pmnza_x-jNMHYO7qr4EdbhacN1tzOqL6RAvo3fE_XVgQ';

const parts = token.split('.');
const payload = Buffer.from(parts[1], 'base64url').toString();
console.log('Original payload:', payload);

// Fix the malformed JWT
const fixed = payload.replace(/"amr":\s*\[(.*?)\]\]/g, '"amr": [$1]');
console.log('Fixed payload:', fixed);
console.log('Parsed:', JSON.parse(fixed));