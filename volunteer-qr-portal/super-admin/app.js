// CONFIGURATION
const SUPABASE_URL = 'https://lhbipoprzdfzxkkrdpnw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoYmlwb3ByemRmenhra3JkcG53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NDg1MzgsImV4cCI6MjA4MzIyNDUzOH0.fiKd-WlOPtEdY6TKVDy329_DngEL3UJg_6b36Vu5ZlQ'; 

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// INIT
document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
        initApp(session.user);
    } else {
        document.getElementById('auth-overlay').classList.remove('hidden');
    }

    // Login Handler
    document.getElementById('btn-login').addEventListener('click', async () => {
        const { error } = await sb.auth.signInWithOAuth({ provider: 'google' }); // Or whatever auth you prefer
        // Since we are using email/pass elsewhere, let's just redirect to a login flow or skip OAuth if not set up.
        // Actually, let's use the same simple email/pass prompt or just rely on session.
        // For simplicity, reusing the simple login implementation from admin.js?
        // Wait, admin.js used sb.auth.signInWithPassword. 
        // Let's prompt for email/password.
        const email = prompt("Enter Super Admin Email:");
        const password = prompt("Enter Password:");
        if(email && password) {
             const { data, error } = await sb.auth.signInWithPassword({ email, password });
             if(error) alert(error.message);
             else location.reload();
        }
    });

    // Logout
    document.getElementById('btn-logout').addEventListener('click', async () => {
        await sb.auth.signOut();
        location.reload();
    });

    // Mobile Toggle
    const toggleBtn = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    toggleBtn.addEventListener('click', () => sidebar.classList.toggle('open'));

    // Nav
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const view = btn.dataset.view;
            showView(view);
        });
    });
});

function initApp(user) {
    document.getElementById('auth-overlay').classList.add('hidden');
    document.getElementById('user-email').textContent = user.email;
    document.getElementById('user-initials').textContent = user.email[0].toUpperCase();
    
    loadStats();
    
    // Auto-refresh stats
    setInterval(loadStats, 30000);
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${viewId}`).classList.remove('hidden');
    
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.nav-item[data-view="${viewId}"]`).classList.add('active');

    if(viewId === 'logs') loadLogs();
    if(viewId === 'users') loadUsers();
    if(viewId === 'leaderboard') loadLeaderboard();
    if(viewId === 'codes') loadFinanceCodes();
    if(viewId === 'goods') loadFinanceGoods();
    if(viewId === 'expenses') loadFinanceExpenses();
}

async function loadStats() {
    // Parallel fetch for speed
    const [
        { count: capecVols },
        { count: itecVols },
        { count: activeCapec },
        { count: activeItec },
        { count: pendingCapec },
        { count: pendingItec },
        { count: pendingTaskCapec },
        { count: pendingTaskItec }
    ] = await Promise.all([
        sb.from('volunteers_capec').select('*', { count: 'exact', head: true }),
        sb.from('volunteers_itecpec').select('*', { count: 'exact', head: true }),
        sb.from('attendance_capec').select('*', { count: 'exact', head: true }).is('exit_time', null),
        sb.from('attendance_itecpec').select('*', { count: 'exact', head: true }).is('exit_time', null),
        sb.from('attendance_capec').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        sb.from('attendance_itecpec').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        sb.from('tasks_capec').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        sb.from('tasks_itecpec').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    ]);

    document.getElementById('total-vols').textContent = (capecVols || 0) + (itecVols || 0);
    document.getElementById('capec-vols').textContent = capecVols || 0;
    document.getElementById('itec-vols').textContent = itecVols || 0;
    
    document.getElementById('active-shifts').textContent = (activeCapec || 0) + (activeItec || 0);
    
    const pendingTotal = (pendingCapec||0) + (pendingItec||0) + (pendingTaskCapec||0) + (pendingTaskItec||0);
    document.getElementById('pending-count').textContent = pendingTotal;
}

async function loadLogs() {
    const { data: logs } = await sb.from('audit_log').select('*').order('created_at', { ascending: false }).limit(50);
    const tbody = document.querySelector('#logs-table tbody');
    tbody.innerHTML = logs.map(l => {
        const orgClass = l.org === 'CAPEC' ? 'capec' : (l.org === 'ITECPEC' ? 'itec' : '');
        return `
            <tr>
                <td><small>${l.id.slice(0,8)}</small></td>
                <td><span class="tag ${orgClass}">${l.org}</span></td>
                <td><strong>${l.action}</strong> <span style="opacity:0.7">on ${l.target_type || ''}</span></td>
                <td>${l.actor}</td>
                <td>${new Date(l.created_at).toLocaleString()}</td>
            </tr>
        `;
    }).join('');
}

async function loadUsers() {
    const { data: capec } = await sb.from('volunteers_capec').select('id, name, unique_code');
    const { data: itec } = await sb.from('volunteers_itecpec').select('id, name, unique_code');
    
    const allUsers = [
        ...(capec || []).map(u => ({...u, org: 'CAPEC'})),
        ...(itec || []).map(u => ({...u, org: 'ITECPEC'}))
    ].sort((a,b) => a.name.localeCompare(b.name));
    
    const tbody = document.querySelector('#users-table tbody');
    tbody.innerHTML = allUsers.map(u => {
        const orgClass = u.org === 'CAPEC' ? 'capec' : 'itec';
        return `
            <tr>
                <td>${u.name}</td>
                <td><span class="tag ${orgClass}">${u.org}</span></td>
                <td>${u.unique_code}</td>
                <td>
                    <button class="btn secondary small" onclick="viewVolunteerDetail('${u.id}', '${u.org}')">Details</button>
                    <button class="btn secondary small" onclick="openAssignModal('${u.name}', '${u.org}', '${u.unique_code}')">Assign</button>
                    <button class="btn primary small" onclick="viewQR('${u.name}', '${u.org}', '${u.unique_code}')">QR</button>
                </td>
            </tr>
        `;
    }).join('');
}

// --- ASSIGN TASK ---
window.openAssignModal = (name, org, code) => {
    document.getElementById('assign-vol-name-display').textContent = name;
    document.getElementById('assign-vol-org').value = org;
    document.getElementById('assign-vol-code').value = code;
    document.getElementById('modal-assign-task').classList.remove('hidden');
};

const assignForm = document.getElementById('form-assign-task');
if (assignForm) {
    assignForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const org = document.getElementById('assign-vol-org').value;
        const code = document.getElementById('assign-vol-code').value;
        const title = document.getElementById('assign-task-title').value;
        const description = document.getElementById('assign-task-desc').value;
        const category = document.getElementById('assign-task-category').value;
        const btn = document.getElementById('btn-assign-submit');

        btn.disabled = true;
        btn.textContent = "Assigning...";

        try {
            const res = await callEdge('assign-task', { code, title, description, category, org });
            if (res.success) {
                alert("Task assigned successfully!");
                document.getElementById('modal-assign-task').classList.add('hidden');
                e.target.reset();
            } else {
                alert("Error: " + res.error);
            }
        } catch (err) {
            console.error("Assign Task Error:", err);
            alert("Failed to assign task.");
        } finally {
            btn.disabled = false;
            btn.textContent = "Assign Task";
        }
    });
}

async function callEdge(func, body) {
    const session = await sb.auth.getSession();
    const token = session.data.session?.access_token;
    
    const funcUrl = `${SUPABASE_URL}/functions/v1/${func}`;
    
    const res = await fetch(funcUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
    });
    
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.error || `Server Error: ${res.statusText}` };
    }

    return await res.json();
}

window.viewQR = (name, org, code) => {
    document.getElementById('modal-view-qr').classList.remove('hidden');
    document.getElementById('qr-vol-name').textContent = name;
    document.getElementById('qr-vol-code').textContent = code;
    
    const container = document.getElementById('qr-display');
    container.innerHTML = ''; // clear previous
    container.style.background = '#ffffff';
    container.style.padding = '15px';
    container.style.borderRadius = '8px';
    container.style.display = 'inline-block';
    
    const qrData = `VOL|${org}|${code}`;
    new QRCode(container, {
        text: qrData,
        width: 200,
        height: 200,
        colorDark: "#000000",
        colorLight: "#ffffff"
    });
};

async function loadLeaderboard() {
    const [itecPec, capec] = await Promise.all([
        sb.from('volunteer_stats_itecpec').select('*'),
        sb.from('volunteer_stats_capec').select('*')
    ]);

    const combined = [
        ...(itecPec.data || []).map(s => ({ ...s, org: 'ITECPEC' })),
        ...(capec.data || []).map(s => ({ ...s, org: 'CAPEC' }))
    ].sort((a,b) => b.total_minutes - a.total_minutes);

    const tbody = document.querySelector('#leaderboard-table tbody');
    tbody.innerHTML = combined.map((s, idx) => `
        <tr>
            <td>${idx + 1}</td>
            <td style="font-weight:600;">${s.name}</td>
            <td><span class="tag ${s.org.toLowerCase()}">${s.org}</span></td>
            <td>${(s.total_minutes / 60).toFixed(1)}h</td>
            <td>${s.tasks_completed}</td>
        </tr>
    `).join('');
}

let currentDetailVol = null;

window.viewVolunteerDetail = async (id, org) => {
    currentDetailVol = { id, org };
    const suffix = org === 'CAPEC' ? 'capec' : 'itecpec';
    const { data: vol } = await sb.from(`volunteers_${suffix}`).select('*').eq('id', id).single();
    if (!vol) return;

    document.getElementById('det-vol-name').textContent = vol.name;
    document.getElementById('det-vol-org').textContent = org;
    document.getElementById('det-vol-org').className = `tag ${org.toLowerCase()}`;
    
    const img = document.getElementById('det-vol-image');
    const avatar = document.getElementById('det-vol-avatar');
    if (vol.profile_image_url) {
        img.src = vol.profile_image_url;
        img.style.display = 'block';
        avatar.style.display = 'none';
    } else {
        img.style.display = 'none';
        avatar.style.display = 'flex';
    }

    document.getElementById('modal-vol-detail').classList.remove('hidden');

    // Load Stats
    const { data: stats } = await sb.from(`volunteer_stats_${suffix}`).select('*').eq('id', id).single();
    document.getElementById('det-vol-hours').textContent = ((stats?.total_minutes || 0) / 60).toFixed(1);
    document.getElementById('det-vol-tasks').textContent = stats?.tasks_completed || 0;

    switchDetailTab('attendance');
};

window.switchDetailTab = async (type) => {
    const { id, org } = currentDetailVol;
    const suffix = org === 'CAPEC' ? 'capec' : 'itecpec';
    
    const btnAtt = document.getElementById('btn-show-att');
    const btnTsk = document.getElementById('btn-show-tasks');
    const viewAtt = document.getElementById('det-attendance-view');
    const viewTsk = document.getElementById('det-tasks-view');

    if (type === 'attendance') {
        btnAtt.className = 'btn small primary';
        btnTsk.className = 'btn small secondary';
        viewAtt.classList.remove('hidden');
        viewTsk.classList.add('hidden');

        const { data } = await sb.from(`attendance_${suffix}`).select('*').eq('volunteer_id', id).order('entry_time', { ascending: false });
        document.querySelector('#det-att-table tbody').innerHTML = (data || []).map(a => `
            <tr>
                <td>${new Date(a.entry_time).toLocaleString()}</td>
                <td>${a.exit_time ? new Date(a.exit_time).toLocaleString() : '---'}</td>
                <td>${a.duration_minutes || 0}m</td>
                <td><span class="badge status-${a.status}">${a.status}</span></td>
            </tr>
        `).join('');
    } else {
        btnTsk.className = 'btn small primary';
        btnAtt.className = 'btn small secondary';
        viewTsk.classList.remove('hidden');
        viewAtt.classList.add('hidden');

        const { data } = await sb.from(`tasks_${suffix}`).select('*').eq('volunteer_id', id).order('created_at', { ascending: false });
        document.querySelector('#det-tasks-table tbody').innerHTML = (data || []).map(t => `
            <tr>
                <td>${new Date(t.created_at).toLocaleDateString()}</td>
                <td>${t.title}</td>
                <td>${t.description || ''}</td>
                <td><span class="badge status-${t.status}">${t.status}</span></td>
            </tr>
        `).join('');
    }
};

window.closeModal = () => {
    document.getElementById('modal-vol-detail').classList.add('hidden');
};
// --- FINANCE & GOODS MANAGEMENT ---

async function loadFinanceCodes() {
    const { data, error } = await sb.from('secret_codes').select('*').order('created_at', { ascending: false });
    const tbody = document.getElementById('codes-table-body');
    if (error) return;
    
    const rows = data.map(c => `
        <tr>
            <td style="font-family:monospace; font-weight:bold; color:var(--accent-color);">${c.code}</td>
            <td>${c.assigned_to || '---'}</td>
            <td>
                <span class="tag" style="background:${c.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}; color:${c.is_active ? 'var(--success-color)' : 'var(--danger-color)'};">
                    ${c.is_active ? 'ACTIVE' : 'DISABLED'}
                </span>
            </td>
            <td style="display:flex; gap:10px;">
                <button class="btn secondary small" onclick="editSecretCode('${c.id}', '${c.code}')" title="Edit Code">✏️</button>
                <button class="btn secondary small" onclick="toggleCodeStatus('${c.id}', ${c.is_active})" title="Toggle Status">🔄</button>
                <button class="btn secondary small" onclick="deleteSecretCode('${c.id}')" title="Delete">🗑️</button>
            </td>
        </tr>
    `).join('');

    const cards = data.map(c => `
        <div class="mobile-card">
            <div class="flex-row">
                <span class="font-bold text-accent">${c.code}</span>
                <span class="tag ${c.is_active ? 'success' : 'danger'}">${c.is_active ? 'ACTIVE' : 'DISABLED'}</span>
            </div>
            <div class="meta-row">Assigned: ${c.assigned_to || '---'}</div>
            <div class="action-row">
                <button class="btn secondary small" onclick="editSecretCode('${c.id}', '${c.code}')">✏️ Edit</button>
                <button class="btn secondary small" onclick="toggleCodeStatus('${c.id}', ${c.is_active})">🔄 Toggle</button>
                <button class="btn secondary small" onclick="deleteSecretCode('${c.id}')">🗑️ Delete</button>
            </div>
        </div>
    `).join('');

    renderResponsiveTable('codes', rows, cards);
}

window.generateNewCode = async () => {
    const code = prompt("Enter a custom memorable code (or leave empty for random):");
    if (code === null) return;
    
    const finalCode = code.trim() || Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const assigned = prompt("Assign this code to (Name/Role):");
    if (assigned === null) return;
    
    const { error } = await sb.from('secret_codes').insert([{ code: finalCode, assigned_to: assigned, is_active: true }]);
    
    if (error) alert("Error creating code: " + error.message);
    else loadFinanceCodes();
};

window.editSecretCode = async (id, oldCode) => {
    const newCode = prompt("Update secret code (make it memorable):", oldCode);
    if (!newCode || newCode === oldCode) return;
    
    const { error } = await sb.from('secret_codes').update({ code: newCode.trim() }).eq('id', id);
    if (error) alert("Error updating code: " + error.message);
    else loadFinanceCodes();
};

window.toggleCodeStatus = async (id, currentStatus) => {
    const { error } = await sb.from('secret_codes').update({ is_active: !currentStatus }).eq('id', id);
    if (!error) loadFinanceCodes();
};

window.deleteSecretCode = async (id) => {
    if (confirm("Delete this secret code?")) {
        const { error } = await sb.from('secret_codes').delete().eq('id', id);
        if (!error) loadFinanceCodes();
    }
};

async function loadFinanceGoods() {
    const { data, error } = await sb.from('goods').select('*').order('created_at', { ascending: false });
    if (error) return;

    const rows = data.map(g => `
        <tr>
            <td>
                <strong>${g.name}</strong>
                <div style="font-size:0.7rem; color:var(--text-secondary);">${g.vendor || 'Unknown Vendor'}</div>
            </td>
            <td>${g.quantity}</td>
            <td><span class="tag" style="background:rgba(255,255,255,0.05);">${g.category}</span></td>
            <td>
                <span class="tag" style="background:${g.status === 'Bought' ? 'rgba(34,197,94,0.1)' : 'rgba(249,115,22,0.1)'}; color:${g.status === 'Bought' ? 'var(--success-color)' : '#fb923c'};">
                    ${g.status}
                </span>
            </td>
            <td style="text-align:right;">Rs. ${parseFloat(g.estimated_cost).toLocaleString()}</td>
            <td style="text-align:right; font-weight:bold;">Rs. ${parseFloat(g.actual_cost).toLocaleString()}</td>
        </tr>
    `).join('');

    const cards = data.map(g => `
        <div class="mobile-card">
            <div class="flex-row">
                <span class="font-bold">${g.name}</span>
                <span class="tag ${g.status === 'Bought' ? 'success' : 'warning'}">${g.status}</span>
            </div>
            <div class="meta-row">${g.category} • Qty: ${g.quantity}</div>
            <div class="footer-grid">
                <div><span class="label">Est.</span> Rs. ${parseFloat(g.estimated_cost).toLocaleString()}</div>
                <div style="text-align:right;"><span class="label">Actual</span> Rs. ${parseFloat(g.actual_cost).toLocaleString()}</div>
            </div>
        </div>
    `).join('');

    renderResponsiveTable('goods', rows, cards);
}

async function loadFinanceExpenses() {
    const { data, error } = await sb.from('expenses').select('*').order('created_at', { ascending: false });
    if (error) return;

    const rows = data.map(e => `
        <tr>
            <td>
                <strong>${e.title}</strong>
                <div style="font-size:0.7rem; color:var(--text-secondary);">${new Date(e.created_at).toLocaleDateString()}</div>
            </td>
            <td style="font-family:monospace; font-size:0.8rem;">${e.issued_by_code}</td>
            <td>
                <span class="tag" style="background:${e.status === 'Approved' ? 'rgba(34,197,94,0.1)' : (e.status === 'Rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(249,115,22,0.1)')}; color:${e.status === 'Approved' ? 'var(--success-color)' : (e.status === 'Rejected' ? 'var(--danger-color)' : '#fb923c')};">
                    ${e.status}
                </span>
            </td>
            <td style="text-align:right; font-weight:bold;">Rs. ${parseFloat(e.amount).toLocaleString()}</td>
            <td style="text-align:center;">
                ${e.proof_url ? `<a href="${e.proof_url}" target="_blank" title="View Receipt">📄</a>` : '---'}
            </td>
            <td style="text-align:right;">
                <button class="btn secondary small" onclick="updateExpenseState('${e.id}', 'Approved')">✅</button>
                <button class="btn secondary small" onclick="updateExpenseState('${e.id}', 'Rejected')">❌</button>
            </td>
        </tr>
    `).join('');

    const cards = data.map(e => `
        <div class="mobile-card">
            <div class="flex-row">
                <span class="font-bold">${e.title}</span>
                <span class="tag ${e.status === 'Approved' ? 'success' : (e.status === 'Rejected' ? 'danger' : 'warning')}">${e.status}</span>
            </div>
            <div class="meta-row">${new Date(e.created_at).toLocaleDateString()} • ${e.issued_by_code}</div>
            <div class="flex-row" style="margin-top:10px;">
                <span class="font-bold">Rs. ${parseFloat(e.amount).toLocaleString()}</span>
                <div style="display:flex; gap:5px;">
                     ${e.proof_url ? `<a href="${e.proof_url}" target="_blank" class="btn secondary small">📄 Proof</a>` : ''}
                     <button class="btn secondary small" onclick="updateExpenseState('${e.id}', 'Approved')">✅</button>
                     <button class="btn secondary small" onclick="updateExpenseState('${e.id}', 'Rejected')">❌</button>
                </div>
            </div>
        </div>
    `).join('');

    renderResponsiveTable('expenses', rows, cards);
}

function renderResponsiveTable(viewName, rowHtml, cardHtml) {
    const tableBody = document.getElementById(`${viewName}-table-body`);
    const mobileList = document.getElementById(`${viewName}-mobile-list`);
    
    if (tableBody) tableBody.innerHTML = rowHtml || `<tr><td colspan="10" style="text-align:center; padding:40px; color:var(--text-secondary);">No data found</td></tr>`;
    if (mobileList) mobileList.innerHTML = cardHtml || `<div style="text-align:center; padding:40px; color:var(--text-secondary);">No data found</div>`;
}

window.updateExpenseState = async (id, status) => {
    const { error } = await sb.from('expenses').update({ status }).eq('id', id);
    if (!error) loadFinanceExpenses();
};

window.exportFinanceReport = async () => {
    try {
        const [goodsRes, expensesRes] = await Promise.all([
            sb.from('goods').select('*'),
            sb.from('expenses').select('*')
        ]);
        
        const goods = goodsRes.data || [];
        const expenses = expensesRes.data || [];

        let csv = 'Type,ID,Title/Name,Amount/Cost,Status,Date,Issued By/Vendor\n';
        
        goods.forEach(g => {
            csv += `GOOD,${g.id},"${g.name}",${g.actual_cost || g.estimated_cost},${g.status},${g.purchase_date || '-'},"${g.vendor || ''}"\n`;
        });
        
        expenses.forEach(e => {
            csv += `EXPENSE,${e.id},"${e.title}",${e.amount},${e.status},${e.date},"${e.issued_by_code}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Nova_Finance_Report_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        alert("Master finance report exported successfully!");
    } catch (error) {
        console.error("Export Error:", error);
        alert("Failed to export report.");
    }
};
