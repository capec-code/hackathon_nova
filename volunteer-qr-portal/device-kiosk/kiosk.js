const SUPABASE_FUNC_URL = 'https://YOUR_PROJECT_ID.supabase.co/functions/v1';

// STATE
let apiKey = localStorage.getItem('device_apiKey') || '';
let mode = localStorage.getItem('kiosk_mode') || 'both'; // both, checkin, checkout
let html5QrcodeScanner = null;
let isProcessing = false;

// ELEMENTS
const els = {
    status: document.getElementById('kiosk-status'),
    feedbackCard: document.getElementById('feedback-card'),
    feedbackTitle: document.getElementById('feedback-title'),
    feedbackMsg: document.getElementById('feedback-message'),
    feedbackTime: document.getElementById('feedback-time'),
    feedbackIcon: document.getElementById('feedback-icon'),
    settingsModal: document.getElementById('settings-modal'),
    apiKeyInput: document.getElementById('device-api-key'),
    modeInput: document.getElementById('kiosk-mode'),
    instruction: document.getElementById('instruction-text')
};

// INIT
document.addEventListener('DOMContentLoaded', () => {
    if (!apiKey) {
        showSettings();
    } else {
        startKiosk();
    }
    
    // Settings Binding
    document.getElementById('btn-settings').addEventListener('click', showSettings);
    document.getElementById('btn-close-settings').addEventListener('click', hideSettings);
    document.getElementById('btn-save-settings').addEventListener('click', saveSettings);
});

function showSettings() {
    els.apiKeyInput.value = apiKey;
    els.modeInput.value = mode;
    els.settingsModal.classList.remove('hidden');
    if (html5QrcodeScanner) html5QrcodeScanner.pause();
}

function hideSettings() {
    els.settingsModal.classList.add('hidden');
    if (html5QrcodeScanner) html5QrcodeScanner.resume();
}

function saveSettings() {
    apiKey = els.apiKeyInput.value.trim();
    mode = els.modeInput.value;
    localStorage.setItem('device_apiKey', apiKey);
    localStorage.setItem('kiosk_mode', mode);
    hideSettings();
    startKiosk();
}

function startKiosk() {
    if (!apiKey) return;
    els.status.textContent = 'Device Active';
    els.status.style.color = 'var(--accent-success)';
    
    if (!html5QrcodeScanner) {
        html5QrcodeScanner = new Html5Qrcode("qr-reader");
        // Use percentage for qrbox on mobile to avoid overflow
        const qrboxFunction = function(viewfinderWidth, viewfinderHeight) {
            let minEdgePercentage = 0.70; // 70%
            let minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
            let qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
            return {
                width: qrboxSize,
                height: qrboxSize
            };
        };

        html5QrcodeScanner.start({ facingMode: "environment" }, { fps: 10, qrbox: qrboxFunction }, onScan)
        .catch(err => {
            console.error("Camera error", err);
            els.status.textContent = "Camera Error";
            els.status.style.color = "red";
        });
    }
}

async function onScan(decodedText) {
    if (isProcessing) return;
    isProcessing = true;
    html5QrcodeScanner.pause(); // Pause scanning while processing

    // Parse: VOL|ORG|CODE
    try {
        const parts = decodedText.split('|');
        if (parts.length === 3 && parts[0] === 'VOL') {
            const [_, org, code] = parts;
            await processBadge(code, org);
        } else {
            showFeedback('error', 'Invalid QR Format');
            setTimeout(resetScan, 2000);
        }
    } catch (e) {
        console.error(e);
        showFeedback('error', 'Scan Error');
        setTimeout(resetScan, 2000);
    }
}

async function processBadge(code, org) {
    // Determine action based on mode
    // If 'both', try checkin first. If 'Already checked in', try checkout.
    
    showFeedback('info', 'Processing...', '');

    if (mode === 'checkin' || mode === 'both') {
        const res = await callEdge('checkin', { code });
        if (res.success) {
            showFeedback('success', 'Checked In', res.data.entry_time);
            return done();
        } else if (res.error === 'Already checked in') {
            if (mode === 'checkin') {
                 showFeedback('error', 'Already Checked In');
                 return done();
            }
            // Fallthrough to checkout if mode is both
        } else {
            showFeedback('error', res.error || 'Check-in Failed');
            return done();
        }
    }

    if (mode === 'checkout' || mode === 'both') {
        const res = await callEdge('checkout', { code });
        if (res.success) {
            const time = `${res.data.duration_minutes} mins`;
            showFeedback('success', 'Checked Out', time);
            return done();
        } else {
             showFeedback('error', res.error || 'Checkout Failed');
             return done();
        }
    }
}

function done() {
    setTimeout(resetScan, 3000);
}

function resetScan() {
    isProcessing = false;
    els.feedbackCard.classList.add('hidden');
    els.instruction.classList.remove('hidden');
    html5QrcodeScanner.resume();
}

function showFeedback(type, title, msg='') {
    els.instruction.classList.add('hidden');
    els.feedbackCard.className = `card feedback-${type}`; // reset class
    els.feedbackCard.classList.remove('hidden');
    
    els.feedbackTitle.textContent = title;
    els.feedbackMsg.textContent = msg;
    
    if (type === 'success') {
        els.feedbackIcon.textContent = '✅';
        // Play sound
        playSound('success');
    } else if (type === 'error') {
        els.feedbackIcon.textContent = '❌';
         playSound('error');
    } else {
        els.feedbackIcon.textContent = '⏳';
    }

    if (msg.includes('T') || msg.includes(':')) {
        // try to format date if it looks like one
        try {
            const date = new Date(msg);
            if (!isNaN(date)) {
                els.feedbackTime.textContent = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            } else {
                els.feedbackTime.textContent = msg;
            }
        } catch(e) { els.feedbackTime.textContent = msg; }
    } else {
        els.feedbackTime.textContent = msg;
    }
}

async function callEdge(func, body) {
    try {
        const res = await fetch(`${SUPABASE_FUNC_URL}/${func}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'device-api-key': apiKey
            },
            body: JSON.stringify({
                ...body,
                device_id: 'kiosk',
                client_ts: new Date().toISOString()
            })
        });
        return await res.json();
    } catch (e) {
        return { success: false, error: 'Network Error' };
    }
}

// Simple Audio Context beep
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    if (type === 'success') {
        osc.frequency.value = 800; // High beep
        gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    } else {
        osc.frequency.value = 300; // Low beep
        gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    }
}
