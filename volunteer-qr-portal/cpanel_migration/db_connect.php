<?php
// cpanel_migration/db_connect.php

$servername = "localhost";
$username = "hackathonnova_sajan";
$password = "Sajan123@";
$dbname = "hackathonnova_gallary";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    throw new Exception("Database connection failed. Please contact administrator.");
}

// Set charset to utf8mb4
$conn->set_charset("utf8mb4");
?>
