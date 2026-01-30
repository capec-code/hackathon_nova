<?php
// cpanel_migration/get_gallery.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Adjust for security if needed

require_once 'db_connect.php';

$sql = "SELECT * FROM gallery_items ORDER BY id ASC"; // Or explicit order column if you have one
$result = $conn->query($sql);

$galleryItems = [];

if ($result && $result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        // Convert numeric strings to numbers if needed (e.g. day)
        $row['day'] = (int)$row['day'];
        $row['is_featured'] = isset($row['is_featured']) ? (bool)$row['is_featured'] : false;
        
        // Remove null fields to keep JSON clean (optional)
        if (is_null($row['poster'])) {
            unset($row['poster']);
        }
        
        $galleryItems[] = $row;
    }
}

echo json_encode($galleryItems);

$conn->close();
?>
