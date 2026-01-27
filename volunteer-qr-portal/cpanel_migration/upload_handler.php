<?php
// cpanel_migration/upload_handler.php
// Enable output buffering to prevent headers/whitespace leakage
ob_start();

require_once 'db_connect.php';

// Simple API Key security
$SECRET_KEY = "nova_admin_2026";
$api_key = $_POST['api_key'] ?? '';

if ($api_key !== $SECRET_KEY) {
    ob_end_clean();
    die(json_encode(["success" => false, "error" => "Unauthorized"]));
}

try {


$action = $_POST['action'] ?? 'upload';

if ($action === 'upload') {
    $day = (int)($_POST['day'] ?? 1);
    $type = $_POST['type'] ?? 'image';
    $span = $_POST['span'] ?? '1x1';
    $alt = $_POST['alt'] ?? '';

    if (!isset($_FILES['file'])) {
        die(json_encode(["success" => false, "error" => "No file uploaded"]));
    }

    $errors = [];
    $uploaded_files = [];

    // Handle multiple or single file
    $files = $_FILES['file'];
    $file_count = is_array($files['name']) ? count($files['name']) : 1;

    for ($i = 0; $i < $file_count; $i++) {
        $name = is_array($files['name']) ? $files['name'][$i] : $files['name'];
        $tmp_name = is_array($files['tmp_name']) ? $files['tmp_name'][$i] : $files['tmp_name'];
        
        $target_dir = "../../assets/gallery/";
        $target_file = $target_dir . basename($name);
        $db_path = "/assets/gallery/" . basename($name);

        if (move_uploaded_file($tmp_name, $target_file)) {
            // DB Insert
            $stmt = $conn->prepare("INSERT INTO gallery_items (type, src, alt, span, day) VALUES (?, ?, ?, ?, ?)");
            $stmt->bind_param("ssssi", $type, $db_path, $alt, $span, $day);
            
            if ($stmt->execute()) {
                $uploaded_files[] = $name;
            } else {
                $errors[] = "DB Error for $name: " . $conn->error;
            }
            $stmt->close();
        } else {
            $errors[] = "Failed to move $name";
        }
    }

    echo json_encode([
        "success" => empty($errors),
        "uploaded" => $uploaded_files,
        "errors" => $errors
    ]);

} elseif ($action === 'delete') {
    $id = (int)$_POST['id'];
    // 1. Get file path to delete from disk
    $stmt = $conn->prepare("SELECT src FROM gallery_items WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($row = $result->fetch_assoc()) {
        $file_path = ".." . $row['src'];
        if (file_exists($file_path)) {
            unlink($file_path);
        }
    }
    $stmt->close();

    // 2. Delete from DB
    $stmt = $conn->prepare("DELETE FROM gallery_items WHERE id = ?");
    $stmt->bind_param("i", $id);
    if ($stmt->execute()) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["success" => false, "error" => $conn->error]);
    }
    $stmt->close();
} elseif ($action === 'update_day') {
    $ids = $_POST['ids'] ?? []; // Array of IDs
    $new_day = (int)($_POST['day'] ?? 1);

    if (empty($ids)) {
        die(json_encode(["success" => false, "error" => "No items selected"]));
    }

    $id_list = implode(',', array_map('intval', $ids));
    $sql = "UPDATE gallery_items SET day = $new_day WHERE id IN ($id_list)";
    
    if ($conn->query($sql)) {
        echo json_encode(["success" => true, "updated_count" => $conn->affected_rows]);
    } else {
        echo json_encode(["success" => false, "error" => $conn->error]);
    }
} elseif ($action === 'delete_bulk') {
    $ids = $_POST['ids'] ?? [];

    if (empty($ids)) {
        die(json_encode(["success" => false, "error" => "No items selected"]));
    }

    $id_list = implode(',', array_map('intval', $ids));
    
    // 1. Get files to delete from disk
    $sql = "SELECT src FROM gallery_items WHERE id IN ($id_list)";
    $result = $conn->query($sql);
    while ($row = $result->fetch_assoc()) {
        $file_path = "../../" . ltrim($row['src'], '/');
        if (file_exists($file_path)) {
            unlink($file_path);
        }
    }

    // 2. Delete from DB
    $sql = "DELETE FROM gallery_items WHERE id IN ($id_list)";
    if ($conn->query($sql)) {
        echo json_encode(["success" => true, "deleted_count" => $conn->affected_rows]);
    } else {
        echo json_encode(["success" => false, "error" => $conn->error]);
    }
} else {
    throw new Error("Invalid action provided.");
}

} catch (Throwable $e) {
    // Catch everything and return as JSON
    ob_end_clean();
    header('Content-Type: application/json');
    echo json_encode([
        "success" => false, 
        "error" => $e->getMessage(),
        "php_info" => [
            "upload_max" => ini_get('upload_max_filesize'),
            "post_max" => ini_get('post_max_size'),
            "memory_limit" => ini_get('memory_limit')
        ]
    ]);
    exit;
}

// Final output
$final_output = ob_get_clean();
header('Content-Type: application/json');
if (empty($final_output)) {
    // This shouldn't happen if logic above echoed something
    echo json_encode(["success" => false, "error" => "No response generated"]);
} else {
    echo $final_output;
}

$conn->close();
?>
