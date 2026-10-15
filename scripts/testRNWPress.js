const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = '/Users/ntsd/.gemini/antigravity-ide/brain/f7db7d63-bcc9-4d2a-95d2-96e34af64bb8/.tempmediaStorage';

async function run() {
  const targetsRes = await fetch('http://localhost:9222/json');
  const targets = await targetsRes.json();
  const page = targets.find((t) => t.type === 'page' && t.url.includes('8081'));
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

  const helperFunc = `
    window.__simulatePress = function(el) {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window });
      const up = new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window });
      const click = new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window });
      el.dispatchEvent(down);
      el.dispatchEvent(up);
      el.dispatchEvent(click);
      return true;
    };
  `;
  await send('Runtime.evaluate', { expression: helperFunc });

  // 1. Expand Micronutrient Bio-Scorecard
  const resExpand = await send('Runtime.evaluate', {
    expression: `(() => {
      const all = Array.from(document.querySelectorAll('*'));
      const bio = all.find(e => e.textContent && e.textContent.includes('Micronutrient Bio-Profile') && e.getAttribute('role') === 'button');
      if (bio) {
        window.__simulatePress(bio);
        return 'Pressed bio button';
      }
      // Try finding the container
      const textNode = all.find(e => e.textContent && e.textContent.trim() === 'Micronutrient Bio-Profile');
      let p = textNode;
      while (p && p.getAttribute('role') !== 'button' && p !== document.body) {
        p = p.parentElement;
      }
      if (p) {
        window.__simulatePress(p);
        return 'Pressed parent button: ' + p.tagName;
      }
      return 'Not found';
    })()`,
    returnByValue: true,
  });
  console.log('Bio press:', resExpand.result.value);

  await new Promise((r) => setTimeout(r, 600));

  // Screenshot of expanded scorecard
  const shotScorecard = await send('Page.captureScreenshot', { format: 'png' });
  const shotScorecardPath = path.join(ARTIFACT_DIR, `scorecard_expanded_${Date.now()}.png`);
  fs.writeFileSync(shotScorecardPath, Buffer.from(shotScorecard.data, 'base64'));
  console.log('Saved Scorecard:', shotScorecardPath);

  // 2. Open Add Food Modal on Breakfast
  const resOpenModal = await send('Runtime.evaluate', {
    expression: `(() => {
      const all = Array.from(document.querySelectorAll('*'));
      const addBtns = all.filter(e => e.textContent && e.textContent.trim() === 'Add Food');
      if (addBtns.length > 0) {
        let btn = addBtns[0];
        while (btn && btn.getAttribute('role') !== 'button' && btn.parentElement) {
          if (btn.getAttribute('role') === 'button') break;
          btn = btn.parentElement;
        }
        window.__simulatePress(btn || addBtns[0]);
        return 'Opened Add Food modal';
      }
      return 'Add button not found';
    })()`,
    returnByValue: true,
  });
  console.log('Open modal:', resOpenModal.result.value);
  await new Promise((r) => setTimeout(r, 600));

  // 3. Switch to Snap / AI tab
  const resSnapTab = await send('Runtime.evaluate', {
    expression: `(() => {
      const all = Array.from(document.querySelectorAll('*'));
      const tab = all.find(e => e.textContent && e.textContent.trim() === 'Snap / AI');
      if (tab) {
        let btn = tab;
        while (btn && btn.getAttribute('role') !== 'button' && btn.parentElement) {
          if (btn.getAttribute('role') === 'button') break;
          btn = btn.parentElement;
        }
        window.__simulatePress(btn || tab);
        return 'Clicked Snap / AI tab';
      }
      return 'Snap tab not found';
    })()`,
    returnByValue: true,
  });
  console.log('Snap tab:', resSnapTab.result.value);
  await new Promise((r) => setTimeout(r, 600));

  // Screenshot Snap Tab
  const shotSnap = await send('Page.captureScreenshot', { format: 'png' });
  const shotSnapPath = path.join(ARTIFACT_DIR, `snap_ai_tab_${Date.now()}.png`);
  fs.writeFileSync(shotSnapPath, Buffer.from(shotSnap.data, 'base64'));
  console.log('Saved Snap Tab:', shotSnapPath);

  // 4. In Snap Tab, click on a preset meal (e.g. "Grilled Salmon Bowl")
  const resPreset = await send('Runtime.evaluate', {
    expression: `(() => {
      const all = Array.from(document.querySelectorAll('*'));
      const salmonCard = all.find(e => e.textContent && e.textContent.trim() === 'Grilled Salmon Bowl');
      if (salmonCard) {
        let btn = salmonCard;
        while (btn && btn.getAttribute('role') !== 'button' && btn.parentElement) {
          if (btn.getAttribute('role') === 'button') break;
          btn = btn.parentElement;
        }
        window.__simulatePress(btn || salmonCard);
        return 'Clicked Grilled Salmon Bowl preset!';
      }
      return 'Salmon preset not found';
    })()`,
    returnByValue: true,
  });
  console.log('Preset press:', resPreset.result.value);
  await new Promise((r) => setTimeout(r, 800));

  // Screenshot Review Sheet from decomposed preset
  const shotReview = await send('Page.captureScreenshot', { format: 'png' });
  const shotReviewPath = path.join(ARTIFACT_DIR, `decomposed_review_${Date.now()}.png`);
  fs.writeFileSync(shotReviewPath, Buffer.from(shotReview.data, 'base64'));
  console.log('Saved Decomposed Review:', shotReviewPath);

  // 5. Click "Log to DINNER"
  const resConfirmLog = await send('Runtime.evaluate', {
    expression: `(() => {
      const all = Array.from(document.querySelectorAll('*'));
      // Select DINNER meal chip first
      const dinnerChip = all.find(e => e.textContent && e.textContent.trim() === 'DINNER');
      if (dinnerChip) {
        let p = dinnerChip;
        while (p && p.getAttribute('role') !== 'button' && p.parentElement) {
          if (p.getAttribute('role') === 'button') break;
          p = p.parentElement;
        }
        window.__simulatePress(p || dinnerChip);
      }

      // Find log button
      const logBtn = all.find(e => e.textContent && e.textContent.includes('Log '));
      if (logBtn) {
        let p = logBtn;
        while (p && p.getAttribute('role') !== 'button' && p.parentElement) {
          if (p.getAttribute('role') === 'button') break;
          p = p.parentElement;
        }
        window.__simulatePress(p || logBtn);
        return 'Logged meal to DINNER!';
      }
      return 'Log button not found';
    })()`,
    returnByValue: true,
  });
  console.log('Log confirm:', resConfirmLog.result.value);
  await new Promise((r) => setTimeout(r, 800));

  // Final Screenshot: Main screen with Dinner meal logged!
  const shotFinal = await send('Page.captureScreenshot', { format: 'png' });
  const shotFinalPath = path.join(ARTIFACT_DIR, `main_with_dinner_${Date.now()}.png`);
  fs.writeFileSync(shotFinalPath, Buffer.from(shotFinal.data, 'base64'));
  console.log('Saved Main Screen with Dinner:', shotFinalPath);

  ws.close();
}

run().catch(console.error);
