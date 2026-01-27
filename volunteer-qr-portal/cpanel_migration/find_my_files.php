<?php
// volunteer-qr-portal/cpanel_migration/find_my_files.php
header('Content-Type: text/plain');
require_once 'db_connect.php';

echo "--- FILE LOCATION FINDER ---\n\n";

// 1. Where are we?
echo "Current directory: " . getcwd() . "\n";

// 2. Identify Public Root
$potential_root = realpath(getcwd() . "/../../");
echo "Identified Public Root: $potential_root\n\n";

// 3. Look for 'gallery' folders anywhere in the root
echo "Searching for 'gallery' folders...\n";
$directory = new RecursiveDirectoryIterator($potential_root);
$iterator = new RecursiveIteratorIterator($directory);
foreach ($iterator as $file) {
    if ($file->isDir() && (strtolower($file->getFilename()) === 'gallery')) {
        echo "FOUND GALLERY FOLDER: " . $file->getPathname() . "\n";
        $files = array_diff(scandir($file->getPathname()), array('..', '.'));
        echo " - Contains " . count($files) . " files.\n";
        if (count($files) > 0) {
            echo " - Sample: " . current($files) . "\n";
        }
    }
}

echo "\n--- DB IMAGE TEST ---\n";
$sql = "SELECT src FROM gallery_items LIMIT 1";
$res = $conn->query($sql);
if ($row = $res->fetch_assoc()) {
    $db_path = $row['src'];
    echo "Database says file should be at: $db_path\n";
    
    $full_server_path = realpath($potential_root . $db_path);
    if ($full_server_path) {
        echo "SERVER CONFIRMS: File exists at $full_server_path\n";
    } else {
        echo "SERVER REJECTS: No file found at that path.\n";
        
        // Try case-insensitive search if failure
        $p = explode('/', ltrim($db_path, '/'));
        $filename = end($p);
        echo "Searching for '$filename' globally...\n";
    }
} else {
    echo "No items in database to test.\n";
}

$conn->close();
?>
