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

    $id_contacto = $data['id_contacto'] ?? null;
    if (empty($id_contacto)) {
        throw new Exception('el id del contacto es obligatorio.');
    }

    $nombre_completo = trim($data['nombre_completo'] ?? '');
    $puesto_cargo = trim($data['puesto_cargo'] ?? ($data['cargo'] ?? ''));
    $nombre_institucion = trim($data['nombre_institucion'] ?? '');
    $unidad_administrativa = trim($data['nombre_unidad_administrativa'] ?? '');
    $domicilio = trim($data['domicilio'] ?? '');

    $nombre_completo_valor = !empty($nombre_completo) ? $nombre_completo : '';
    $puesto_cargo_valor = !empty($puesto_cargo) ? $puesto_cargo : null;
    $domicilio_valor = !empty($domicilio) ? $domicilio : null;
    $unidad_administrativa_valor = !empty($unidad_administrativa) ? $unidad_administrativa : '';

    $pdo->beginTransaction();

    $stmt_info = $pdo->prepare("select c.id_institucion, i.id_sector from contacto c inner join institucion i on c.id_institucion = i.id_institucion where c.id_contacto = ?");
    $stmt_info->execute([$id_contacto]);
    $contacto_actual = $stmt_info->fetch(PDO::FETCH_ASSOC);

    if (!$contacto_actual) {
        throw new Exception('contacto no encontrado.');
    }

    $id_institucion_actual = $contacto_actual['id_institucion'];
    $id_sector = $contacto_actual['id_sector'];
    $id_institucion_final = $id_institucion_actual;

    $stmt_busca = $pdo->prepare("select id_institucion from institucion where lower(nombre_institucion) = lower(?) and id_sector = ? and lower(coalesce(nombre_unidad_administrativa, '')) = lower(?) and lower(coalesce(domicilio, '')) = lower(?)");
    $stmt_busca->execute([$nombre_institucion, $id_sector, $unidad_administrativa_valor, $domicilio_valor]);
    $encontrada = $stmt_busca->fetch(PDO::FETCH_ASSOC);

    if ($encontrada) {
        $id_institucion_final = $encontrada['id_institucion'];
    } else {
        $stmt_conteo = $pdo->prepare("select count(*) as total from contacto where id_institucion = ?");
        $stmt_conteo->execute([$id_institucion_actual]);
        $conteo = $stmt_conteo->fetch(PDO::FETCH_ASSOC);

        if ($conteo['total'] <= 1) {
            $stmt_upd = $pdo->prepare("update institucion set nombre_institucion = ?, nombre_unidad_administrativa = ?, domicilio = ? where id_institucion = ?");
            $stmt_upd->execute([$nombre_institucion, $unidad_administrativa_valor, $domicilio_valor, $id_institucion_actual]);
            $id_institucion_final = $id_institucion_actual;
        } else {
            $stmt_crea = $pdo->prepare("insert into institucion (nombre_institucion, id_sector, nombre_unidad_administrativa, domicilio) values (?, ?, ?, ?)");
            $stmt_crea->execute([$nombre_institucion, $id_sector, $unidad_administrativa_valor, $domicilio_valor]);
            $id_institucion_final = $pdo->lastInsertId();
        }
    }

    $sql_contacto = "update contacto set id_institucion = ?, nombre_completo = ?, cargo = ?, telefono_celular = ?, telefono_oficina = ?, correo_institucional = ?, correo_personal = ? where id_contacto = ?";
    $stmt_c = $pdo->prepare($sql_contacto);
    $stmt_c->execute([
        $id_institucion_final,
        $nombre_completo_valor,
        $puesto_cargo_valor,
        !empty($data['telefono_celular']) ? trim($data['telefono_celular']) : null,
        !empty($data['telefono_oficina']) ? trim($data['telefono_oficina']) : null,
        !empty($data['correo_institucional']) ? trim($data['correo_institucional']) : null,
        !empty($data['correo_personal']) ? trim($data['correo_personal']) : null,
        $id_contacto
    ]);

    $pdo->commit();
    ob_clean();
    echo json_encode(['success' => true, 'mensaje' => 'contacto actualizado correctamente']);

} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    ob_clean();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>