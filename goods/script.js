// Goods Management Script for Hackathon Nova
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
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

// Fetch and Render Inventory
async function fetchInventory() {
    try {
        const { data, error } = await sb
            .from('goods')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        inventoryData = data;
        renderInventory(inventoryData);
        updateSummary(inventoryData);
    } catch (error) {
        console.error('Error fetching inventory:', error);
        if (inventoryTableBody) inventoryTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">Error loading data.</td></tr>`;
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
                <span class="px-2 py-0.5 rounded-full text-[9px] uppercase font-black border ${item.status === 'Bought' ? 'status-bought' : 'status-pending'}">
                    ${item.status}
                </span>
            </td>
            <td class="px-6 py-4 text-right font-mono text-gray-400 text-sm">Rs. ${parseFloat(item.estimated_cost).toLocaleString()}</td>
            <td class="px-6 py-4 text-right font-mono text-white text-sm">Rs. ${parseFloat(item.actual_cost).toLocaleString()}</td>
            <td class="px-6 py-4 text-center">
                <button onclick="deleteItem('${item.id}')" class="text-gray-500 hover:text-red-500 transition px-2">
                    <i class="far fa-trash-alt"></i>
                </button>
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
                <span class="px-2 py-0.5 rounded-full text-[9px] uppercase font-black border ${item.status === 'Bought' ? 'status-bought' : 'status-pending'}">
                    ${item.status}
                </span>
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
            <div class="mt-4 flex justify-end">
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
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

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
        const { error } = await sb.from('goods').insert([formData]);
        if (error) throw error;

        goodsForm.reset();
        document.getElementById('bought-fields').classList.add('hidden');
        fetchInventory();
    } catch (error) {
        alert('Error adding item: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerText = 'Add Item';
    }
});

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

// Initial Load
fetchInventory();
