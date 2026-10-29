<?php
require_once 'auth.php';
sicaeh_requiere_roles(['administrador', 'supervisor', 'capturista']);
ob_start();
error_reporting(E_ALL);
ini_set('display_errors', 0);
header('content-type: application/json; charset=utf-8');

try {
    require_once 'conexion.php';

    if (!isset($pdo) || !($pdo instanceof PDO)) {
        throw new Exception('conexión a base de datos no disponible');
    }

    // Verificamos permisos de rol
    $rol_usuario = $_SESSION['usuario_cargo'] ?? $_SESSION['rol'] ?? 'consulta';
    if (strtolower($rol_usuario) === 'consulta') {
        throw new Exception('acceso no autorizado para este rol.');
    }

    $id_contacto = $_GET['id'] ?? null;
    if (!$id_contacto) {
        throw new Exception('id de contacto no proporcionado.');
    }

    $pdo->beginTransaction();

    // Eliminamos el contacto de la base de datos
    $stmt = $pdo->prepare("delete from contacto where id_contacto = ?");
    $stmt->execute([$id_contacto]);

    $pdo->commit();
    ob_clean();
    echo json_encode(['success' => true, 'mensaje' => 'contacto eliminado correctamente']);

} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    ob_clean();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>