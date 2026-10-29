<?php
require_once 'auth.php';
sicaeh_requiere_roles(['administrador', 'supervisor']);
header('content-type: application/json; charset=utf-8');
require_once 'conexion.php';

try {
    $raw_input = file_get_contents('php://input');
    $data = json_decode($raw_input, true);

    if (!$data) {
        throw new Exception('datos no válidos o vacíos.');
    }

    $nombre = trim($data['nombre'] ?? '');
    $apellido_paterno = trim($data['apellido_paterno'] ?? '');
    $apellido_materno = trim($data['apellido_materno'] ?? '');
    $telefono = trim($data['telefono'] ?? '');
    $correo = trim($data['correo'] ?? '');
    $nombre_usuario = trim($data['nombre_usuario'] ?? '');
    $cargo = sicaeh_normalizar_cargo($data['nivel_acceso'] ?? $data['cargo'] ?? 'consulta');
    $cargo_real = trim($data['cargo_real'] ?? '');
    $password = $data['password'] ?? '';
    $activo = isset($data['estado_cuenta']) ? intval($data['estado_cuenta']) : 1;

    if (empty($nombre) || empty($apellido_paterno) || empty($correo) || empty($nombre_usuario) || empty($password)) {
        throw new Exception('faltan campos obligatorios.');
    }

    $hash_contrasena = password_hash($password, PASSWORD_DEFAULT);

    $sql = 'insert into usuario (nombre, apellido_paterno, apellido_materno, nombre_usuario, contrasena, telefono, correo, cargo, cargo_real, activo) values (:nombre, :apellido_paterno, :apellido_materno, :nombre_usuario, :contrasena, :telefono, :correo, :cargo, :cargo_real, :activo)';

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':nombre' => $nombre,
        ':apellido_paterno' => $apellido_paterno,
        ':apellido_materno' => $apellido_materno,
        ':nombre_usuario' => $nombre_usuario,
        ':contrasena' => $hash_contrasena,
        ':telefono' => $telefono,
        ':correo' => $correo,
        ':cargo' => $cargo,
        ':cargo_real' => $cargo_real,
        ':activo' => $activo
    ]);

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
