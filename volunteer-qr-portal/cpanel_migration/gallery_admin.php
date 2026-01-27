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
        <div class="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl">
            <h2 class="text-xl font-semibold mb-6 flex items-center gap-2">
                <span>🖼️</span> Manage Gallery
            </h2>
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

        async function loadItems() {
            const list = document.getElementById('items-list');
            try {
                const res = await fetch('get_gallery.php');
                const items = await res.json();
                
                list.innerHTML = items.reverse().map(item => {
                    const fullSrc = item.src.startsWith('http') ? item.src : MAIN_SITE_URL + item.src;
                    return `
                    <div class="flex items-center justify-between p-3 bg-gray-900 rounded-lg border border-gray-700">
                        <div class="flex items-center gap-3 overflow-hidden">
                            <div class="w-12 h-12 rounded bg-gray-800 flex-shrink-0">
                                ${item.type === 'image' ? `<img src="${fullSrc}" class="w-full h-full object-cover rounded">` : '<div class="w-full h-full flex items-center justify-center">📹</div>'}
                            </div>
                            <div class="truncate">
                                <p class="text-sm font-medium truncate">${item.src.split('/').pop()}</p>
                                <p class="text-xs text-gray-500">Day ${item.day} • ${item.span}</p>
                            </div>
                        </div>
                        <button onclick="deleteItem(${item.id})" class="text-red-500 hover:bg-red-500/10 p-2 rounded transition">🗑️</button>
                    </div>
                `;}).join('');
                
                if(items.length === 0) list.innerHTML = '<p class="text-gray-500 text-center py-8">No items in gallery.</p>';
            } catch (err) {
                list.innerHTML = '<p class="text-red-400 text-center py-8">Failed to load items.</p>';
            }
        }

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
