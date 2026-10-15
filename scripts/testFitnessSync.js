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

  async function clickLeaf(textToMatch) {
    const res = await send('Runtime.evaluate', {
      expression: `(() => {
        const all = Array.from(document.querySelectorAll('*'));
        const leaves = all.filter(e => e.innerText?.trim() === "${textToMatch}");
        const leaf = leaves.pop();
        if (!leaf) return null;
        const r = leaf.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, width: r.width, height: r.height };
      })()`,
      returnByValue: true,
    });

    const pos = res.result?.value;
    if (!pos || pos.width === 0 || pos.height === 0) {
      console.log('Leaf element not found or hidden for text:', textToMatch);
      return false;
    }

    console.log(`Clicking "${textToMatch}" at:`, Math.round(pos.x), Math.round(pos.y));
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
    return true;
  }

  // 1. Take Screenshot of Open Health Sync Guide Modal
  console.log('Taking screenshot of Health Sync Guide Modal...');
  const shotModal = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'fitness_sync_guide_modal.png'), Buffer.from(shotModal.data, 'base64'));
  console.log('Saved fitness_sync_guide_modal.png');

  // 2. Click Simulate Device Sync (WEB)
  console.log('Clicking Simulate Device Sync (WEB)...');
  await clickLeaf('Simulate Device Sync (WEB)');

  // Wait for sync processing (bridge latency ~800ms) and UI state update
  await new Promise((r) => setTimeout(r, 2000));

  // 3. Take Screenshot of Synced Telemetry Dashboard
  console.log('Taking screenshot of Telemetry Dashboard after sync...');
  const shotSynced = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'telemetry_after_sync.png'), Buffer.from(shotSynced.data, 'base64'));
  console.log('Saved telemetry_after_sync.png');

  // 4. Navigate to Coach Tab
  console.log('Navigating to COACH tab...');
  await clickLeaf('COACH');
  await new Promise((r) => setTimeout(r, 1200));

  // 5. Take Screenshot of Coach screen with updated Telemetry Banner
  console.log('Taking screenshot of Coach screen...');
  const shotCoach = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'coach_banner_after_sync.png'), Buffer.from(shotCoach.data, 'base64'));
  console.log('Saved coach_banner_after_sync.png');

  ws.close();
  console.log('All tests completed successfully!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
