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
let expenseData = [];

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
    const isEdit = btn.dataset.mode === 'edit';
    const editId = btn.dataset.id;

    btn.disabled = true;
    btn.innerHTML = isEdit ? '<i class="fas fa-spinner fa-spin mr-2"></i> Updating...' : '<i class="fas fa-spinner fa-spin mr-2"></i> Submitting...';

    try {
        let proofUrl = null;
        // Keep existing proof if editing and no new file selected
        if (isEdit && !fileInput.files[0]) {
             const existingItem = expenseData.find(i => i.id === editId);
             proofUrl = existingItem ? existingItem.proof_url : null;
        }

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

        const expenseDataPayload = {
            title: document.getElementById('exp_title').value,
            amount: parseFloat(document.getElementById('exp_amount').value),
            category: document.getElementById('exp_category').value,
            description: document.getElementById('exp_desc').value,
            is_paid_directly: document.getElementById('exp_paid_college').checked,
            proof_url: proofUrl,
            issued_by_code: currentCode,
            status: 'Pending' // Reset status on edit
        };

        let error;
        if (isEdit) {
            ({ error } = await sb.from('expenses').update(expenseDataPayload).eq('id', editId));
        } else {
            ({ error } = await sb.from('expenses').insert([expenseDataPayload]));
        }

        if (error) throw error;

        expenseForm.reset();
        resetFile();
        resetFormState();
        alert(isEdit ? 'Expense updated successfully!' : 'Expense submitted successfully!');
        fetchExpenses();
    } catch (error) {
        console.error('Submission error:', error);
        alert('Error: ' + error.message);
    } finally {
        btn.disabled = false;
        resetFormState();
    }
});

function resetFormState() {
    const btn = document.getElementById('exp-submit-btn');
    btn.innerText = 'Submit Claim';
    btn.dataset.mode = 'add';
    btn.dataset.id = '';
}

// Edit Expense
window.editExpense = (id) => {
    const item = expenseData.find(i => i.id === id);
    if (!item) return;

    document.getElementById('exp_title').value = item.title;
    document.getElementById('exp_amount').value = item.amount;
    document.getElementById('exp_category').value = item.category;
    document.getElementById('exp_desc').value = item.description || '';
    document.getElementById('exp_paid_college').checked = item.is_paid_directly || false;

    // Show proof if exists (maybe update placeholder text?)
    if (item.proof_url) {
        fileNameDisplay.innerText = "Keep existing proof or upload new";
        filePlaceholder.classList.add('hidden');
        fileSelected.classList.remove('hidden');
    }

    const btn = document.getElementById('exp-submit-btn');
    btn.innerText = 'Update Claim';
    btn.dataset.mode = 'edit';
    btn.dataset.id = id;

    expenseForm.scrollIntoView({ behavior: 'smooth' });
};

// Delete Expense
window.deleteExpense = async (id) => {
    if (!confirm('Are you sure you want to delete this expense claim?')) return;
    try {
        const { error } = await sb.from('expenses').delete().eq('id', id);
        if (error) throw error;
        fetchExpenses();
    } catch (error) {
        alert('Error deleting expense: ' + error.message);
    }
};

// Fetch Expenses
async function fetchExpenses() {
    try {
        const { data, error } = await sb
            .from('expenses')
            .select('*')
            .eq('issued_by_code', currentCode)
            .order('created_at', { ascending: false });

        if (error) throw error;
        expenseData = data;
        renderExpenses(expenseData);
        updateDashboardSummary(expenseData);
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

function renderExpenses(list) {
    if (!expenseTableBody || !mobileList) return;

    if (list.length === 0) {
        const emptyState = `<div class="px-6 py-12 text-center text-gray-500 italic">No submissions yet.</div>`;
        expenseTableBody.innerHTML = `<tr><td colspan="5">${emptyState}</td></tr>`;
        mobileList.innerHTML = emptyState;
        return;
    }

    // Desktop Table
    expenseTableBody.innerHTML = list.map(item => `
        <tr class="hover:bg-white/5 transition">
            <td class="px-6 py-4">
                <div class="font-bold text-white text-sm tracking-tight">${item.title}</div>
                <div class="text-[10px] text-gray-500 uppercase font-black tracking-widest flex items-center gap-2">
                    ${new Date(item.created_at).toLocaleDateString()} • ${item.category}
                    ${item.is_paid_directly ? '<span class="text-orange-400 border border-orange-500/30 px-1 rounded bg-orange-500/10">PAID DIRECT</span>' : ''}
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="px-2 py-0.5 rounded-full text-[9px] uppercase font-black border ${getStatusClass(item.status)}">
                    ${item.status}
                </span>
            </td>
            <td class="px-6 py-4 text-right font-mono text-white text-sm">
                ${item.is_paid_directly ? '<span class="text-gray-500">--</span>' : `Rs. ${parseFloat(item.amount).toLocaleString()}`}
            </td>
            <td class="px-6 py-4 text-center">
                ${item.proof_url ? `<button onclick="viewProof('${item.proof_url}')" class="text-orange-500 hover:text-white transition"><i class="fas fa-receipt"></i></button>` : '<span class="text-gray-700">-</span>'}
            </td>
            <td class="px-6 py-4 text-center">
                <button onclick="editExpense('${item.id}')" class="text-blue-500 hover:text-white transition px-2"><i class="fas fa-edit"></i></button>
                <button onclick="deleteExpense('${item.id}')" class="text-gray-500 hover:text-red-500 transition px-2"><i class="far fa-trash-alt"></i></button>
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
                    ${item.is_paid_directly ? '<div class="mt-1"><span class="text-[9px] text-orange-400 border border-orange-500/30 px-1 rounded bg-orange-500/10">PAID DIRECT</span></div>' : ''}
                </div>
                <span class="px-2 py-0.5 rounded-full text-[9px] uppercase font-black border ${getStatusClass(item.status)} ml-2">
                    ${item.status}
                </span>
            </div>
            <div class="flex justify-between items-center mt-2">
                <span class="text-lg font-mono text-white font-bold tracking-tighter">
                    ${item.is_paid_directly ? 'Direct Pay' : `Rs. ${parseFloat(item.amount).toLocaleString()}`}
                </span>
                ${item.proof_url ? `<button onclick="viewProof('${item.proof_url}')" class="text-orange-500 px-3 py-1.5 text-xs font-bold"><i class="fas fa-receipt mr-1"></i> PROOF</button>` : ''}
            </div>
            <div class="mt-3 flex justify-end gap-3 pt-3 border-t border-gray-800/50">
                <button onclick="editExpense('${item.id}')" class="text-xs text-blue-500/80 hover:text-blue-400 font-bold flex items-center">
                    <i class="fas fa-edit mr-1"></i> EDIT
                </button>
                <button onclick="deleteExpense('${item.id}')" class="text-xs text-red-500/50 hover:text-red-500 font-bold flex items-center">
                    <i class="far fa-trash-alt mr-1"></i> REMOVE
                </button>
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
    const totalAmt = list.reduce((acc, i) => acc + (i.is_paid_directly ? 0 : parseFloat(i.amount)), 0);
    const approvedAmt = list.filter(i => i.status === 'Approved' && !i.is_paid_directly).reduce((acc, i) => acc + parseFloat(i.amount), 0);
    const pendingCount = list.filter(i => i.status === 'Pending').length;

    const totalAmtEl = document.getElementById('my-total-amt');
    const approvedAmtEl = document.getElementById('my-approved-amt');
    const pendingCountEl = document.getElementById('my-pending-count');

    if (totalAmtEl) totalAmtEl.innerText = `Rs. ${totalAmt.toLocaleString()}`;
    if (approvedAmtEl) approvedAmtEl.innerText = `Rs. ${approvedAmt.toLocaleString()}`;
    if (pendingCountEl) pendingCountEl.innerText = pendingCount;
}

// Export Expenses
window.exportMyExpenses = async () => {
    if (!currentCode) return;
    
    try {
        const { data, error } = await sb.from('expenses').select('*').eq('issued_by_code', currentCode);
        if (error) throw error;
        
        let csv = 'Title,Category,Amount,DirectlyPaid,Date,Status,Description\n';
        data.forEach(e => {
            csv += `"${e.title}","${e.category}",${e.amount},${e.is_paid_directly},"${new Date(e.created_at).toLocaleDateString()}","${e.status}","${e.description || ''}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `My_Expenses_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch(err) {
        alert("Export failed: " + err.message);
    }
};

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
