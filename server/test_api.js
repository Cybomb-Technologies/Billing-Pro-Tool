import http from 'http';

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/logs?limit=1',
  method: 'GET',
  headers: {
    'x-admin-key': 'secret-admin-key-123', // Hardcoded fallback I saw in the file
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('BODY:', data.substring(0, 200)); // Print first 200 chars
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
