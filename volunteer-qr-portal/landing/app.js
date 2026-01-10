// ========================================
// CONFIGURATION & STATE
// ========================================

let detectedOrg = null;
let html5QrcodeScanner = null;
let isScannerActive = false;

// DOM Elements
const orgBadge = document.getElementById('org-badge');
const qrReaderDiv = document.getElementById('qr-reader');
const btnStartScan = document.getElementById('btn-start-scan');
const scanStatus = document.getElementById('scan-status');
const manualForm = document.getElementById('manual-form');
const manualCodeInput = document.getElementById('manual-code');
const feedbackArea = document.getElementById('feedback-area');
const feedbackMessage = document.getElementById('feedback-message');
const loadingOverlay = document.getElementById('loading-overlay');

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    detectOrganization();
    setupEventListeners();
    checkCameraPermission();
});

// ========================================
// ORGANIZATION DETECTION
// ========================================

/**
 * Detects organization from subdomain
 * capec.domain.com → CAPEC
 * itecpec.domain.com → ITECPEC
 * localhost/others → BOTH (Universal Mode)
 */
function detectOrganization() {
    const hostname = window.location.hostname.toLowerCase();
    
    if (hostname.includes('capec')) {
        detectedOrg = 'CAPEC';
        orgBadge.textContent = 'CAPEC';
        orgBadge.classList.add('capec');
    } else if (hostname.includes('itecpec') || hostname.includes('itec')) {
        detectedOrg = 'ITECPEC';
        orgBadge.textContent = 'ITEC-PEC';
        orgBadge.classList.add('itecpec');
    } else {
        // Universal Mode - Supports both
        detectedOrg = 'BOTH';
        orgBadge.textContent = 'Universal Portal';
        orgBadge.className = 'org-badge'; // neutral style
        
        // Add minimal styling for universal badge if not exists
        if (!document.getElementById('universal-style')) {
            const style = document.createElement('style');
            style.id = 'universal-style';
            style.innerHTML = `.org-badge { background: linear-gradient(135deg, #6366f1, #ec4899); color: white; }`;
            document.head.appendChild(style);
        }
    }
    
    console.log('Detected Organization:', detectedOrg);
}

// ========================================
// EVENT LISTENERS
// ========================================

function setupEventListeners() {
    // Start scan button
    btnStartScan.addEventListener('click', toggleScanner);
    
    // Manual form submission
    manualForm.addEventListener('submit', handleManualSubmit);
    
    // Auto-uppercase manual input
    manualCodeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });
}

// ========================================
// CAMERA PERMISSION CHECK
// ========================================

async function checkCameraPermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        updateStatus('Camera ready. Click "Start Camera Scan" to begin.', 'info');
    } catch (error) {
        console.warn('Camera permission not granted yet:', error);
        updateStatus('Camera access required for QR scanning', 'info');
    }
}

// ========================================
// QR SCANNER CONTROL
// ========================================

function toggleScanner() {
    if (isScannerActive) {
        stopScanner();
    } else {
        startScanner();
    }
}

function startScanner() {
    // Show QR reader div
    qrReaderDiv.classList.add('active');
    
    // Initialize scanner
    html5QrcodeScanner = new Html5Qrcode("qr-reader");
    
    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    };
    
    html5QrcodeScanner.start(
        { facingMode: "environment" }, // Use back camera
        config,
        onScanSuccess,
        onScanFailure
    ).then(() => {
        isScannerActive = true;
        btnStartScan.textContent = '⏹ Stop Scanner';
        btnStartScan.classList.remove('btn-primary');
        btnStartScan.classList.add('btn-secondary');
        updateStatus('Scanner active. Point camera at QR code.', 'info');
    }).catch(err => {
        console.error('Failed to start scanner:', err);
        updateStatus('Camera access denied. Please use manual code entry.', 'error');
        qrReaderDiv.classList.remove('active');
    });
}

function stopScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => {
            isScannerActive = false;
            qrReaderDiv.classList.remove('active');
            btnStartScan.textContent = '📷 Start Camera Scan';
            btnStartScan.classList.remove('btn-secondary');
            btnStartScan.classList.add('btn-primary');
            updateStatus('Scanner stopped.', 'info');
        }).catch(err => {
            console.error('Error stopping scanner:', err);
        });
    }
}

// ========================================
// QR SCAN HANDLERS
// ========================================

function onScanSuccess(decodedText, decodedResult) {
    console.log('QR Code detected:', decodedText);
    
    // Stop scanner immediately
    stopScanner();
    
    // Validate QR format
    const validationResult = validateQRCode(decodedText);
    
    if (validationResult.valid) {
        updateStatus(`✓ Valid QR code for ${validationResult.org}!`, 'success');
        processCheckIn(validationResult.code, validationResult.org);
    } else {
        updateStatus('✗ ' + validationResult.error, 'error');
    }
}

function onScanFailure(error) {
    // Silent - scanning continuously, errors are normal
}

// ========================================
// QR CODE VALIDATION
// ========================================

/**
 * Validates QR code format: VOL|ORG|UNIQUECODE
 * Returns: { valid: boolean, code: string, org: string, error: string }
 */
function validateQRCode(qrText) {
    const parts = qrText.split('|');
    
    // Check format
    if (parts.length !== 3) {
        return {
            valid: false,
            error: 'Invalid QR code format. Expected: VOL|ORG|CODE'
        };
    }
    
    const [prefix, org, code] = parts;
    const upperOrg = org.toUpperCase();
    
    // Validate prefix
    if (prefix !== 'VOL') {
        return {
            valid: false,
            error: 'Invalid QR code. Not a volunteer badge.'
        };
    }
    
    // Validate organization match
    // If strict mode (detectedOrg is specific), must match
    // If universal mode (detectedOrg is BOTH), accept known orgs
    if (detectedOrg !== 'BOTH' && upperOrg !== detectedOrg) {
        return {
            valid: false,
            error: `This QR code is for ${upperOrg}, but you're on ${detectedOrg} portal.`
        };
    }
    
    // If in universal mode, ensure it's a valid known org
    if (detectedOrg === 'BOTH' && !['ITECPEC', 'CAPEC'].includes(upperOrg)) {
         return {
            valid: false,
            error: `Unknown organization: ${upperOrg}`
        };       
    }
    
    // Validate code exists
    if (!code || code.trim().length === 0) {
        return {
            valid: false,
            error: 'Invalid volunteer code in QR.'
        };
    }
    
    return {
        valid: true,
        code: code.trim().toUpperCase(),
        org: upperOrg,
        error: null
    };
}

// ========================================
// MANUAL CODE ENTRY
// ========================================

function handleManualSubmit(e) {
    e.preventDefault();
    
    const code = manualCodeInput.value.trim().toUpperCase();
    
    // Validate code length
    if (code.length < 4 || code.length > 12) {
        showFeedback('Please enter a valid volunteer code (4-12 characters)', 'error');
        return;
    }
    
    // Validate alphanumeric
    if (!/^[A-Z0-9]+$/.test(code)) {
        showFeedback('Code must contain only letters and numbers', 'error');
        return;
    }
    
    // In universal mode, manual entry defaults to ITECPEC if not specified 
    // (Future improvement: Add org selector for manual entry)
    const orgToUse = detectedOrg === 'BOTH' ? 'ITECPEC' : detectedOrg;
    
    processCheckIn(code, orgToUse);
}

// ========================================
// CHECK-IN PROCESSING
// ========================================

/**
 * Processes check-in with validated volunteer code
 * This is where backend integration will happen
 */
function processCheckIn(code, org = detectedOrg) {
    console.log('Processing check-in:', {
        code: code,
        organization: org,
        timestamp: new Date().toISOString()
    });
    
    // Show loading
    showLoading(true);
    
    // Simulate network delay (remove in production)
    setTimeout(() => {
        // TODO: Replace with actual backend call
        submitCheckIn(code, org);
    }, 1500);
}

// CONFIGURATION
const SUPABASE_FUNC_URL = 'https://lhbipoprzdfzxkkrdpnw.supabase.co/functions/v1';

/**
 * Real backend integration for check-in
 */
async function submitCheckIn(code, org) {
    console.log('=== submitCheckIn ===');
    console.log('Code:', code);
    console.log('Organization:', org);
    
    try {
        const res = await fetch(`${SUPABASE_FUNC_URL}/checkin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: code,
                device_id: 'web-landing',
                client_ts: new Date().toISOString(),
                org: org
            })
        });
        
        const data = await res.json();
        
        if (data.success || data.error === 'Already checked in') {
            // Success!
            const successMsg = data.error === 'Already checked in' ? '✓ Session restored! Redirecting...' : '✓ Check-in successful! Redirecting...';
            showFeedback(successMsg, 'success');
            
            // Save session for the portal to pick up
            localStorage.setItem('volunteer_code', code);
            
            // Redirect to appropriate portal on subdomains
            setTimeout(() => {
                const subdomain = org === 'CAPEC' ? 'capec' : 'itecpec';
                // Redirect to the respective subdomain
                // Assuming the volunteer portal is hosted at the root of the subdomain
                // or at /volunteer-portal/ depending on their deployment.
                // User said: "enters to capec.hackathon-nova.com"
                window.location.href = `https://${subdomain}.hackathon-nova.com/`;
            }, 1000);
        } else {
            showFeedback(data.error || 'Check-in failed. Please try again.', 'error');
            showLoading(false);
        }
    } catch (e) {
        console.error("Checkin Error:", e);
        showFeedback('Network error. Please check your connection.', 'error');
        showLoading(false);
    }
}

// ========================================
// UI FEEDBACK FUNCTIONS
// ========================================

function updateStatus(message, type = 'info') {
    scanStatus.textContent = message;
    scanStatus.className = 'status-text ' + type;
}

function showFeedback(message, type = 'success') {
    feedbackMessage.textContent = message;
    feedbackMessage.className = 'feedback-message ' + type;
    feedbackArea.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        feedbackArea.classList.add('hidden');
    }, 5000);
}

function showLoading(show) {
    if (show) {
        loadingOverlay.classList.remove('hidden');
    } else {
        loadingOverlay.classList.add('hidden');
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Normalizes volunteer code to uppercase
 */
function normalizeCode(code) {
    return code.trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Checks if code format is valid
 */
function isValidCodeFormat(code) {
    return /^[A-Z0-9]{4,12}$/.test(code);
}

// ========================================
// ERROR HANDLING
// ========================================

window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showFeedback('An error occurred. Please try again.', 'error');
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showFeedback('An error occurred. Please try again.', 'error');
});

// ========================================
// CLEANUP ON PAGE UNLOAD
// ========================================

window.addEventListener('beforeunload', () => {
    if (isScannerActive && html5QrcodeScanner) {
        html5QrcodeScanner.stop();
    }
});
