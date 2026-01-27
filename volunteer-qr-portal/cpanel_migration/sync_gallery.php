<?php
// volunteer-qr-portal/cpanel_migration/sync_gallery.php
header('Content-Type: application/json');
require_once 'db_connect.php';

// Security check (same key as upload)
$SECRET_KEY = "nova_admin_2026";
if ($_GET['api_key'] !== $SECRET_KEY) {
    die(json_encode(["success" => false, "error" => "Unauthorized"]));
}

$sql = "SELECT id, src FROM gallery_items";
$result = $conn->query($sql);

$deleted_count = 0;
$missing_files = [];

if ($result && $result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $id = $row['id'];
        $src = $row['src'];
        
        // Path logic: src is /assets/gallery/file.jpg
        // From this folder (cpanel_migration), it's ../..$src
        $file_path = "../.." . $src;
        
        if (!file_exists($file_path)) {
            // File is missing, drop from DB
            $del_sql = "DELETE FROM gallery_items WHERE id = $id";
            if ($conn->query($del_sql)) {
                $deleted_count++;
                $missing_files[] = $src;
            }
        }
    }
}

echo json_encode([
    "success" => true,
    "removed_entries" => $deleted_count,
    "details" => $missing_files,
    "message" => "Sync complete. Removed $deleted_count broken database entries."
]);

$conn->close();
?>
