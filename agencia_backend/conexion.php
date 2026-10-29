<?php
require __DIR__ . '/vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->safeLoad();

$servidor = $_ENV['DB_HOST'] ?? 'localhost';
$usuario = $_ENV['DB_USER'] ?? 'root';
$password = $_ENV['DB_PASS'] ?? '';
$base_datos = $_ENV['DB_NAME'] ?? 'agencia_estatal';

try {
    $pdo = new PDO("mysql:host=$servidor;dbname=$base_datos;charset=utf8mb4", $usuario, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
} catch (PDOException $e) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'exito' => false, 
        'success' => false, 
        'error' => 'Error de conexión: ' . $e->getMessage()
    ]);
    exit();
}