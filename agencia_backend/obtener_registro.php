<?php
require_once 'auth.php';
sicaeh_requiere_sesion();
if (ob_get_length()) ob_clean();
header('content-type: application/json; charset=utf-8');
include 'conexion.php';

$id_registro = $_REQUEST['id_registro'] ?? $_GET['id_registro'] ?? $_REQUEST['id'] ?? null;

try {
    if (empty($id_registro)) {
        $sql_pendiente = "select id_registro from registros where id_registro not in (select id_registro from turno) order by id_registro asc limit 1";
        $stmt_p = $pdo->query($sql_pendiente);
        $pendiente = $stmt_p->fetch(PDO::FETCH_ASSOC);
        
        if ($pendiente) {
            $id_registro = $pendiente['id_registro'];
        } else {
            echo json_encode(['success' => false, 'exito' => false, 'error' => 'no hay registros pendientes por turnar.']);
            exit;
        }
    }

    $sql = "select id_registro, num_consecutivo, fecha_captura, id_tipo_sol, documento_adjunto, nombre_original from registros where id_registro = :id_registro";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['id_registro' => $id_registro]);
    $registro = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($registro) {
        $rutadb = $registro['documento_adjunto'] ?? '';
        $nombrearchivo = !empty($registro['nombre_original']) ? $registro['nombre_original'] : ($rutadb ? basename($rutadb) : 'sin archivo adjunto');

        $rutalimpia = '';
        if (!empty($rutadb)) {
            $nombre_archivo_fisico = basename($rutadb);
            $rutalimpia = '../uploads/' . $nombre_archivo_fisico;
        }

        // catálogo de tipos de solicitud
        $sql_tipos = "select id_tipo_sol, nombre_tipo from tipo_solicitud";
        $stmt_tipos = $pdo->query($sql_tipos);
        $tipos_solicitud = $stmt_tipos->fetchAll(PDO::FETCH_ASSOC);

        // consulta corregida usando apellido_paterno y apellido_materno
        $sql_usuarios = "select id_usuario, concat(nombre, ' ', apellido_paterno, ' ', coalesce(apellido_materno, '')) as nombre from usuario";
        $stmt_usuarios = $pdo->query($sql_usuarios);
        $usuarios = $stmt_usuarios->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'exito' => true,
            'data' => [
                'id_registro' => $registro['id_registro'],
                'id_turno' => $registro['id_registro'],
                'num_consecutivo' => $registro['num_consecutivo'],
                'fecha_captura' => $registro['fecha_captura'],
                'id_tipo_sol' => $registro['id_tipo_sol'],
                'tipos_solicitud' => $tipos_solicitud,
                'usuarios' => $usuarios,
                'nombre_archivo' => $nombrearchivo,
                'documento_adjunto' => $rutalimpia,
                'ruta_archivo' => $rutalimpia
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'exito' => false, 'error' => 'registro no encontrado.']);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'exito' => false, 'error' => $e->getMessage()]);
}
?>