const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = '/Users/ntsd/.gemini/antigravity-ide/brain/f7db7d63-bcc9-4d2a-95d2-96e34af64bb8/.tempmediaStorage';

async function run() {
  const targetsRes = await fetch('http://localhost:9222/json');
  const targets = await targetsRes.json();
  const page = targets.find((t) => t.type === 'page' && t.url.includes('8081'));
  if (!page) {
    console.error('No Expo web page found on port 8081');
    process.exit(1);
  }
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  let id = 1;
  const pending = new Map();
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  await new Promise((resolve) => (ws.onopen = resolve));

  // 1. Reload page to ensure clean bundle state
  console.log('Reloading page...');
  await send('Page.reload');
  await new Promise((r) => setTimeout(r, 2000));

  // 2. Locate TextInput in CoachChatScreen
  console.log('Finding TextInput...');
  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const input = document.querySelector('textarea, input[type="text"], [contenteditable="true"]');
      if (!input) return null;
      input.focus();
      const r = input.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, width: r.width, height: r.height };
    })()`,
    returnByValue: true,
  });
  console.log('TextInput rect:', res.result?.value);

  const pos = res.result?.value;
  if (pos) {
    // Click into input to focus
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: pos.x,
      y: pos.y,
      button: 'left',
      clickCount: 1,
    });
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: pos.x,
      y: pos.y,
      button: 'left',
      clickCount: 1,
    });

    // Type text into input
    const testText = "How should I structure my chest workout today?";
    for (const char of testText) {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', text: char });
      await send('Input.dispatchKeyEvent', { type: 'keyUp' });
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  // Take screenshot of focused input with text
  console.log('Capturing screenshot of focused input...');
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'keyboard_input_visible.png'), Buffer.from(shot.data, 'base64'));
  console.log('Saved keyboard_input_visible.png');

  ws.close();
  console.log('Test completed successfully!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
