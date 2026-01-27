<?php
// volunteer-qr-portal/cpanel_migration/diagnose.php
header('Content-Type: text/plain');
require_once 'db_connect.php';

echo "--- HACKATHON NOVA GALLERY DIAGNOSTIC ---\n\n";

// 1. Check Directory
$target_dir = "../../assets/gallery/";
echo "Checking directory: $target_dir\n";
if (is_dir($target_dir)) {
    echo "Directory exists: YES\n";
    $files = array_diff(scandir($target_dir), array('..', '.'));
    echo "Files found in folder: " . count($files) . "\n";
    if (count($files) > 0) {
        echo "Sample files in folder:\n";
        $sample = array_slice($files, 0, 5);
        foreach ($sample as $f) echo " - $f\n";
    }
} else {
    echo "Directory exists: NO (This is why you have 404s!)\n";
}

echo "\n--- DB CHECK ---\n";
$sql = "SELECT count(*) as total FROM gallery_items";
$res = $conn->query($sql);
$row = $res->fetch_assoc();
echo "Total items in Database: " . $row['total'] . "\n";

if ($row['total'] > 0) {
    echo "\nChecking first 5 DB entries for file existence:\n";
    $sql = "SELECT src FROM gallery_items LIMIT 5";
    $res = $conn->query($sql);
    while($row = $res->fetch_assoc()) {
        $db_path = $row['src'];
        $abs_path = "../.." . $db_path;
        $exists = file_exists($abs_path) ? "EXISTS" : "MISSING (404)";
        echo " - DB Path: $db_path -> Server Check: $exists\n";
    }
}

echo "\n--- SUGGESTION ---\n";
if (!is_dir($target_dir)) {
    echo "CRITICAL: The folder '/assets/gallery/' does not exist. Please create it in your public_html and upload your images there.";
} else {
    echo "If files are MISSING, please ensure the filenames in the database match exactly (case-sensitive) with the files you uploaded.";
}

$conn->close();
?>
