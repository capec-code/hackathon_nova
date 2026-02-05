<?php
// volunteer-qr-portal/cpanel_migration/thumbnail.php
// Performance optimization: Generates and caches thumbnails for gallery images.

// 1. Basic configuration
$thumbnail_dir = "../../assets/gallery/thumbnails/";
$gallery_dir = "../../assets/gallery/";

// 2. Get parameters
$src = isset($_GET['src']) ? $_GET['src'] : '';
$width = isset($_GET['w']) ? (int)$_GET['w'] : 400;

if (empty($src)) {
    header("HTTP/1.1 400 Bad Request");
    die("Source missing");
}

// Clean the src path (remove leading slash if present for file checks)
$clean_src = ltrim($src, '/');
// If src starts with 'assets/gallery/', strip it to get the filename
$filename = basename($clean_src);
$source_path = $gallery_dir . $filename;

if (!file_exists($source_path) || is_dir($source_path)) {
    header("HTTP/1.1 404 Not Found");
    die("File not found: " . $source_path);
}

// 3. Create thumbnails directory if it doesn't exist
if (!is_dir($thumbnail_dir)) {
    mkdir($thumbnail_dir, 0755, true);
}

// 4. Generate cache filename
$cache_filename = $width . "_" . $filename;
$cache_path = $thumbnail_dir . $cache_filename;

// 5. Serve from cache if it exists and is newer than source
if (file_exists($cache_path) && filemtime($cache_path) > filemtime($source_path)) {
    serve_image($cache_path);
    exit;
}

// 6. Generate thumbnail using GD
$info = getimagesize($source_path);
if (!$info) {
    // If not an image (e.g. video), we can't resize it this way. 
    // For videos, we should ideally have a poster, but for now, just redirect to source if requested as image.
    header("Location: " . $src);
    exit;
}

$mime = $info['mime'];
$orig_w = $info[0];
$orig_h = $info[1];

// Calculate height to maintain aspect ratio
$height = floor($orig_h * ($width / $orig_w));

// Load source image
switch ($mime) {
    case 'image/jpeg': $src_img = imagecreatefromjpeg($source_path); break;
    case 'image/png':  $src_img = imagecreatefrompng($source_path); break;
    case 'image/webp': $src_img = imagecreatefromwebp($source_path); break;
    case 'image/gif':  $src_img = imagecreatefromgif($source_path); break;
    default:
        // Unsupported format for resizing, serve original
        serve_image($source_path);
        exit;
}

// Create blank truecolor image
$dst_img = imagecreatetruecolor($width, $height);

// Handle transparency for PNG/WebP
if ($mime == 'image/png' || $mime == 'image/webp') {
    imagealphablending($dst_img, false);
    imagesavealpha($dst_img, true);
}

// Resize
imagecopyresampled($dst_img, $src_img, 0, 0, 0, 0, $width, $height, $orig_w, $orig_h);

// Save to cache
switch ($mime) {
    case 'image/jpeg': imagejpeg($dst_img, $cache_path, 80); break;
    case 'image/png':  imagepng($dst_img, $cache_path); break;
    case 'image/webp': imagewebp($dst_img, $cache_path, 80); break;
    case 'image/gif':  imagegif($dst_img, $cache_path); break;
}

// Clean up
imagedestroy($src_img);
imagedestroy($dst_img);

// Serve the newly created thumbnail
serve_image($cache_path);

function serve_image($path) {
    $info = getimagesize($path);
    header("Content-Type: " . $info['mime']);
    header("Content-Length: " . filesize($path));
    // Cache for 30 days in browser
    header("Cache-Control: public, max-age=2592000");
    readfile($path);
}
?>
