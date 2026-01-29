/**
 * HACKATHON NOVA CEREMONY CONTROLLER
 * Author: Sajan Poudel
 * License: MIT
 */

/* =========================================
   1. CONFIGURATION
   ========================================= */
const CONFIG = {
    EVENT_LABEL: "HACKATHON NOVA",
    HACKATHON_DURATION_MS: 0, // Deprecated in favor of fixed end time
    HACKATHON_END_TIME: new Date("2026-01-29T09:00:00+05:45").getTime(), // Today morning 9
    TEST_DURATION_MS: 15000, // 15 Seconds for First Screen logic
    STORAGE_KEY_END: "hackathon_nova_end_time",
    STORAGE_KEY_STATE: "hackathon_nova_state", // PREP | RUNNING | PAUSED | ENDED
    STORAGE_KEY_PAUSED_REMAINING: "hackathon_nova_paused_remaining",

    AUTO_FULLSCREEN: true,
    PLAY_AUDIO_ON_GESTURE: true,
    BRAND_RED: "#C8102E",
    PREFERS_REDUCED_MOTION: window.matchMedia('(prefers-reduced-motion: reduce)').matches,

    // Runtime State
    TARGET_DATE: null, 
    state: 'PREP', 
    mottos: [
        "Innovate. Create. Elevate.",
        "Code the Future.",
        "60 Hours of Brilliance.",
        "Welcome to the Arena."
    ]
};

/* =========================================
   2. DOM ELEMENTS
   ========================================= */
/* =========================================
   2. DOM ELEMENTS (Initialized in init)
   ========================================= */
let UI = {};

// Audio Context
let audioCtx = null;
let audioUnlocked = false;

// Helpers
let lastSecond = -1; // Track for ticking sound

/* =========================================
   3. INITIALIZATION
   ========================================= */
function init() {
    console.log("Ceremony Controller v2.2 (Button+Sound) Initializing...");
    
    // Initialize UI Elements
    UI = {
        stage: document.getElementById('stage'),
        mainTitle: document.getElementById('main-title'),
        subtitle: document.getElementById('subtitle'),
        impactFlash: document.getElementById('impact-flash'),
        impactWord: document.getElementById('impact-word'),
        settleInfo: document.getElementById('settle-info'),
        mottoBox: document.getElementById('motto-box'),
        liveBadge: document.getElementById('live-badge'),
        
        // Countdown
        // Countdown
        cd: document.getElementById('countdown'),
        cdH: document.getElementById('cd-h'),
        cdM: document.getElementById('cd-m'),
        cdS: document.getElementById('cd-s'),
        
        // Live Timer
        liveTimerContainer: document.getElementById('live-timer-container'),
        liveTimerDigits: document.getElementById('live-timer'),
    
        adminOverlay: document.getElementById('admin-overlay'),
        adminStatus: document.getElementById('admin-status'),
        fsFallback: document.getElementById('fs-fallback'),
        btnEnterFs: document.getElementById('btn-enter-fs'),
        btnStartTimer: document.getElementById('btn-start-timer'),
        btnResumeTimer: document.getElementById('btn-resume-timer'),
        rocket: document.getElementById('rocket')
    };

    // Sanity Check
    if (!UI.cd) {
        console.error("CRITICAL: Countdown element not found.");
    }

    console.log("UI Initialized");
    
    // Interaction Listeners (Unlock Audio / Fullscreen)
    ['click', 'keydown', 'touchstart'].forEach(e => 
        window.addEventListener(e, handleInteraction, { once: true })
    );

    // Keyboard Shortcuts
    window.addEventListener('keydown', handleKeyEntry);
    
    // Fullscreen Button
    if (UI.btnEnterFs) UI.btnEnterFs.addEventListener('click', enterFullscreen);
    
    // START Timer Button
    if (UI.btnStartTimer) {
        UI.btnStartTimer.addEventListener('click', () => {
             handleInteraction();
             // Start the 15s Intro Countdown
             CONFIG.TARGET_DATE = Date.now() + CONFIG.TEST_DURATION_MS;
             UI.btnStartTimer.parentElement.classList.add('hidden');
        });
    }

    // RESUME Timer Button
    if (UI.btnResumeTimer) {
        UI.btnResumeTimer.addEventListener('click', () => {
             handleInteraction();
             manualResume();
        });
    }

    // --- CHECK FOR SESSION IN STORAGE ---
    checkSession();

    // Loop
    requestAnimationFrame(loop);

    // Wake Lock
    requestWakeLock();
    
    // Init Visuals
    resize();
    startMottoRotation();
}

function checkSession() {
    const savedState = localStorage.getItem(CONFIG.STORAGE_KEY_STATE);
    const savedEnd = localStorage.getItem(CONFIG.STORAGE_KEY_END);
    
    if (savedState && savedEnd && savedState !== 'PREP') {
        console.log("Pro Recovery: Active session detected.");
        if (savedState === 'RUNNING') {
            // Force update end time if it's different from the new fixed end time
            if (parseInt(savedEnd) !== CONFIG.HACKATHON_END_TIME) {
                console.log("Syncing session end time to 9:00 AM today.");
                localStorage.setItem(CONFIG.STORAGE_KEY_END, CONFIG.HACKATHON_END_TIME);
            }
            manualResume(true);
        } else {
            // Show resume button for paused/other states
            if (UI.btnResumeTimer) UI.btnResumeTimer.classList.remove('hidden');
        }
    }
}

function manualResume(isAuto = false) {
    const savedState = localStorage.getItem(CONFIG.STORAGE_KEY_STATE);
    const savedEnd = localStorage.getItem(CONFIG.STORAGE_KEY_END);
    
    if (savedState && savedEnd) {
        CONFIG.state = savedState;
        CONFIG.TARGET_DATE = parseInt(savedEnd);
        
        // Fast-forward UI
        UI.impactFlash.classList.add('hidden');
        UI.mainTitle.innerText = `${CONFIG.EVENT_LABEL}`;
        UI.mainTitle.className = 'animate-impact'; 
        UI.subtitle.innerText = "HAS OFFICIALLY BEGUN";
        UI.subtitle.className = 'subtitle-go';
        if (UI.liveBadge) UI.liveBadge.classList.remove('hidden');
        
        UI.cd.classList.add('hidden');
        UI.settleInfo.classList.remove('hidden');
        UI.liveTimerContainer.classList.remove('hidden');
        
        if (UI.btnResumeTimer) UI.btnResumeTimer.classList.add('hidden');
        if (UI.btnStartTimer) UI.btnStartTimer.parentElement.classList.add('hidden');

        if (isAuto) {
            showRecoveryToast();
        }
    }
    
    renderState(); 
}

function showRecoveryToast() {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
        background: rgba(234, 88, 12, 0.9); color: white; padding: 10px 20px;
        border-radius: 50px; font-weight: bold; font-family: sans-serif;
        z-index: 2000; animation: fadeInUp 0.5s ease forwards;
        box-shadow: 0 0 20px rgba(0,0,0,0.5);
    `;
    toast.innerText = "PRO RECOVERY: SESSION RESTORED";
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = "fadeInDown 0.5s ease forwards";
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function restoreState() {
    // This function is now deprecated in favor of manualResume for safety,
    // but we keep the name for compatibility if needed.
    checkSession();
}

function handleInteraction() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    audioUnlocked = true;
    
    if (CONFIG.AUTO_FULLSCREEN) enterFullscreen();
    console.log("Audio Unlocked / Interaction Logged");
}

function loop() {
    // Always update countdown logic if target exists
    updateCountdown();

    if (CONFIG.state === 'PREP' || CONFIG.state === 'LIFTOFF') {
        if (CONFIG.state === 'LIFTOFF') {
            createSmokeParticles();
        }
        renderStarfield();
        renderSmoke();
    } else {
        animateConfetti();
    }
    requestAnimationFrame(loop);
}

function updateCountdown() {
    // 1. PREP MODE (Waiting to start or Counting down 15s)
    if (CONFIG.state === 'PREP') {
        if (!CONFIG.TARGET_DATE) {
             // Idle - Waiting for Button Press
             UI.cdH.innerText = "00";
             UI.cdM.innerText = "00";
             UI.cdS.innerText = "15"; // Show 15s as default
             return;
        }

        // Counting down to LIFTOFF
        const diff = CONFIG.TARGET_DATE - Date.now();
        
        if (diff <= 0) {
            triggerSequence();
            return;
        }

        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        const cs = Math.floor((diff % 1000) / 10); // centiseconds

        UI.cdH.innerText = "00";
        UI.cdM.innerText = String(m).padStart(2,'0');
        UI.cdS.innerText = String(s).padStart(2,'0');
        
        // Optional: play tick
        if (s !== lastSecond) {
            lastSecond = s;
            playCountdownTick();
        }
        return;
    }

    // 2. RUNNING MODE (Live Hackathon Timer)
    if (CONFIG.state === 'RUNNING') {
        const now = Date.now();
        const diff = CONFIG.TARGET_DATE - now;

        if (diff <= 0) {
            // ENDED
            triggerEndSequence();
            return;
        }

        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);

        // Update Large Display
        UI.liveTimerDigits.innerText = 
            `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

        // Keep lastSecond updated for other logic if needed, but remove audio
        if (s !== lastSecond) {
            lastSecond = s;
        }
    }
    
    // 3. PAUSED MODE
    if (CONFIG.state === 'PAUSED') {
        // Blink or dims?
        UI.liveTimerDigits.style.opacity = (Date.now() % 1000 < 500) ? 0.5 : 1;
    } else {
        UI.liveTimerDigits.style.opacity = 1;
    }
}

/* =========================================
   4. STATE MACHINE & SEQUENCE
   ========================================= */

async function triggerSequence() {
    if (CONFIG.state !== 'PREP') return;
    
    console.log("TRIGGERING IMPACT SEQUENCE...");
    
    // --- 1. LIFTOFF PHASE ---
    setConfigState('LIFTOFF');
    UI.cd.classList.add('hidden'); // Hide timer
    if (UI.liveBadge) UI.liveBadge.classList.add('hidden');

    // Show and Animate Rocket
    UI.rocket.classList.remove('hidden');
    UI.rocket.classList.add('animate-fly-up');
    
    // Impactful screen shake
    triggerScreenShake(2500);
    
    playRocketRumble(); 
    
    // Wait for fly up (2.5s)
    await wait(2500);

    // --- 2. IMPACT PHASE ---
    stopScreenShake();
    setConfigState('IMPACT');
    
    // Cleanup Rocket
    UI.rocket.classList.add('hidden'); 
    
    // BLACKOUT (Pre-Impact)
    UI.impactFlash.style.background = 'black';
    UI.impactFlash.classList.remove('hidden');
    UI.impactWord.classList.add('hidden'); // Hide word initially
    
    announceARIA("Attention. Starting now.");

    // Wait 400ms Black
    await wait(400);

    // FLASH "NOW."
    UI.impactWord.classList.remove('hidden');
    UI.impactWord.innerText = "NOW.";
    // Play Click/Tick sound here? Maybe a sharp inhale.
    playTickSound(); 

    // Wait 350ms on "NOW."
    await wait(350);

    // --- 3. RELEASE (GO) ---
    UI.impactFlash.classList.add('hidden'); // Clear overlay
    
    // Animate Title
    UI.mainTitle.innerText = `🚀 ${CONFIG.EVENT_LABEL}`;
    UI.mainTitle.className = 'animate-impact'; // Triggers CSS anim
    
    // Subtitle
    UI.subtitle.innerText = "HAS OFFICIALLY BEGUN";
    UI.subtitle.className = 'subtitle-go';

    // Badge
    if (UI.liveBadge) UI.liveBadge.classList.remove('hidden');
    
    // --- START TIMER LOGIC ---
    const endTime = CONFIG.HACKATHON_END_TIME;
    CONFIG.TARGET_DATE = endTime;
    localStorage.setItem(CONFIG.STORAGE_KEY_END, endTime);
    setConfigState('RUNNING'); // Auto-saves state
    
    // Show Live Timer
    UI.liveTimerContainer.classList.remove('hidden');

    // Confetti & Audio
    startConfetti(); 
    playGoSound();
    announceARIA("Hackathon Nova has officially begun!");

    // --- 4. FINISH -> SETTLE ---
    // Transition immediately so chips/mottos are part of the final view
    transitionToSettle();
}

async function triggerEndSequence() {
    if (CONFIG.state === 'ENDED') return;
    
    console.log("TRIGGERING GRAND FINALE...");
    setConfigState('ENDED');

    // 1. RED FLASH
    UI.impactFlash.classList.remove('hidden', 'blackout');
    UI.impactFlash.classList.add('flash-red');
    UI.impactWord.classList.add('hidden');
    
    // 2. UI CHANGES
    const timerLabel = document.querySelector('.timer-label');
    if (timerLabel) {
        timerLabel.innerText = "TIME IS UP";
        timerLabel.classList.add('stop-coding');
    }
    
    if (UI.liveBadge) {
        UI.liveBadge.innerText = "ENDED";
        UI.liveBadge.classList.add('ended');
    }
    
    UI.subtitle.innerText = "HAS OFFICIALLY ENDED";
    UI.liveTimerDigits.innerText = "00:00:00";
    UI.liveTimerDigits.classList.add('glitch-text');

    // 3. INJECT FINAL MESSAGE CONTENT
    UI.settleInfo.innerHTML = `
        <div class="end-message-block">
            <div class="end-rule-line">All development activities must now cease.</div>
            <div class="end-gratitude">Thank you for your passion, perseverance,<br>and commitment to innovation.</div>
            <div class="end-instruction">Please await further instructions from the organizing committee.</div>
             <div class="end-instruction evaluation-status">Evaluation Phase in Progress........</div>
        </div>
    `;
    UI.settleInfo.classList.remove('hidden');
    
    // 3. EFFECTS
    playEndBoom();
    startConfetti(); 
    for(let i=0; i<3; i++) {
        setTimeout(startConfetti, 500 + (i*300));
    }
    
    triggerScreenShake(2000);
    announceARIA("Time is up! Stop coding immediately.");

    // Hide flash after 1s
    await wait(1000);
    UI.impactFlash.classList.add('hidden');
    UI.impactFlash.classList.remove('flash-red');
}

function playEndBoom() {
    if (!audioUnlocked || CONFIG.PREFERS_REDUCED_MOTION) return;
    const now = audioCtx.currentTime;
    
    // Deep Sub Boom
    const sub = audioCtx.createOscillator();
    const subG = audioCtx.createGain();
    sub.frequency.setValueAtTime(100, now);
    sub.frequency.exponentialRampToValueAtTime(30, now + 1.5);
    subG.gain.setValueAtTime(1, now);
    subG.gain.exponentialRampToValueAtTime(0.01, now + 2.5);
    sub.connect(subG); subG.connect(audioCtx.destination);
    sub.start(); sub.stop(now + 2.5);
    
    // Dissonant Low Chord
    [110, 116.5, 123.5].forEach(f => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = f;
        g.gain.setValueAtTime(0.1, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 2);
        osc.connect(g); g.connect(audioCtx.destination);
        osc.start(); osc.stop(now + 2);
    });
}

function transitionToSettle() {
    console.log("Settling...");
    // We remain in RUNNING state for the timer logic, 
    // but visually we ensure everything is visible.
    
    // Show Info (Already visible from PREP, but we ensure it)
    UI.settleInfo.classList.remove('hidden');
    
    // Stop Confetti gracefully...
}

function setConfigState(newState) {
    CONFIG.state = newState;
    localStorage.setItem(CONFIG.STORAGE_KEY_STATE, newState);
    UI.adminStatus.innerText = newState;
}

function renderState() {
    // Reset visual to PREP
    if (CONFIG.state === 'PREP') {
        UI.mainTitle.innerText = CONFIG.EVENT_LABEL;
        UI.mainTitle.className = 'title-prep';
        UI.subtitle.innerText = "OPENING CEREMONY";
        UI.subtitle.className = 'subtitle-prep';
        UI.cd.classList.remove('hidden'); // Show timer
        UI.liveBadge.classList.add('hidden');
        UI.impactFlash.classList.add('hidden');
        UI.settleInfo.classList.remove('hidden'); // SHOW IMMEDIATELY
        document.body.style.backgroundColor = ''; // Reset
        stopConfetti();
    } else {
        // Hide timer in all other states
        UI.cd.classList.add('hidden');
    }
}

/* =========================================
   5. ADMIN CONTROLS
   ========================================= */
function handleKeyEntry(e) {
    const key = e.key.toUpperCase();
    
    // Unlock audio if key pressed
    handleInteraction();

    // PRO SHORTCUT: Ctrl+Shift+P to Manual Resume
    if (e.ctrlKey && e.shiftKey && key === 'P') {
        e.preventDefault();
        manualResume(false);
        return;
    }

    switch(key) {

        case 'G':
            if (CONFIG.state === 'PREP') triggerSequence();
            break;
        case 'R':
            const pwd = prompt("Enter Admin Passcode to RESET:");
            if (pwd === "1701") {
                if (confirm("Passcode accepted. CLEAR all timer data and reload to PREP?")) {
                    localStorage.clear();
                    location.reload();
                }
            } else if (pwd !== null) {
                alert("Incorrect passcode. Reset aborted.");
            }
            break;
        case 'F':
            enterFullscreen();
            break;
        case 'H':
            UI.adminOverlay.classList.toggle('hidden');
            break;
        case 'T': // TEST END SEQUENCE
            triggerEndSequence();
            break;
        case ' ': // Space - PAUSE/RESUME
             if (CONFIG.state === 'RUNNING') {
                 // PAUSE
                 const remaining = CONFIG.TARGET_DATE - Date.now();
                 localStorage.setItem(CONFIG.STORAGE_KEY_PAUSED_REMAINING, remaining);
                 setConfigState('PAUSED');
             } else if (CONFIG.state === 'PAUSED') {
                 // RESUME
                 const remaining = parseInt(localStorage.getItem(CONFIG.STORAGE_KEY_PAUSED_REMAINING));
                 if (remaining) {
                     const newEnd = Date.now() + remaining;
                     CONFIG.TARGET_DATE = newEnd;
                     localStorage.setItem(CONFIG.STORAGE_KEY_END, newEnd);
                     setConfigState('RUNNING');
                 }
             }
             break;
    }
}

/* =========================================
   6. AUDIO SYNTHESIS (Cinematic)
   ========================================= */
function playCountdownTick() {
    // Soft tick for the countdown timer
    if (!audioUnlocked || CONFIG.PREFERS_REDUCED_MOTION) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime); // low volume
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.06);
}

function playTickSound() {
    // Sharp "Woodblock" tick for NOW.
    if (!audioUnlocked || CONFIG.PREFERS_REDUCED_MOTION) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
}

function playGoSound() {
    // Massive Cinematic Boom + Chord
    if (!audioUnlocked || CONFIG.PREFERS_REDUCED_MOTION) return;
    const now = audioCtx.currentTime;
    
    // 1. Kick / Sub Drop
    const sub = audioCtx.createOscillator();
    const subG = audioCtx.createGain();
    sub.frequency.setValueAtTime(150, now);
    sub.frequency.exponentialRampToValueAtTime(40, now + 1);
    subG.gain.setValueAtTime(1, now);
    subG.gain.exponentialRampToValueAtTime(0.01, now + 2);
    sub.connect(subG); subG.connect(audioCtx.destination);
    sub.start(); sub.stop(now + 2);

    // 2. Major Chord Swell (C Major)
    [261.63, 329.63, 392.00, 523.25].forEach((f, i) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = f;
        osc.detune.value = Math.random() * 20 - 10;
        
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.1, now + 0.1);
        g.gain.exponentialRampToValueAtTime(0.01, now + 4);
        
        const lpf = audioCtx.createBiquadFilter();
        lpf.type = 'lowpass';
        lpf.frequency.setValueAtTime(100, now);
        lpf.frequency.exponentialRampToValueAtTime(3000, now + 0.3);

        osc.connect(lpf); lpf.connect(g); g.connect(audioCtx.destination);
        osc.start(); osc.stop(now + 4);
    });
}

function playRocketRumble() {
    if (!audioUnlocked || CONFIG.PREFERS_REDUCED_MOTION) return;
    const now = audioCtx.currentTime;
    
    // Rumble (Brownian/Pink noise approx with low freq AM osc)
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(50, now);
    osc.frequency.linearRampToValueAtTime(100, now + 2.5); // Rising pitch
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.5);
    gain.gain.linearRampToValueAtTime(0, now + 3);
    
    // LPF to make it rumble
    const lpf = audioCtx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 120;

    osc.connect(lpf); lpf.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(now + 3);
}

/* =========================================
   7. VISUALS (Confetti & Motto & Starfield)
   ========================================= */
// Motto Rotation
let mottoIdx = 0;
function startMottoRotation() {
    UI.mottoBox.innerText = CONFIG.mottos[0];
    setInterval(() => {
        mottoIdx = (mottoIdx + 1) % CONFIG.mottos.length;
        UI.mottoBox.innerText = CONFIG.mottos[mottoIdx];
        UI.mottoBox.classList.remove('fade-in');
        void UI.mottoBox.offsetWidth; // trigger reflow
        UI.mottoBox.classList.add('fade-in');
    }, 6000);
}

// Canvas Manager
const cvs = document.getElementById('confetti-canvas');
const ctx = cvs.getContext('2d');
let particles = [];
let stars = []; // Background stars

function resize() { 
    cvs.width = window.innerWidth; 
    cvs.height = window.innerHeight; 
    initStarfield(); // Re-init stars on resize
}
window.addEventListener('resize', resize); 

// --- SMOKE & FIRE (LIFTOFF) ---
let smokeParticles = [];
function createSmokeParticles() {
    if (CONFIG.PREFERS_REDUCED_MOTION) return;
    
    // Get rocket current position for emitter
    const rect = UI.rocket.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.bottom - 40; // Base of rocket

    for(let i=0; i<3; i++) {
        smokeParticles.push({
            x: x + (Math.random() * 20 - 10),
            y: y,
            vx: (Math.random() * 2 - 1),
            vy: (Math.random() * 2 + 1), // Drift down
            size: Math.random() * 15 + 10,
            life: 1.0,
            decay: Math.random() * 0.02 + 0.01,
            // Fire colors transitioning to smoke
            color: Math.random() > 0.5 ? '#ff4d00' : '#555' 
        });
    }
}

function renderSmoke() {
    if (smokeParticles.length === 0) return;

    smokeParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        p.size += 0.5; // Expand

        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });

    smokeParticles = smokeParticles.filter(p => p.life > 0);
    ctx.globalAlpha = 1;
}

// --- STARFIELD (PREP STATE) ---
function initStarfield() {
    stars = [];
    const count = 150;
    for(let i=0; i<count; i++) {
        stars.push({
            x: Math.random() * cvs.width,
            y: Math.random() * cvs.height,
            size: Math.random() * 2,
            opacity: Math.random(),
            speed: Math.random() * 0.05 + 0.01 // Very slow drift
        });
    }
}

function renderStarfield() {
    if (CONFIG.state !== 'PREP' && CONFIG.state !== 'LIFTOFF') return; 

    // Don't clear rect if we want trails? 
    // For warp speed, maybe leave a bit of trail or just stretching
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    
    const isWarp = (CONFIG.state === 'LIFTOFF');

    ctx.fillStyle = "white";
    stars.forEach(s => {
        ctx.globalAlpha = s.opacity;
        ctx.beginPath();
        
        if (isWarp) {
            // WARP SPEED LINE
            ctx.strokeStyle = `rgba(255, 255, 255, ${s.opacity})`;
            ctx.lineWidth = s.size;
            ctx.moveTo(s.x, s.y);
            // Trail goes UP if we are moving DOWN? 
            // Rocket goes UP. Camera goes UP. Stars go DOWN.
            ctx.lineTo(s.x, s.y - (s.speed * 20)); // Trail behind
            ctx.stroke();
            
            // Accelerate
            s.speed *= 1.1; 
            if (s.speed > 50) s.speed = 50; // Cap speed
        } else {
            // DOT
            ctx.arc(s.x, s.y, s.size, 0, Math.PI*2);
            ctx.fill();
            
            // Twinkle
            s.opacity += (Math.random() - 0.5) * 0.02;
            if (s.opacity < 0.1) s.opacity = 0.1;
            if (s.opacity > 0.8) s.opacity = 0.8;
        }

        // Move
        s.y += isWarp ? s.speed : s.speed * 0.5; // Stars fall down
        // Wrap around
        if (s.y > cvs.height) {
            s.y = 0;
            s.x = Math.random() * cvs.width;
            if (isWarp) s.speed = Math.random() * 2 + 1; // Reset speed on loop
        }
    });
    ctx.globalAlpha = 1;
}

// --- CONFETTI (CELEBRATION) ---
function startConfetti() {
    if (CONFIG.PREFERS_REDUCED_MOTION) return;
    particles = []; // Clear any old
    
    // Bursts
    for(let i=0; i<75; i++) createParticle(0, 0, 2, 5); // TL
    for(let i=0; i<75; i++) createParticle(cvs.width, 0, -2, 5); // TR
}

function createParticle(x, y, vxBase, vyBase) {
    particles.push({
        x: x, y: y,
        vx: vxBase + (Math.random() * 10 - 5),
        vy: vyBase + (Math.random() * 10),
        color: `hsl(${Math.random()*360}, 100%, 70%)`, // Brighter for dark bg
        size: Math.random() * 8 + 4,
        life: 1.0,
        decay: Math.random() * 0.01 + 0.005
    });
}

function animateConfetti() {
    if (CONFIG.state === 'PREP') return; // Handled by starfield
    
    ctx.clearRect(0,0,cvs.width, cvs.height);
    
    // Draw Particles
    for(let i=0; i<particles.length; i++) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        p.vx *= 0.99; 
        
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    
    particles = particles.filter(p => p.life > 0);
    ctx.globalAlpha = 1;
}

function stopConfetti() {
    particles = [];
}

/* =========================================
   8. UTILS
   ========================================= */
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
function announceARIA(msg) { console.log("ARIA:", msg); /* Implementation imply aria-live div if separate needed */ }

function enterFullscreen() {
    document.documentElement.requestFullscreen().then(() => {
        UI.fsFallback.classList.add('hidden');
    }).catch(e => {
        console.warn("FS Blocked", e);
        UI.fsFallback.classList.remove('hidden');
    });
}

async function requestWakeLock() {
    try { if('wakeLock' in navigator) await navigator.wakeLock.request('screen'); }
    catch(e) {}
}

// --- SCREEN SHAKE ---
let shakeTimer = 0;
function triggerScreenShake(durationMs) {
    const intensity = 5;
    const start = Date.now();
    
    function shake() {
        const elapsed = Date.now() - start;
        if (elapsed < durationMs) {
            const x = (Math.random() - 0.5) * intensity;
            const y = (Math.random() - 0.5) * intensity;
            UI.stage.style.transform = `translate(${x}px, ${y}px)`;
            requestAnimationFrame(shake);
        } else {
            stopScreenShake();
        }
    }
    shake();
}

function stopScreenShake() {
    UI.stage.style.transform = '';
}

// Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
