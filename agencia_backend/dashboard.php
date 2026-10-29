<?php
require_once 'auth.php';
sicaeh_requiere_sesion();

header('content-type: application/json; charset=utf-8');
echo json_encode([
    'success' => true,
    'nombre' => $_SESSION['usuario_nombre'] ?? 'Usuario',
    'cargo' => sicaeh_cargo()
]);
