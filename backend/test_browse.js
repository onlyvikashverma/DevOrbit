const fs = require('fs');

async function test() {
  try {
    const res = await fetch('http://localhost:5050/api/files/browse', {
      method: 'POST',
      body: JSON.stringify({ targetPath: '' }),
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(res.status);
    const data = await res.json();
    fs.writeFileSync('test_output.json', JSON.stringify(data, null, 2));
    console.log('done');
  } catch (err) {
    console.error(err);
  }
}
test();
