<?php
// cpanel_migration/db_connect.php

$servername = "localhost";
$username = "hackathonnova_sajan";
$password = "\$arthak1701"; // Escaped $ for PHP string
$dbname = "hackathonnova_gallary";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    // In production, you might not want to echo the exact error to the public
    die("Connection failed: " . $conn->connect_error);
}

// Set charset to utf8mb4
$conn->set_charset("utf8mb4");
?>
