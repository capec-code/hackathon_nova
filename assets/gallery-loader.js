(function(){
  // State
  let galleryItems = [];
  let currentIndex = 0;

  // DOM Elements (cached after load)
  let lightbox, lbContent, lbClose, lbPrev, lbNext, lbDownload, lbShare;

  async function fetchGallery(src){
    try{
      const res = await fetch(src);
      if(!res.ok) throw new Error('Failed to load ' + src);
      return await res.json();
    }catch(e){ console.error(e); return []; }
  }

  function extractYouTubeID(url){
    if(!url) return url;
    const reg = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
    const m = url.match(reg);
    return m ? m[1] : url;
  }

  function makeItemNode(item, index){
    const div = document.createElement('div');
    div.className = 'bento-item ' + (item.span === '2x2' ? 'span-2x2' : 'span-1x1');

    if(item.type === 'image'){
      const img = document.createElement('img');
      img.src = item.src;
      img.alt = item.alt || '';
      img.loading = 'lazy';
      img.style.cursor = 'zoom-in';
        // Open Lightbox on click
      img.addEventListener('click', () => openLightbox(index));
      div.appendChild(img);
    } else if(item.type === 'video'){
      const video = document.createElement('video');
      video.src = item.src;
      video.controls = false;
      video.muted = true;
      video.autoplay = true;
      video.loop = true;
      video.preload = 'metadata';
      if(item.poster) video.poster = item.poster;
      video.style.cursor = 'zoom-in';
      video.addEventListener('click', () => openLightbox(index));
      div.appendChild(video);
    } else if(item.type === 'youtube'){
      // For YouTube thumbnails in grid
      const id = extractYouTubeID(item.src);
      // Use a high-quality thumbnail as a placeholder
      const thumbUrl = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
      
      const container = document.createElement('div');
      container.className = 'relative w-full h-full cursor-pointer group';
      container.addEventListener('click', () => openLightbox(index));

      const img = document.createElement('img');
      img.src = thumbUrl;
      img.alt = item.alt || 'YouTube video';
      img.className = 'w-full h-full object-cover';
      
      // Play icon overlay
      const icon = document.createElement('div');
      icon.className = 'absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition';
      icon.innerHTML = '<i class="fas fa-play-circle text-white text-5xl opacity-80 group-hover:scale-110 transition-transform"></i>';

      container.appendChild(img);
      container.appendChild(icon);
      div.appendChild(container);
    }
    // Watermark
    const watermark = document.createElement('div');
    watermark.className = 'absolute bottom-2 right-2 font-mono text-orange-500 font-bold text-xs sm:text-sm tracking-wider z-10 pointer-events-none bg-black/80 px-3 py-1 rounded border border-orange-500/30 shadow-[0_0_10px_rgba(255,107,53,0.3)]';
    watermark.innerHTML = '&lt; Hackathon Nova 2026 /&gt;';
    
    // Ensure relative positioning for absolute child
    div.classList.add('relative');
    div.appendChild(watermark);

    return div;
  }

  // --- Lightbox Functions ---

  function openLightbox(index){
    if(index < 0 || index >= galleryItems.length) return;
    currentIndex = index;
    updateLightboxContent();
    
    lightbox.classList.remove('hidden');
    // small delay to allow display:block to apply before opacity transition
    setTimeout(() => {
        lightbox.classList.remove('opacity-0');
    }, 10);
    document.body.style.overflow = 'hidden'; // prevent background scrolling
  }

  function closeLightbox(){
    lightbox.classList.add('opacity-0');
    setTimeout(() => {
        lightbox.classList.add('hidden');
        lbContent.innerHTML = ''; // Create clean slate (stops video playback)
    }, 300);
    document.body.style.overflow = '';
  }

  function showNext(){
    if(galleryItems.length === 0) return;
    currentIndex = (currentIndex + 1) % galleryItems.length;
    updateLightboxContent();
  }

  function showPrev(){
    if(galleryItems.length === 0) return;
    currentIndex = (currentIndex - 1 + galleryItems.length) % galleryItems.length;
    updateLightboxContent();
  }

  function updateLightboxContent(){
    lbContent.innerHTML = ''; // clear previous
    const item = galleryItems[currentIndex];

    // Fade in effect for content
    const wrapper = document.createElement('div');
    wrapper.className = 'w-full h-full flex items-center justify-center animate-fade-in'; 
    
    // Container to shrink-wrap the media so watermark stays on the image
    const mediaContainer = document.createElement('div');
    mediaContainer.className = 'relative inline-block max-w-full max-h-[85vh]';

    if(item.type === 'image'){
        const img = document.createElement('img');
        img.src = item.src;
        img.alt = item.alt || '';
        img.className = 'max-w-full max-h-[85vh] object-contain shadow-2xl rounded-lg block';
        mediaContainer.appendChild(img);
    } else if(item.type === 'video'){
        const video = document.createElement('video');
        video.src = item.src;
        video.controls = true;
        video.autoplay = true;
        video.muted = true;
        video.className = 'max-w-full max-h-[85vh] shadow-2xl rounded-lg bg-black block';
        mediaContainer.appendChild(video);
    } else if(item.type === 'youtube'){
        const id = extractYouTubeID(item.src);
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.className = 'w-full max-w-4xl aspect-video shadow-2xl rounded-lg border border-gray-800 block';
        mediaContainer.appendChild(iframe);
    }

    // -- Lightbox Watermark --
    // Only for image/video types where we want the overlay
    if(item.type !== 'youtube'){ 
        const lbWatermark = document.createElement('div');
        lbWatermark.className = 'absolute bottom-4 right-4 font-mono text-orange-500 font-bold text-sm sm:text-lg tracking-wider z-20 pointer-events-none bg-black/80 px-4 py-2 rounded-lg border border-orange-500/30 shadow-[0_0_15px_rgba(255,107,53,0.4)]';
        lbWatermark.innerHTML = '&lt; Hackathon Nova 2026 /&gt;';
        mediaContainer.appendChild(lbWatermark);
    }

    wrapper.appendChild(mediaContainer);
    lbContent.appendChild(wrapper);
  }

  async function downloadCurrentItem(){
    const item = galleryItems[currentIndex];
    if(item.type === 'youtube'){
        alert('YouTube videos cannot be downloaded directly.');
        return;
    }

    const btn = document.getElementById('lb-download');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        if (item.type === 'image') {
            // -- Image Watermarking Logic (Canvas) --
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = item.src;

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');

            // Draw original image
            ctx.drawImage(img, 0, 0);

            // -- Draw Funky Watermark --
            // Responsive sizing: ~2% of image width (Reduced from 4%)
            const fontSize = Math.max(16, Math.floor(img.width * 0.02)); 
            const padding = Math.floor(img.width * 0.02);

            // Background Box
            const text = '< Hackathon Nova 2026 />';
            ctx.font = `bold ${fontSize}px "Courier New", monospace`;
            const textMetrics = ctx.measureText(text);
            const textWidth = textMetrics.width;
            const boxHeight = fontSize * 1.5; // Tighter box
            const boxPadding = fontSize * 0.4;
            
            const x = img.width - padding - textWidth - (boxPadding * 2);
            const y = img.height - padding - boxHeight;

            // Semi-transparent black bg
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'; 
            // Rounded rect hack (standard rect for simplicity)
            ctx.fillRect(x, y, textWidth + (boxPadding * 2), boxHeight);
            
            // Border (Orange)
            ctx.strokeStyle = 'rgba(255, 107, 53, 0.5)';
            ctx.lineWidth = Math.max(2, fontSize * 0.05);
            ctx.strokeRect(x, y, textWidth + (boxPadding * 2), boxHeight);

            // Text (Brand Orange)
            ctx.fillStyle = '#FF6B35'; 
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            
            // Glow effect
            ctx.shadowColor = '#FF6B35';
            ctx.shadowBlur = 10;
            
            // Slight Y adjustment for visual centering if font has odd baseline
            ctx.fillText(text, x + boxPadding, y + (boxHeight / 2) + (fontSize * 0.05));

             // Reset shadow
             ctx.shadowBlur = 0;

            // Export and Download
            canvas.toBlob((blob) => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                
                const parts = item.src.split('/');
                let filename = parts[parts.length-1].split('?')[0] || 'hackathon-nova-gallery';
                if(!filename.toLowerCase().endsWith('.jpg') && !filename.toLowerCase().endsWith('.png')) filename += '.jpg';
                
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }, 'image/jpeg', 0.95);

        } else {
             // -- Original Logic for Videos --
            const response = await fetch(item.src);
            if(!response.ok) throw new Error('Network response was not ok');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            const parts = item.src.split('/');
            let filename = parts[parts.length-1].split('?')[0] || 'gallery-video.mp4';
            
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }
    } catch (err) {
        console.error('Download failed, falling back to new tab:', err);
        window.open(item.src, '_blank');
    } finally {
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
  }

  async function shareCurrentItem(){
    const item = galleryItems[currentIndex];
    
    // Construct correct URL
    let shareUrl = item.src;
    if(!shareUrl.startsWith('http')){
        shareUrl = window.location.origin + (shareUrl.startsWith('/') ? '' : '/') + shareUrl;
    }

    const shareData = {
        title: 'Hackathon Nova Gallery',
        text: item.alt || 'Check out this moment from Hackathon Nova!',
        url: shareUrl
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            console.log('Share canceled or failed', err);
        }
    } else {
        // Fallback: Copy URL
        try {
            await navigator.clipboard.writeText(shareData.url);
            
            // Visual feedback for copy
            const btn = document.getElementById('lb-share');
            const originalContent = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> <span class="hidden sm:inline">Copied!</span>';
            setTimeout(() => {
                btn.innerHTML = originalContent;
            }, 2000);
        } catch (err) {
            alert('Could not copy link: ' + shareData.url);
        }
    }
  }

  // --- Initialization ---
  let allGalleryItems = [];

  async function render(){
    const defaultSrc = '/volunteer-qr-portal/cpanel_migration/get_gallery.php'; // Updated path
    
    const grids = document.querySelectorAll('.bento');
    if(grids.length === 0) return;

    // Fetch data from the first grid's source
    const src = grids[0].dataset.source || defaultSrc;
    allGalleryItems = await fetchGallery(src);
    galleryItems = [...allGalleryItems]; // Default set
    
    if(!Array.isArray(allGalleryItems)) return;

    populateGrids();
    setupSearch();
    initLightboxUI();
  }

  function populateGrids() {
    const grids = document.querySelectorAll('[data-day]'); // Only the specific day containers
    grids.forEach(container => {
        const limit = parseInt(container.dataset.limit) || allGalleryItems.length;
        const day = parseInt(container.dataset.day);

        let itemsToRender = allGalleryItems.filter(item => item.day === day).slice(0, limit);
        
        container.innerHTML = '';
        itemsToRender.forEach((item) => {
             // Find true index in the current global galleryItems for Lightbox
             const originalIndex = galleryItems.indexOf(item);
             const node = makeItemNode(item, originalIndex);
            container.appendChild(node);
        });
    });
  }

  function setupSearch() {
    const searchInput = document.getElementById('gallery-search');
    const searchView = document.getElementById('search-view');
    const dayViews = document.getElementById('day-views');
    const resultsContainer = document.getElementById('search-results-bento');

    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        if (query.length >= 1) {
            searchView.classList.remove('hidden');
            dayViews.classList.add('hidden');
            
            const filtered = allGalleryItems.filter(item => 
                item.src.toLowerCase().includes(query) || 
                (item.alt && item.alt.toLowerCase().includes(query))
            );
            
            // Critical for lightbox: update the reference array
            galleryItems = filtered;
            
            resultsContainer.innerHTML = '';
            if (filtered.length === 0) {
                resultsContainer.innerHTML = '<div class="col-span-full text-center py-20 text-gray-500 font-mono italic">No matching media found in database.</div>';
            } else {
                filtered.forEach((item, idx) => {
                    const node = makeItemNode(item, idx);
                    resultsContainer.appendChild(node);
                });
            }
        } else {
            searchView.classList.add('hidden');
            dayViews.classList.remove('hidden');
            galleryItems = [...allGalleryItems]; // Restore for standard lightbox
        }
    });
  }

  function initLightboxUI(){
    lightbox = document.getElementById('lightbox');
    lbContent = document.getElementById('lb-content');
    lbClose = document.getElementById('lb-close');
    lbPrev = document.getElementById('lb-prev');
    lbNext = document.getElementById('lb-next');
    lbDownload = document.getElementById('lb-download');
    lbShare = document.getElementById('lb-share');

    if(!lightbox) return;

    lbClose.addEventListener('click', closeLightbox);
    lbPrev.addEventListener('click', (e) => { e.stopPropagation(); showPrev(); });
    lbNext.addEventListener('click', (e) => { e.stopPropagation(); showNext(); });
    lbDownload.addEventListener('click', (e) => { e.stopPropagation(); downloadCurrentItem(); });
    lbShare.addEventListener('click', (e) => { e.stopPropagation(); shareCurrentItem(); });

    // Close on background click
    lightbox.addEventListener('click', (e) => {
        if(e.target === lightbox || e.target === lbContent) {
            closeLightbox();
        }
    });

    // Keyboard support
    document.addEventListener('keydown', (e) => {
        if(lightbox.classList.contains('hidden')) return;
        if(e.key === 'Escape') closeLightbox();
        if(e.key === 'ArrowLeft') showPrev();
        if(e.key === 'ArrowRight') showNext();
    });
  }

  document.addEventListener('DOMContentLoaded', render);
})();