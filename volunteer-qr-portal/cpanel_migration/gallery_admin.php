<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gallery Admin | Hackathon Nova</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Fira+Code:wght@400;500&display=swap');
        body { font-family: 'Inter', sans-serif; background: #0f172a; color: #f8fafc; }
        .font-mono { font-family: 'Fira Code', monospace; }
    </style>
</head>
<body class="p-4 md:p-8">
    <div class="max-w-4xl mx-auto">
        <header class="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
            <h1 class="text-2xl font-bold text-orange-500 font-mono">&lt; Gallery.Admin /&gt;</h1>
            <a href="/" class="text-gray-400 hover:text-white transition">Back to Site</a>
        </header>

        <!-- Quick Upload Section -->
        <div class="bg-gray-800 rounded-xl p-6 mb-8 border border-gray-700 shadow-xl">
            <h2 class="text-xl font-semibold mb-4 text-orange-400 flex items-center gap-2">
                <span>📁</span> Bulk Upload
            </h2>
            <form id="bulk-upload-form" class="space-y-4">
                <input type="hidden" name="api_key" value="nova_admin_2026">
                <input type="hidden" name="action" value="upload">
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-400 mb-1">Select Day</label>
                        <select name="day" class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 outline-none focus:border-orange-500">
                            <option value="1">Day 1</option>
                            <option value="2">Day 2</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-400 mb-1">Grid Size (Randomized if multiple)</label>
                        <select name="span" class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 outline-none focus:border-orange-500">
                            <option value="1x1">Standard (1x1)</option>
                            <option value="2x1">Wide (2x1)</option>
                            <option value="2x2">Large (2x2)</option>
                        </select>
                    </div>
                </div>

                <div class="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-orange-500/50 transition cursor-pointer" onclick="document.getElementById('file-input').click()">
                    <input type="file" id="file-input" name="file[]" multiple class="hidden" onchange="updateFileList(this)">
                    <p class="text-gray-400" id="file-label">Click to select images or videos (Bulk)</p>
                    <p class="text-xs text-gray-500 mt-2">Support: .JPG, .PNG, .MP4</p>
                </div>

                <button type="submit" id="btn-upload" class="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-lg transition shadow-lg shadow-orange-600/20">
                    Process Upload
                </button>
            </form>
            <div id="upload-status" class="mt-4 p-3 rounded-lg hidden"></div>
        </div>

        <!-- Manage Section -->
        <div class="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl relative">
            <div class="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <h2 class="text-xl font-semibold flex items-center gap-2">
                    <span>🖼️</span> Manage Gallery
                </h2>
                <div class="flex items-center gap-4">
                    <div class="relative flex-1 md:w-64">
                        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">🔍</span>
                        <input type="text" id="admin-search" placeholder="Search items..." 
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:border-orange-500 transition-all">
                    </div>
                    <div class="flex items-center gap-2 text-sm text-gray-400">
                        <input type="checkbox" id="select-all" class="w-4 h-4 accent-orange-500 cursor-pointer" onchange="toggleSelectAll(this)">
                        <label for="select-all" class="cursor-pointer">Select All</label>
                    </div>
                </div>
            </div>

            <!-- Bulk Action Bar -->
            <div id="bulk-actions" class="hidden bg-gray-900 border border-orange-500/50 rounded-lg p-3 mb-6 flex flex-wrap items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
                <div class="text-sm font-medium text-orange-400">
                    <span id="selected-count">0</span> items selected
                </div>
                <div class="flex items-center gap-2">
                    <select id="bulk-day" class="bg-gray-800 border border-gray-700 rounded p-1.5 text-sm outline-none focus:border-orange-500">
                        <option value="1">Move to Day 1</option>
                        <option value="2">Move to Day 2</option>
                    </select>
                    <button onclick="applyBulkDay()" class="bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold px-3 py-1.5 rounded transition">
                        Apply
                    </button>
                    <div class="w-px h-6 bg-gray-700 mx-1"></div>
                    <button onclick="applyBulkDelete()" class="text-red-500 hover:bg-red-500/10 text-sm font-bold px-3 py-1.5 rounded transition">
                        Delete Selected
                    </button>
                </div>
            </div>

            <div id="items-list" class="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                <!-- Items list dynamic -->
                <p class="text-gray-500 text-center py-8">Loading items...</p>
            </div>
        </div>
    </div>

    <script>
        const API_KEY = "nova_admin_2026";
        const MAIN_SITE_URL = "https://hackathon-nova.com"; // Adjust if different

        function updateFileList(input) {
            const label = document.getElementById('file-label');
            label.innerText = input.files.length > 0 ? `${input.files.length} file(s) selected` : "Click to select images or videos (Bulk)";
        }

        document.getElementById('bulk-upload-form').onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-upload');
            const status = document.getElementById('upload-status');
            const formData = new FormData(e.target);

            btn.disabled = true;
            btn.innerText = "Uploading...";
            status.classList.add('hidden');

            try {
                const res = await fetch('upload_handler.php', { method: 'POST', body: formData });
                const data = await res.json();
                
                if(data.success) {
                    status.innerText = `Success! Uploaded ${data.uploaded.length} files.`;
                    status.className = "mt-4 p-3 rounded-lg bg-green-500/20 text-green-400 block border border-green-500/30";
                    e.target.reset();
                    updateFileList({files: []});
                    loadItems();
                } else {
                    throw new Error(data.error || "Upload failed");
                }
            } catch (err) {
                status.innerText = "Error: " + err.message;
                status.className = "mt-4 p-3 rounded-lg bg-red-500/20 text-red-400 block border border-red-500/30";
            } finally {
                btn.disabled = false;
                btn.innerText = "Process Upload";
            }
        };

        function toggleSelectAll(checkbox) {
            const checks = document.querySelectorAll('.item-checkbox');
            checks.forEach(c => c.checked = checkbox.checked);
            updateSelectedCount();
        }

        function updateSelectedCount() {
            const count = document.querySelectorAll('.item-checkbox:checked').length;
            const bar = document.getElementById('bulk-actions');
            const countEl = document.getElementById('selected-count');
            
            countEl.innerText = count;
            if (count > 0) bar.classList.remove('hidden');
            else bar.classList.add('hidden');

            // Update Select All state
            const total = document.querySelectorAll('.item-checkbox').length;
            document.getElementById('select-all').checked = (count === total && total > 0);
        }

        async function applyBulkDay() {
            const selected = Array.from(document.querySelectorAll('.item-checkbox:checked')).map(c => c.value);
            const day = document.getElementById('bulk-day').value;
            
            if (!confirm(`Are you sure you want to move ${selected.length} items to Day ${day}?`)) return;

            const formData = new FormData();
            formData.append('action', 'update_day');
            formData.append('api_key', API_KEY);
            formData.append('day', day);
            selected.forEach(id => formData.append('ids[]', id));

            try {
                const res = await fetch('upload_handler.php', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.success) {
                    loadItems();
                    document.getElementById('select-all').checked = false;
                } else {
                    alert("Bulk update failed: " + data.error);
                }
            } catch (err) { alert("Bulk update error"); }
        }

        async function applyBulkDelete() {
            const selected = Array.from(document.querySelectorAll('.item-checkbox:checked')).map(c => c.value);
            if (!confirm(`CRITICAL: Are you sure you want to PERMANENTLY DELETE ${selected.length} items? This cannot be undone.`)) return;

            const formData = new FormData();
            formData.append('action', 'delete_bulk');
            formData.append('api_key', API_KEY);
            selected.forEach(id => formData.append('ids[]', id));

            try {
                const res = await fetch('upload_handler.php', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.success) {
                    loadItems();
                    document.getElementById('select-all').checked = false;
                } else {
                    alert("Bulk delete failed: " + data.error);
                }
            } catch (err) { alert("Bulk delete error"); }
        }

        let allGalleryItems = [];

        async function loadItems() {
            try {
                const res = await fetch('get_gallery.php');
                allGalleryItems = await res.json();
                renderItems(allGalleryItems);
            } catch (err) {
                document.getElementById('items-list').innerHTML = '<p class="text-red-400 text-center py-8">Failed to load items.</p>';
            }
        }

        function renderItems(items) {
            const list = document.getElementById('items-list');
            
            if(items.length === 0) {
                list.innerHTML = '<p class="text-gray-500 text-center py-8">No matching items found.</p>';
                updateSelectedCount();
                return;
            }

            list.innerHTML = [...items].reverse().map(item => {
                const fullSrc = item.src.startsWith('http') ? item.src : MAIN_SITE_URL + item.src;
                return `
                <div class="flex items-center justify-between p-3 bg-gray-900 rounded-lg border border-gray-700 hover:border-orange-500/30 transition shadow-sm group">
                    <div class="flex items-center gap-3 overflow-hidden">
                        <input type="checkbox" class="item-checkbox w-4 h-4 accent-orange-500 cursor-pointer" value="${item.id}" onchange="updateSelectedCount()">
                        <div class="w-12 h-12 rounded bg-gray-800 flex-shrink-0">
                            ${item.type === 'image' ? `<img src="${fullSrc}" class="w-full h-full object-cover rounded">` : '<div class="w-full h-full flex items-center justify-center">📹</div>'}
                        </div>
                        <div class="truncate">
                            <p class="text-sm font-medium truncate">${item.src.split('/').pop()}</p>
                            <p class="text-xs text-gray-500">Day ${item.day} • ${item.span}</p>
                        </div>
                    </div>
                    <button onclick="deleteItem(${item.id})" class="text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 p-2 rounded transition">🗑️</button>
                </div>
            `;}).join('');
            
            updateSelectedCount(); 
        }

        document.getElementById('admin-search').addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const filtered = allGalleryItems.filter(item => 
                item.src.toLowerCase().includes(query)
            );
            renderItems(filtered);
        });

        async function deleteItem(id) {
            if(!confirm('Are you sure you want to delete this item?')) return;
            
            const formData = new FormData();
            formData.append('action', 'delete');
            formData.append('api_key', API_KEY);
            formData.append('id', id);

            try {
                const res = await fetch('upload_handler.php', { method: 'POST', body: formData });
                const data = await res.json();
                if(data.success) loadItems();
                else alert("Delete failed: " + data.error);
            } catch (err) { alert("Delete error"); }
        }

        loadItems();
    </script>
</body>
</html>
