<?php
require_once 'auth.php';
sicaeh_requiere_roles(['administrador', 'supervisor']);
if (ob_get_length()) ob_clean();
header('content-type: application/json; charset=utf-8');

include 'conexion.php';

$accion = $_GET['accion'] ?? '';

try {
    switch ($accion) {
        case 'listar':
            $stmt = $pdo->query("select id_usuario, nombre_usuario, correo, cargo, cargo_real, ultima_actividad from usuario order by id_usuario desc");
            $datos = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $datos]);
            break;

        case 'obtener':
            $id_usuario = $_GET['id_usuario'] ?? 0;
            $stmt = $pdo->prepare("select id_usuario, nombre, apellido_paterno, apellido_materno, telefono, correo, nombre_usuario, cargo, cargo_real, activo from usuario where id_usuario = ?");
            $stmt->execute([$id_usuario]);
            $usuario = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($usuario) {
                echo json_encode(['success' => true, 'data' => $usuario]);
            } else {
                echo json_encode(['success' => false, 'error' => 'Usuario no encontrado']);
            }
            break;

        case 'actualizar':
            $id_usuario = $_POST['id_usuario'] ?? 0;
            $nombre = $_POST['nombre'] ?? '';
            $apellido_paterno = $_POST['apellido_paterno'] ?? '';
            $apellido_materno = $_POST['apellido_materno'] ?? '';
            $telefono = $_POST['telefono'] ?? '';
            $correo = $_POST['correo'] ?? '';
            $nombre_usuario = $_POST['nombre_usuario'] ?? '';
            $cargo = $_POST['cargo'] ?? '';
            $cargo_real = $_POST['cargo_real'] ?? '';
            $activo = isset($_POST['activo']) ? 1 : 0;

            if ($id_usuario > 0) {
                $stmt = $pdo->prepare("update usuario set nombre = ?, apellido_paterno = ?, apellido_materno = ?, telefono = ?, correo = ?, nombre_usuario = ?, cargo = ?, cargo_real = ?, activo = ? where id_usuario = ?");
                $stmt->execute([$nombre, $apellido_paterno, $apellido_materno, $telefono, $correo, $nombre_usuario, $cargo, $cargo_real, $activo, $id_usuario]);
                echo json_encode(['success' => true, 'mensaje' => 'Usuario actualizado correctamente']);
            } else {
                echo json_encode(['success' => false, 'error' => 'id de usuario inválido']);
            }
            break;

        case 'eliminar':
            $id_usuario = $_POST['id_usuario'] ?? 0;
            if ($id_usuario > 0) {
                $stmt = $pdo->prepare("delete from usuario where id_usuario = ?");
                $stmt->execute([$id_usuario]);
                echo json_encode(['success' => true, 'mensaje' => 'Usuario eliminado correctamente']);
            } else {
                echo json_encode(['success' => false, 'error' => 'id de usuario inválido']);
            }
            break;

        default:
            echo json_encode(['success' => false, 'error' => 'acción no válida']);
            break;
    }

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>