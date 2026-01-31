<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gallery Admin | Hackathon Nova</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css" />
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Fira+Code:wght@400;500&display=swap');
        body { font-family: 'Inter', sans-serif; background: #0f172a; color: #f8fafc; }
        .font-mono { font-family: 'Fira Code', monospace; }
        .star-btn { transition: all 0.2s; }
        .star-btn:hover { transform: scale(1.2); }
        .star-btn.active { color: #f59e0b; fill: #f59e0b; }
        .item-card { transition: all 0.2s; }
        .item-card:hover { border-color: rgba(249, 115, 22, 0.4); background: #1e293b; }
        /* Custom Scrollbar */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #1e293b; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #475569; }
    </style>
</head>
<body class="p-4 md:p-8">
    <div class="max-w-6xl mx-auto">
        <header class="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
            <h1 class="text-2xl font-bold text-orange-500 font-mono">&lt; Gallery.Admin /&gt;</h1>
            <div class="flex items-center gap-4">
                <button onclick="runCleanup()" class="bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition border border-gray-600">
                    ✨ Clean Duplicates
                </button>
                <a href="/" class="text-gray-400 hover:text-white transition text-sm">Back to Site</a>
            </div>
        </header>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Left: Upload Section (Stays sticky) -->
            <div class="lg:col-span-1">
                <div class="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl sticky top-8">
                    <h2 class="text-xl font-semibold mb-4 text-orange-400 flex items-center gap-2">
                        <span>📁</span> Bulk Upload
                    </h2>
                    <form id="bulk-upload-form" class="space-y-4">
                        <input type="hidden" name="api_key" value="nova_admin_2026">
                        <input type="hidden" name="action" value="upload">
                        
                        <div class="grid grid-cols-1 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-400 mb-1">Select Day</label>
                                <select name="day" class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 outline-none focus:border-orange-500">
                                    <option value="1">Day 1</option>
                                    <option value="2">Day 2</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-400 mb-1">Grid Size</label>
                                <select name="span" class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 outline-none focus:border-orange-500">
                                    <option value="1x1">Standard (1x1)</option>
                                    <option value="2x1">Wide (2x1)</option>
                                    <option value="2x2">Large (2x2)</option>
                                </select>
                            </div>
                        </div>

                        <div class="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-orange-500/50 transition cursor-pointer" onclick="document.getElementById('file-input').click()">
                            <input type="file" id="file-input" name="file[]" multiple class="hidden" onchange="updateFileList(this)">
                            <p class="text-gray-400" id="file-label">Click to select images/videos</p>
                            <p class="text-xs text-gray-500 mt-2">Bulk upload supported</p>
                        </div>

                        <button type="submit" id="btn-upload" class="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-lg transition shadow-lg shadow-orange-600/20">
                            Process Upload
                        </button>
                    </form>
                    <div id="upload-status" class="mt-4 p-3 rounded-lg hidden"></div>
                </div>
            </div>

            <!-- Right: Manage Section -->
            <div class="lg:col-span-2">
                <div class="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl min-h-[600px]">
                    <div class="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                        <h2 class="text-xl font-semibold flex items-center gap-2">
                            <span>🖼️</span> Manage Gallery
                        </h2>
                        <div class="flex flex-wrap items-center gap-3">
                            <div class="relative flex-1 min-w-[200px]">
                                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">🔍</span>
                                <input type="text" id="admin-search" placeholder="Search items..." 
                                    class="w-full bg-gray-900 border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:border-orange-500 transition-all">
                            </div>
                            <button id="filter-featured" onclick="toggleFeaturedFilter()" class="border border-gray-700 bg-gray-900 px-3 py-2 rounded-lg text-sm transition hover:bg-gray-800">
                                ⭐ Featured Only
                            </button>
                            <div class="flex items-center gap-2 text-sm text-gray-400 border-l border-gray-700 pl-3">
                                <input type="checkbox" id="select-all" class="w-4 h-4 accent-orange-500 cursor-pointer" onchange="toggleSelectAll(this)">
                                <label for="select-all" class="cursor-pointer">All</label>
                            </div>
                        </div>
                    </div>

                    <!-- Bulk Action Bar -->
                    <div id="bulk-actions" class="hidden bg-gray-900 border border-orange-500/50 rounded-lg p-3 mb-6 flex flex-wrap items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
                        <div class="text-sm font-medium text-orange-400">
                            <span id="selected-count">0</span> selected
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                            <select id="bulk-day" class="bg-gray-800 border border-gray-700 rounded p-1.5 text-sm outline-none focus:border-orange-500">
                                <option value="1">Day 1</option>
                                <option value="2">Day 2</option>
                            </select>
                            <button onclick="applyBulkDay()" class="bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium px-3 py-1.5 rounded transition">
                                Set Day
                            </button>
                            <button onclick="applyBulkFeatured(true)" class="bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium px-3 py-1.5 rounded transition">
                                ⭐ Star
                            </button>
                             <button onclick="applyBulkFeatured(false)" class="bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium px-3 py-1.5 rounded transition">
                                ⚪ Unstar
                            </button>
                            <div class="w-px h-6 bg-gray-700 mx-1"></div>
                            <button onclick="applyBulkDelete()" class="text-red-500 hover:bg-red-500/10 text-sm font-bold px-3 py-1.5 rounded transition">
                                Delete
                            </button>
                        </div>
                    </div>

                    <div id="items-list" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <!-- Items list dynamic -->
                        <p class="col-span-full text-gray-500 text-center py-20">Loading gallery items...</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Notification Toast -->
    <div id="toast" class="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl bg-gray-900 border border-orange-500/50 text-orange-400 shadow-2xl transition-all opacity-0 translate-y-10 z-50 pointer-events-none">
    </div>

    <script>
        const API_KEY = "nova_admin_2026";
        const MAIN_SITE_URL = window.location.origin;

        function showToast(msg, isError = false) {
            const t = document.getElementById('toast');
            t.innerText = msg;
            t.className = `fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl bg-gray-900 border shadow-2xl transition-all z-50 pointer-events-none ${isError ? 'border-red-500/50 text-red-400' : 'border-orange-500/50 text-orange-400'}`;
            t.classList.remove('opacity-0', 'translate-y-10');
            setTimeout(() => {
                t.classList.add('opacity-0', 'translate-y-10');
            }, 3000);
        }

        function updateFileList(input) {
            const label = document.getElementById('file-label');
            label.innerText = input.files.length > 0 ? `${input.files.length} file(s) selected` : "Click to select images/videos";
        }

        document.getElementById('bulk-upload-form').onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-upload');
            const status = document.getElementById('upload-status');
            const fileInput = document.getElementById('file-input');
            const files = fileInput.files;
            
            if (files.length === 0) return;

            btn.disabled = true;
            status.classList.remove('hidden');
            status.className = "mt-4 p-3 rounded-lg bg-orange-500/20 text-orange-400 block border border-orange-500/30";

            const BATCH_SIZE = 5;
            const totalBatches = Math.ceil(files.length / BATCH_SIZE);
            let successCount = 0;
            let errorCount = 0;

            for (let i = 0; i < totalBatches; i++) {
                const start = i * BATCH_SIZE;
                const end = Math.min(start + BATCH_SIZE, files.length);
                const batchFiles = Array.from(files).slice(start, end);

                status.innerText = `Uploading batch ${i + 1}/${totalBatches}... (${end}/${files.length})`;

                const formData = new FormData(e.target);
                formData.delete('file[]'); 
                batchFiles.forEach(file => formData.append('file[]', file));
                formData.set('api_key', API_KEY);

                try {
                    const res = await fetch('upload_handler.php', { method: 'POST', body: formData });
                    const data = await res.json();
                    if (data.success) successCount += batchFiles.length;
                    else errorCount += batchFiles.length;
                } catch (err) {
                    errorCount += batchFiles.length;
                }
            }

            if (successCount > 0) {
                showToast(`Successfully uploaded ${successCount} files!`);
                status.className = "hidden";
                e.target.reset();
                updateFileList({files: []});
                loadItems();
            } else {
                showToast("Upload failed.", true);
                status.className = "mt-4 p-3 rounded-lg bg-red-500/20 text-red-400 block border border-red-500/30";
                status.innerText = "Upload failed. Check console.";
            }

            btn.disabled = false;
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

            const total = document.querySelectorAll('.item-checkbox').length;
            document.getElementById('select-all').checked = (count === total && total > 0);
        }

        async function applyBulkDay() {
            const selected = Array.from(document.querySelectorAll('.item-checkbox:checked')).map(c => c.value);
            const day = document.getElementById('bulk-day').value;
            
            const formData = new FormData();
            formData.append('action', 'update_day');
            formData.append('api_key', API_KEY);
            formData.append('day', day);
            selected.forEach(id => formData.append('ids[]', id));

            try {
                const res = await fetch('upload_handler.php', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.success) {
                    showToast(`Moved ${selected.length} items to Day ${day}`);
                    loadItems();
                }
            } catch (err) { showToast("Error connecting to server", true); }
        }

        async function applyBulkFeatured(featured) {
            const selected = Array.from(document.querySelectorAll('.item-checkbox:checked')).map(c => c.value);
            const formData = new FormData();
            formData.append('action', 'toggle_featured_bulk');
            formData.append('api_key', API_KEY);
            formData.append('is_featured', featured ? 1 : 0);
            selected.forEach(id => formData.append('ids[]', id));

            try {
                const res = await fetch('upload_handler.php', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.success) {
                    showToast(`${featured ? 'Starred' : 'Unstarred'} ${selected.length} items`);
                    loadItems();
                }
            } catch (err) { showToast("Error connecting to server", true); }
        }

        async function applyBulkDelete() {
            const selected = Array.from(document.querySelectorAll('.item-checkbox:checked')).map(c => c.value);
            if (!confirm(`Permanently delete ${selected.length} items?`)) return;

            const formData = new FormData();
            formData.append('action', 'delete_bulk');
            formData.append('api_key', API_KEY);
            selected.forEach(id => formData.append('ids[]', id));

            try {
                const res = await fetch('upload_handler.php', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.success) {
                    showToast(`Deleted ${selected.length} items`);
                    loadItems();
                }
            } catch (err) { showToast("Error connecting to server", true); }
        }

        async function runCleanup() {
            if (!confirm("Auto-identify and merge duplicate items? (Content-based MD5 check)")) return;
            const formData = new FormData();
            formData.append('action', 'cleanup_duplicates');
            formData.append('api_key', API_KEY);

            try {
                const res = await fetch('upload_handler.php', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.success) {
                    showToast(data.message);
                    loadItems();
                }
            } catch (err) { showToast("Cleanup error", true); }
        }

        let allGalleryItems = [];
        let showFeaturedOnly = false;

        async function loadItems() {
            try {
                const res = await fetch(`get_gallery.php?_=${Date.now()}`);
                allGalleryItems = await res.json();
                filterAndRender();
            } catch (err) {
                document.getElementById('items-list').innerHTML = '<p class="col-span-full text-red-400 text-center py-8">Failed to load items.</p>';
            }
        }

        function toggleFeaturedFilter() {
            showFeaturedOnly = !showFeaturedOnly;
            const btn = document.getElementById('filter-featured');
            btn.className = showFeaturedOnly 
                ? "border border-orange-500/50 bg-orange-500/10 px-3 py-2 rounded-lg text-sm transition text-orange-500"
                : "border border-gray-700 bg-gray-900 px-3 py-2 rounded-lg text-sm transition hover:bg-gray-800";
            filterAndRender();
        }

        function filterAndRender() {
            const query = document.getElementById('admin-search').value.toLowerCase().trim();
            let filtered = allGalleryItems.filter(item => {
                const matchSearch = item.src.toLowerCase().includes(query);
                const matchFeatured = showFeaturedOnly ? item.is_featured : true;
                return matchSearch && matchFeatured;
            });
            renderItems(filtered);
        }

        function renderItems(items) {
            const list = document.getElementById('items-list');
            
            if(items.length === 0) {
                list.innerHTML = `<div class="col-span-full text-center py-20 bg-gray-900/50 rounded-xl border border-dashed border-gray-700">
                    <p class="text-gray-500 italic">No items found matching criteria.</p>
                </div>`;
                updateSelectedCount();
                return;
            }

            list.innerHTML = [...items].reverse().map(item => {
                // Robustly determine the main site origin
                const currentOrigin = window.location.origin;
                const hostname = window.location.hostname;
                let mainOrigin = currentOrigin;
                
                if (hostname.startsWith('admin.')) {
                    mainOrigin = currentOrigin.replace('admin.', '');
                } else if (hostname.includes('admin')) {
                    // Fallback for cases like admin-nova.com if applicable
                    mainOrigin = currentOrigin.replace('admin', 'www');
                }

                const fullSrc = item.src.startsWith('http') ? item.src : (mainOrigin + (item.src.startsWith('/') ? '' : '/') + item.src);
                const filename = item.src.split('/').pop();
                
                // Debug log to console (user can see this)
                console.log(`Rendering Item ${item.id}:`, { src: item.src, fullSrc: fullSrc });
                return `
                <div class="item-card flex flex-col p-3 bg-gray-900 rounded-xl border border-gray-700 shadow-sm relative group">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-2">
                            <input type="checkbox" class="item-checkbox w-4 h-4 accent-orange-500 cursor-pointer" value="${item.id}" onchange="updateSelectedCount()">
                            <span class="text-[10px] font-mono text-gray-500">ID: ${item.id}</span>
                        </div>
                        <div class="flex items-center gap-1">
                            <button onclick="toggleFeatured(${item.id}, ${item.is_featured ? 0 : 1})" 
                                class="star-btn p-1.5 rounded-lg hover:bg-gray-800 ${item.is_featured ? 'active text-orange-500' : 'text-gray-600'}" 
                                title="${item.is_featured ? 'Unstar from highlights' : 'Star for highlights'}">
                                <svg class="w-5 h-5" fill="${item.is_featured ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
                            </button>
                            <button onclick="deleteItem(${item.id})" class="text-gray-600 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-500/10 transition" title="Delete">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    </div>
                    <div class="aspect-square rounded-lg bg-gray-800 overflow-hidden mb-3 border border-gray-700">
                        ${item.type === 'image' ? `<img src="${fullSrc}" class="w-full h-full object-cover">` : `<video src="${fullSrc}" class="w-full h-full object-cover"></video>`}
                    </div>
                    <div class="px-1">
                        <p class="text-xs font-medium truncate text-gray-300" title="${filename}">${filename}</p>
                        <div class="flex items-center justify-between mt-1">
                            <span class="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700">Day ${item.day}</span>
                            <span class="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700 uppercase">${item.span}</span>
                        </div>
                    </div>
                </div>
            `;}).join('');
            
            updateSelectedCount(); 
        }

        document.getElementById('admin-search').addEventListener('input', filterAndRender);

        async function toggleFeatured(id, val) {
            const formData = new FormData();
            formData.append('action', 'toggle_featured');
            formData.append('api_key', API_KEY);
            formData.append('id', id);
            formData.append('is_featured', val);

            try {
                const res = await fetch('upload_handler.php', { method: 'POST', body: formData });
                const data = await res.json();
                if(data.success) {
                    showToast(val ? "Added to highlights" : "Removed from highlights");
                    loadItems();
                }
            } catch (err) { showToast("Error connecting to server", true); }
        }

        async function deleteItem(id) {
            if(!confirm('Permanently delete this item?')) return;
            const formData = new FormData();
            formData.append('action', 'delete');
            formData.append('api_key', API_KEY);
            formData.append('id', id);

            try {
                const res = await fetch('upload_handler.php', { method: 'POST', body: formData });
                const data = await res.json();
                if(data.success) {
                    showToast("Item deleted");
                    loadItems();
                }
            } catch (err) { showToast("Delete error", true); }
        }

        loadItems();
    </script>
</body>
</html>
