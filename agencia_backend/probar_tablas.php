<?php
require 'conexion.php';

try {
    $stmt = $pdo->query("show tables");
    $tablas = $stmt->fetchall(PDO::FETCH_COLUMN);
    echo "tablas encontradas en la base de datos:<br>";
    echo "<pre>";
    print_r($tablas);
    echo "</pre>";
} catch (PDOException $e) {
    echo "error al consultar: " . $e->getMessage();
}