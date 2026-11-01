const baseUrl = 'https://indicacao-prime-circle-1ba22.shrd01.internal.goskip.dev';

async function test() {
  console.log('Testing endpoint...');
  try {
    const res = await fetch(`${baseUrl}/api/health`);
    console.log('Health:', res.status, await res.json());
  } catch (err) {
    console.error('Err:', err);
  }
}

test();
