// Expense Tracker Script for Hackathon Nova
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const mainDashboard = document.getElementById('main-dashboard');
const loginForm = document.getElementById('login-form');
const expenseForm = document.getElementById('expense-form');
const userBadge = document.getElementById('user-badge');
const displayCode = document.getElementById('display-code');

const expenseTableBody = document.getElementById('expense-table-body');
const mobileList = document.getElementById('expense-mobile-list');
const fileInput = document.getElementById('exp_proof');
const filePlaceholder = document.getElementById('file-placeholder');
const fileSelected = document.getElementById('file-selected');
const fileNameDisplay = document.getElementById('file-name');

let currentCode = localStorage.getItem('nova_expense_code');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    if (currentCode) {
        validateAndLogin(currentCode);
    }
});

// Login Logic
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('secret_code').value.trim();
    if (!code) return;

    const btn = document.getElementById('login-btn');
    btn.disabled = true;
    btn.innerText = 'Validating...';

    await validateAndLogin(code);
    btn.disabled = false;
    btn.innerText = 'Unlock Portal';
});

async function validateAndLogin(code) {
    try {
        const { data, error } = await sb
            .from('secret_codes')
            .select('*')
            .eq('code', code)
            .eq('is_active', true)
            .single();

        if (error || !data) throw new Error('Invalid or disabled secret code.');

        currentCode = code;
        localStorage.setItem('nova_expense_code', code);
        
        loginScreen.classList.add('hidden-state');
        mainDashboard.classList.remove('hidden-state');
        userBadge.classList.remove('hidden');
        displayCode.innerText = `CODE: ${code.substring(0, 4)}****`;
        
        fetchExpenses();
    } catch (error) {
        const errEl = document.getElementById('login-error');
        if (errEl) {
            errEl.innerText = error.message;
            errEl.classList.remove('hidden');
        }
        localStorage.removeItem('nova_expense_code');
    }
}

function logout() {
    localStorage.removeItem('nova_expense_code');
    location.reload();
}

// File Handling
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        fileNameDisplay.innerText = e.target.files[0].name;
        filePlaceholder.classList.add('hidden');
        fileSelected.classList.remove('hidden');
    }
});

function resetFile() {
    fileInput.value = '';
    filePlaceholder.classList.remove('hidden');
    fileSelected.classList.add('hidden');
}

// Submission Logic
expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('exp-submit-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Submitting...';

    try {
        let proofUrl = null;
        const file = fileInput.files[0];

        if (file) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const { data: uploadData, error: uploadError } = await sb.storage
                .from('expense-proofs')
                .upload(fileName, file);

            if (uploadError) throw uploadError;
            
            const { data: urlData } = sb.storage
                .from('expense-proofs')
                .getPublicUrl(fileName);
            proofUrl = urlData.publicUrl;
        }

        const expenseData = {
            title: document.getElementById('exp_title').value,
            amount: parseFloat(document.getElementById('exp_amount').value),
            category: document.getElementById('exp_category').value,
            description: document.getElementById('exp_desc').value,
            proof_url: proofUrl,
            issued_by_code: currentCode
        };

        const { error } = await sb.from('expenses').insert([expenseData]);
        if (error) throw error;

        expenseForm.reset();
        resetFile();
        alert('Expense submitted successfully!');
        fetchExpenses();
    } catch (error) {
        console.error('Submission error:', error);
        alert('Error submitting expense: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerText = 'Submit Claim';
    }
});

// Fetch Expenses
async function fetchExpenses() {
    try {
        const { data, error } = await sb
            .from('expenses')
            .select('*')
            .eq('issued_by_code', currentCode)
            .order('created_at', { ascending: false });

        if (error) throw error;
        renderExpenses(data);
        updateDashboardSummary(data);
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

function renderExpenses(list) {
    if (!expenseTableBody || !mobileList) return;

    if (list.length === 0) {
        const emptyState = `<div class="px-6 py-12 text-center text-gray-500 italic">No submissions yet.</div>`;
        expenseTableBody.innerHTML = `<tr><td colspan="4">${emptyState}</td></tr>`;
        mobileList.innerHTML = emptyState;
        return;
    }

    // Desktop Table
    expenseTableBody.innerHTML = list.map(item => `
        <tr class="hover:bg-white/5 transition">
            <td class="px-6 py-4">
                <div class="font-bold text-white text-sm tracking-tight">${item.title}</div>
                <div class="text-[10px] text-gray-500 uppercase font-black tracking-widest">${new Date(item.created_at).toLocaleDateString()} • ${item.category}</div>
            </td>
            <td class="px-6 py-4">
                <span class="px-2 py-0.5 rounded-full text-[9px] uppercase font-black border ${getStatusClass(item.status)}">
                    ${item.status}
                </span>
            </td>
            <td class="px-6 py-4 text-right font-mono text-white text-sm">Rs. ${parseFloat(item.amount).toLocaleString()}</td>
            <td class="px-6 py-4 text-center">
                ${item.proof_url ? `<button onclick="viewProof('${item.proof_url}')" class="text-orange-500 hover:text-white transition"><i class="fas fa-receipt"></i></button>` : '<span class="text-gray-700">-</span>'}
            </td>
        </tr>
    `).join('');

    // Mobile Cards
    mobileList.innerHTML = list.map(item => `
        <div class="p-4 border-b border-gray-800">
            <div class="flex justify-between items-start mb-3">
                <div>
                    <h4 class="font-bold text-white leading-tight mb-1">${item.title}</h4>
                    <span class="text-[10px] uppercase font-bold text-gray-500">${new Date(item.created_at).toLocaleDateString()} • ${item.category}</span>
                </div>
                <span class="px-2 py-0.5 rounded-full text-[9px] uppercase font-black border ${getStatusClass(item.status)} ml-2">
                    ${item.status}
                </span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-lg font-mono text-white font-bold tracking-tighter">Rs. ${parseFloat(item.amount).toLocaleString()}</span>
                ${item.proof_url ? `<button onclick="viewProof('${item.proof_url}')" class="bg-gray-800 text-orange-500 px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-700"><i class="fas fa-receipt mr-1"></i> PROOF</button>` : '<span class="text-[10px] text-gray-600 font-bold uppercase">No Proof</span>'}
            </div>
        </div>
    `).join('');
}

function getStatusClass(status) {
    switch(status) {
        case 'Approved': return 'status-approved';
        case 'Rejected': return 'status-rejected';
        default: return 'status-pending';
    }
}

function updateDashboardSummary(list) {
    const totalAmt = list.reduce((acc, i) => acc + parseFloat(i.amount), 0);
    const approvedAmt = list.filter(i => i.status === 'Approved').reduce((acc, i) => acc + parseFloat(i.amount), 0);
    const pendingCount = list.filter(i => i.status === 'Pending').length;

    const totalAmtEl = document.getElementById('my-total-amt');
    const approvedAmtEl = document.getElementById('my-approved-amt');
    const pendingCountEl = document.getElementById('my-pending-count');

    if (totalAmtEl) totalAmtEl.innerText = `Rs. ${totalAmt.toLocaleString()}`;
    if (approvedAmtEl) approvedAmtEl.innerText = `Rs. ${approvedAmt.toLocaleString()}`;
    if (pendingCountEl) pendingCountEl.innerText = pendingCount;
}

// UI Modals
function viewProof(url) {
    document.getElementById('proof-img').src = url;
    document.getElementById('proof-modal').classList.remove('hidden');
    document.getElementById('proof-modal').classList.add('flex');
}

function closeProofModal() {
    document.getElementById('proof-modal').classList.add('hidden');
    document.getElementById('proof-modal').classList.remove('flex');
}
