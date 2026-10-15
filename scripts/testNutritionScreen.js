const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = '/Users/ntsd/.gemini/antigravity-ide/brain/f7db7d63-bcc9-4d2a-95d2-96e34af64bb8/.tempmediaStorage';
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function run() {
  const targetsRes = await fetch('http://localhost:9222/json');
  const targets = await targetsRes.json();
  const page = targets.find((t) => t.type === 'page' && t.url.includes('8081'));
  if (!page) {
    console.error('No 8081 page target found');
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
  console.log('Connected to CDP');

  // Set iPhone 16 viewport
  await send('Emulation.setDeviceMetricsOverride', {
    width: 393,
    height: 852,
    deviceScaleFactor: 3,
    mobile: true,
  });

  // Small delay for React bundle reload
  await new Promise((r) => setTimeout(r, 1500));

  // Find NUTRITION tab and click it
  const evalTabClick = await send('Runtime.evaluate', {
    expression: `(() => {
      const allTexts = Array.from(document.querySelectorAll('div, span, p'));
      const nutritionTab = allTexts.find(el => el.textContent && el.textContent.trim() === 'NUTRITION');
      if (nutritionTab) {
        nutritionTab.click();
        // Also trigger touch
        nutritionTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        return 'Clicked NUTRITION tab';
      }
      return 'NUTRITION tab not found. Found text: ' + allTexts.map(t => t.textContent).filter(t => t && t.length < 20).slice(0, 10).join(', ');
    })()`,
    returnByValue: true,
  });
  console.log('Tab click result:', evalTabClick.result.value);

  await new Promise((r) => setTimeout(r, 1200));

  // Capture screenshot of Nutrition Screen
  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  const shot1Path = path.join(ARTIFACT_DIR, `nutrition_tab_${Date.now()}.png`);
  fs.writeFileSync(shot1Path, Buffer.from(shot1.data, 'base64'));
  console.log('Saved screenshot 1:', shot1Path);

  // Expand Micronutrient Scorecard
  const evalExpand = await send('Runtime.evaluate', {
    expression: `(() => {
      const allEls = Array.from(document.querySelectorAll('*'));
      const microBtn = allEls.find(el => el.textContent && el.textContent.includes('Micronutrient Bio-Profile'));
      if (microBtn) {
        microBtn.click();
        return 'Clicked Micronutrient Bio-Profile';
      }
      return 'Micro button not found';
    })()`,
    returnByValue: true,
  });
  console.log('Expand result:', evalExpand.result.value);

  await new Promise((r) => setTimeout(r, 600));

  // Capture screenshot of Expanded Scorecard
  const shot2 = await send('Page.captureScreenshot', { format: 'png' });
  const shot2Path = path.join(ARTIFACT_DIR, `nutrition_expanded_${Date.now()}.png`);
  fs.writeFileSync(shot2Path, Buffer.from(shot2.data, 'base64'));
  console.log('Saved screenshot 2:', shot2Path);

  // 1. In modal: click Atlantic Salmon
  const evalPickItem = await send('Runtime.evaluate', {
    expression: `(() => {
      const items = Array.from(document.querySelectorAll('*'));
      const salmon = items.find(el => el.textContent && el.textContent.includes('Atlantic Salmon'));
      if (salmon) {
        salmon.click();
        return 'Clicked Atlantic Salmon';
      }
      return 'Atlantic salmon not found';
    })()`,
    returnByValue: true,
  });
  console.log('Pick item result:', evalPickItem.result.value);

  await new Promise((r) => setTimeout(r, 600));

  // Screenshot 4: Portion & Review Sheet with Micronutrient Assay
  const shot4 = await send('Page.captureScreenshot', { format: 'png' });
  const shot4Path = path.join(ARTIFACT_DIR, `nutrition_review_${Date.now()}.png`);
  fs.writeFileSync(shot4Path, Buffer.from(shot4.data, 'base64'));
  console.log('Saved screenshot 4 (Review Sheet):', shot4Path);

  // Click "+25g" twice or pick 200g, pick DINNER, and click Log
  const evalLogToDinner = await send('Runtime.evaluate', {
    expression: `(() => {
      const allEls = Array.from(document.querySelectorAll('*'));
      // Find 200g chip
      const chip200 = allEls.find(el => el.textContent && el.textContent.trim() === '200g');
      if (chip200) chip200.click();

      // Find DINNER chip
      const dinnerChip = allEls.find(el => el.textContent && el.textContent.trim() === 'DINNER');
      if (dinnerChip) dinnerChip.click();

      // Find Log button
      const logBtn = allEls.find(el => el.textContent && el.textContent.includes('Log '));
      if (logBtn) {
        logBtn.click();
        return 'Logged 200g Salmon to Dinner!';
      }
      return 'Log button not found';
    })()`,
    returnByValue: true,
  });
  console.log('Log to dinner result:', evalLogToDinner.result.value);

  await new Promise((r) => setTimeout(r, 800));

  // Screenshot 5: Main screen showing logged Dinner and updated macros
  const shot5 = await send('Page.captureScreenshot', { format: 'png' });
  const shot5Path = path.join(ARTIFACT_DIR, `nutrition_after_log_${Date.now()}.png`);
  fs.writeFileSync(shot5Path, Buffer.from(shot5.data, 'base64'));
  console.log('Saved screenshot 5 (After Dinner Logged):', shot5Path);

  // Now test Barcode tab
  const evalOpenAdd = await send('Runtime.evaluate', {
    expression: `(() => {
      const allEls = Array.from(document.querySelectorAll('*'));
      const addBtn = allEls.find(el => el.textContent && el.textContent.trim() === 'Add Food');
      if (addBtn) { addBtn.click(); return 'Opened modal again'; }
      return 'Add button not found';
    })()`,
    returnByValue: true,
  });
  console.log(evalOpenAdd.result.value);
  await new Promise((r) => setTimeout(r, 500));

  // Click Barcode tab
  const evalBarcodeTab = await send('Runtime.evaluate', {
    expression: `(() => {
      const allEls = Array.from(document.querySelectorAll('*'));
      const barTab = allEls.find(el => el.textContent && el.textContent.trim() === 'Barcode');
      if (barTab) { barTab.click(); return 'Switched to Barcode tab'; }
      return 'Barcode tab not found';
    })()`,
    returnByValue: true,
  });
  console.log(evalBarcodeTab.result.value);
  await new Promise((r) => setTimeout(r, 500));

  // Screenshot 6: Barcode tab
  const shot6 = await send('Page.captureScreenshot', { format: 'png' });
  const shot6Path = path.join(ARTIFACT_DIR, `nutrition_barcode_tab_${Date.now()}.png`);
  fs.writeFileSync(shot6Path, Buffer.from(shot6.data, 'base64'));
  console.log('Saved screenshot 6 (Barcode Tab):', shot6Path);

  // Click Snap / AI tab
  const evalSnapTab = await send('Runtime.evaluate', {
    expression: `(() => {
      const allEls = Array.from(document.querySelectorAll('*'));
      const snapTab = allEls.find(el => el.textContent && el.textContent.includes('Snap / AI'));
      if (snapTab) { snapTab.click(); return 'Switched to Snap / AI tab'; }
      return 'Snap tab not found';
    })()`,
    returnByValue: true,
  });
  console.log(evalSnapTab.result.value);
  await new Promise((r) => setTimeout(r, 500));

  // Screenshot 7: Snap / AI tab
  const shot7 = await send('Page.captureScreenshot', { format: 'png' });
  const shot7Path = path.join(ARTIFACT_DIR, `nutrition_snap_tab_${Date.now()}.png`);
  fs.writeFileSync(shot7Path, Buffer.from(shot7.data, 'base64'));
  console.log('Saved screenshot 7 (Snap / AI Tab):', shot7Path);

  ws.close();
  console.log('Deep interactive testing complete!');

}

run().catch(console.error);
