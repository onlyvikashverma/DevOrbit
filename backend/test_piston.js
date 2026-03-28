async function test() {
  const response = await fetch('https://emkc.org/api/v2/piston/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: 'javascript',
      version: '18.15.0',
      files: [{ content: 'console.log("Piston is working!")' }]
    })
  });
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}
test();
