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

    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    if (!$data) {
        $data = $_POST;
    }

    $id_sector = trim($data['id_sector'] ?? '');
    $nombre_institucion = trim($data['nombre_institucion'] ?? '');
    $nombre_unidad_administrativa = trim($data['nombre_unidad_administrativa'] ?? '');
    $domicilio = trim($data['domicilio'] ?? '');
    $nombre_completo = trim($data['nombre_completo'] ?? '');
    $puesto_cargo = trim($data['puesto_cargo'] ?? '');

    if (empty($id_sector) || empty($nombre_institucion)) {
        throw new Exception('El sector y el nombre de la institución son obligatorios.');
    }

    $unidad_administrativa_valor = !empty($nombre_unidad_administrativa) ? $nombre_unidad_administrativa : '';

    $pdo->beginTransaction();

    $stmt_busca = $pdo->prepare("select id_institucion from institucion where lower(nombre_institucion) = lower(?) and id_sector = ? and lower(coalesce(nombre_unidad_administrativa, '')) = lower(?) and lower(coalesce(domicilio, '')) = lower(?)");
    $stmt_busca->execute([$nombre_institucion, $id_sector, $unidad_administrativa_valor, $domicilio]);
    $institucion_existente = $stmt_busca->fetch(PDO::FETCH_ASSOC);

    $id_institucion = null;

    if ($institucion_existente) {
        $id_institucion = $institucion_existente['id_institucion'];
    } else {
        $stmt_crea = $pdo->prepare("insert into institucion (nombre_institucion, id_sector, nombre_unidad_administrativa, domicilio) values (?, ?, ?, ?)");
        $stmt_crea->execute([
            $nombre_institucion,
            $id_sector,
            $unidad_administrativa_valor,
            !empty($domicilio) ? $domicilio : null
        ]);
        $id_institucion = $pdo->lastInsertId();
    }

    $sql_contacto = "insert into contacto (id_institucion, nombre_completo, cargo, telefono_celular, telefono_oficina, correo_institucional, correo_personal) values (?, ?, ?, ?, ?, ?, ?)";
    
    $stmt_contacto = $pdo->prepare($sql_contacto);
    $stmt_contacto->execute([
        $id_institucion,
        !empty($nombre_completo) ? $nombre_completo : '',
        !empty($puesto_cargo) ? $puesto_cargo : null,
        !empty($data['telefono_celular']) ? trim($data['telefono_celular']) : null,
        !empty($data['telefono_oficina']) ? trim($data['telefono_oficina']) : null,
        !empty($data['correo_institucional']) ? trim($data['correo_institucional']) : null,
        !empty($data['correo_personal']) ? trim($data['correo_personal']) : null
    ]);

    $pdo->commit();
    ob_clean();
    echo json_encode(['success' => true, 'mensaje' => 'Contacto guardado correctamente']);

} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    ob_clean();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>