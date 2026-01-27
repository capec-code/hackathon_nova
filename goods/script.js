// Goods Management Script for Hackathon Nova
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const mainDashboard = document.getElementById('main-dashboard');
const loginForm = document.getElementById('login-form');
const userBadge = document.getElementById('user-badge');
const displayCode = document.getElementById('display-code');

const goodsForm = document.getElementById('goods-form');
const inventoryTableBody = document.getElementById('inventory-table-body');
const mobileList = document.getElementById('inventory-mobile-list');
const searchBox = document.getElementById('search-box');

// Summary elements
const totalItemsEl = document.getElementById('summary-total-items');
const boughtItemsEl = document.getElementById('summary-bought-items');
const estCostEl = document.getElementById('summary-est-cost');
const actualCostEl = document.getElementById('summary-actual-cost');

let inventoryData = [];
let currentCode = localStorage.getItem('nova_goods_code');

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
    btn.innerText = 'Unlock Inventory';
});

async function validateAndLogin(code) {
    try {
        const { data, error } = await sb.from('secret_codes').select('*').eq('code', code).eq('is_active', true).single();
        if (error || !data) throw new Error('Invalid or disabled secret code.');

        currentCode = code;
        localStorage.setItem('nova_goods_code', code);
        
        loginScreen.classList.add('hidden-state');
        mainDashboard.classList.remove('hidden-state');
        userBadge.classList.remove('hidden');
        displayCode.innerText = `CODE: ${code.substring(0, 4)}****`;
        
        fetchInventory();
    } catch (error) {
        document.getElementById('login-error').innerText = error.message;
        document.getElementById('login-error').classList.remove('hidden');
        localStorage.removeItem('nova_goods_code');
    }
}

function logout() {
    localStorage.removeItem('nova_goods_code');
    location.reload();
}

// Fetch and Render Inventory
async function fetchInventory() {
    try {
        const { data, error } = await sb.from('goods').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        inventoryData = data;
        renderInventory(inventoryData);
        updateSummary(inventoryData);
    } catch (error) {
        console.error('Error fetching inventory:', error);
    }
}

function renderInventory(items) {
    if (!inventoryTableBody || !mobileList) return;

    if (items.length === 0) {
        const emptyState = `<div class="px-6 py-12 text-center text-gray-500 italic">No items found.</div>`;
        inventoryTableBody.innerHTML = `<tr><td colspan="5">${emptyState}</td></tr>`;
        mobileList.innerHTML = emptyState;
        return;
    }

    // Desktop Table
    inventoryTableBody.innerHTML = items.map(item => `
        <tr class="hover:bg-white/5 transition group">
            <td class="px-6 py-4">
                <div class="font-semibold text-white tracking-tight">${item.name}</div>
                <div class="text-[10px] text-gray-500 uppercase font-bold">${item.category} • Qty: ${item.quantity}</div>
            </td>
            <td class="px-6 py-4">
                <button onclick="toggleStatus('${item.id}', '${item.status}')" class="px-2 py-0.5 rounded-full text-[9px] uppercase font-black border hover:opacity-80 transition ${item.status === 'Bought' ? 'status-bought' : 'status-pending'}">
                    ${item.status}
                </button>
            </td>
            <td class="px-6 py-4 text-right font-mono text-gray-400 text-sm">Rs. ${parseFloat(item.estimated_cost).toLocaleString()}</td>
            <td class="px-6 py-4 text-right font-mono text-white text-sm">Rs. ${parseFloat(item.actual_cost).toLocaleString()}</td>
            <td class="px-6 py-4 text-center">
                <button onclick="editItem('${item.id}')" class="text-blue-500 hover:text-white transition px-2"><i class="fas fa-edit"></i></button>
                <button onclick="deleteItem('${item.id}')" class="text-gray-500 hover:text-red-500 transition px-2"><i class="far fa-trash-alt"></i></button>
            </td>
        </tr>
    `).join('');

    // Mobile Card List
    mobileList.innerHTML = items.map(item => `
        <div class="p-4 border-b border-gray-800">
            <div class="flex justify-between items-start mb-2">
                <div>
                   <h4 class="font-bold text-white text-lg">${item.name}</h4>
                   <span class="text-[10px] uppercase font-black text-gray-500">${item.category} • Qty: ${item.quantity}</span>
                </div>
                <button onclick="toggleStatus('${item.id}', '${item.status}')" class="px-2 py-0.5 rounded-full text-[9px] uppercase font-black border ${item.status === 'Bought' ? 'status-bought' : 'status-pending'}">
                    ${item.status}
                </button>
            </div>
            <div class="grid grid-cols-2 gap-4 mt-4">
                <div>
                    <span class="text-[9px] uppercase font-bold text-gray-600 block">Est. Cost</span>
                    <span class="text-sm font-mono text-gray-400">Rs. ${parseFloat(item.estimated_cost).toLocaleString()}</span>
                </div>
                <div class="text-right">
                    <span class="text-[9px] uppercase font-bold text-gray-600 block">Actual Cost</span>
                    <span class="text-sm font-mono text-white">Rs. ${parseFloat(item.actual_cost).toLocaleString()}</span>
                </div>
            </div>
            <div class="mt-4 flex justify-end gap-3">
                <button onclick="editItem('${item.id}')" class="text-xs text-blue-500/80 hover:text-blue-400 font-bold flex items-center">
                    <i class="fas fa-edit mr-1"></i> EDIT
                </button>
                <button onclick="deleteItem('${item.id}')" class="text-xs text-red-500/50 hover:text-red-500 font-bold flex items-center">
                    <i class="far fa-trash-alt mr-1"></i> REMOVE
                </button>
            </div>
        </div>
    `).join('');
}

function updateSummary(items) {
    const total = items.length;
    const bought = items.filter(i => i.status === 'Bought').length;
    const estCost = items.reduce((acc, i) => acc + (parseFloat(i.estimated_cost) || 0), 0);
    const actualCost = items.reduce((acc, i) => acc + (parseFloat(i.actual_cost) || 0), 0);

    totalItemsEl.innerText = total;
    boughtItemsEl.innerText = bought;
    estCostEl.innerText = `Rs. ${estCost.toLocaleString()}`;
    actualCostEl.innerText = `Rs. ${actualCost.toLocaleString()}`;
}

// Add Item
goodsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    const isEdit = btn.dataset.mode === 'edit';
    const editId = btn.dataset.id;
    
    btn.disabled = true;
    btn.innerHTML = isEdit ? '<i class="fas fa-spinner fa-spin"></i> Updating...' : '<i class="fas fa-spinner fa-spin"></i> Adding...';

    const formData = {
        name: document.getElementById('item_name').value,
        quantity: parseInt(document.getElementById('quantity').value || 1),
        category: document.getElementById('category').value,
        estimated_cost: parseFloat(document.getElementById('est_cost').value || 0),
        status: document.getElementById('status').value,
        actual_cost: document.getElementById('status').value === 'Bought' ? parseFloat(document.getElementById('actual_cost').value || 0) : 0,
        vendor: document.getElementById('vendor').value
    };

    try {
        let error;
        if (isEdit) {
            ({ error } = await sb.from('goods').update(formData).eq('id', editId));
        } else {
            ({ error } = await sb.from('goods').insert([formData]));
        }
        
        if (error) throw error;

        goodsForm.reset();
        document.getElementById('bought-fields').classList.add('hidden');
        resetFormState();
        fetchInventory();
    } catch (error) {
        alert('Error saving item: ' + error.message);
    } finally {
        btn.disabled = false;
        resetFormState();
    }
});

function resetFormState() {
    const btn = document.getElementById('submit-btn');
    btn.innerText = 'Add to Inventory';
    btn.dataset.mode = 'add';
    btn.dataset.id = '';
}

// Edit Item
window.editItem = (id) => {
    const item = inventoryData.find(i => i.id === id);
    if (!item) return;

    document.getElementById('item_name').value = item.name;
    document.getElementById('quantity').value = item.quantity;
    document.getElementById('category').value = item.category;
    document.getElementById('est_cost').value = item.estimated_cost;
    document.getElementById('status').value = item.status;
    document.getElementById('actual_cost').value = item.actual_cost;
    document.getElementById('vendor').value = item.vendor;

    if (item.status === 'Bought') {
        document.getElementById('bought-fields').classList.remove('hidden');
    } else {
        document.getElementById('bought-fields').classList.add('hidden');
    }

    const btn = document.getElementById('submit-btn');
    btn.innerText = 'Update Item';
    btn.dataset.mode = 'edit';
    btn.dataset.id = id;
    
    // Scroll to form
    goodsForm.scrollIntoView({ behavior: 'smooth' });
};

// Toggle Status
window.toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Bought' ? 'To Be Bought' : 'Bought';
    let updateData = { status: newStatus };

    if (newStatus === 'Bought') {
        const cost = prompt("Enter actual cost for this item:");
        if (cost === null) return; // Cancelled
        updateData.actual_cost = parseFloat(cost) || 0;
        
        const vendor = prompt("Enter vendor/source (optional):");
        if (vendor !== null) updateData.vendor = vendor;
    }

    const { error } = await sb.from('goods').update(updateData).eq('id', id);
    if (!error) fetchInventory();
    else alert("Error updating status: " + error.message);
};

// Search functionality
searchBox.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = inventoryData.filter(item => 
        item.name.toLowerCase().includes(term) || 
        item.category.toLowerCase().includes(term) ||
        (item.vendor && item.vendor.toLowerCase().includes(term))
    );
    renderInventory(filtered);
});

// Delete item
async function deleteItem(id) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
        const { error } = await sb.from('goods').delete().eq('id', id);
        if (error) throw error;
        fetchInventory();
    } catch (error) {
        alert('Error deleting item: ' + error.message);
    }
}

// Export Inventory
window.exportInventory = () => {
    try {
        let csv = 'Item Name,Quantity,Category,Status,Estimated Cost,Actual Cost,Vendor,Date\n';
        inventoryData.forEach(i => {
            csv += `"${i.name}",${i.quantity},"${i.category}","${i.status}",${i.estimated_cost},${i.actual_cost},"${i.vendor || ''}","${new Date(i.created_at).toLocaleDateString()}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Inventory_Report_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch(err) {
        alert("Export failed: " + err.message);
    }
};

// Initial Load is handled by auth check now
