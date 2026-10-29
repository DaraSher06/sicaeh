<?php
require_once 'auth.php';
sicaeh_requiere_sesion();
ob_start();
error_reporting(0);
ini_set('display_errors', 0);
header('content-type: application/json; charset=utf-8');

try {
    require_once 'conexion.php';
    if (!isset($pdo) || !($pdo instanceof PDO)) {
        throw new Exception('conexión a base de datos no disponible');
    }

    $id = $_GET['id'] ?? null;
    if (!$id) {
        ob_clean();
        echo json_encode(array('success' => false, 'mensaje' => 'id no proporcionado'));
        exit;
    }

    $sql = "select 
                ex.id_expediente,
                ex.no_expediente_fisico,
                ex.fecha_apertura,
                r.id_registro,
                r.num_consecutivo,
                r.asunto,
                r.nom_remitente as remitente,
                r.documento_adjunto,
                r.nombre_original,
                r.fecha_captura,
                t.id_usuario,
                concat(u.nombre, ' ', u.apellido_paterno) as usuario_asignado
            from expediente ex
            join registros r on ex.id_registro = r.id_registro
            left join turno t on t.id_registro = r.id_registro
            left join usuario u on u.id_usuario = t.id_usuario
            where ex.id_expediente = :id or r.id_registro = :id
            limit 1";

    $stmt = $pdo->prepare($sql);
    $stmt->execute(array('id' => $id));
    $expediente = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$expediente) {
        ob_clean();
        echo json_encode(array('success' => false, 'mensaje' => 'expediente no encontrado'));
        exit;
    }

    // Si el registro cuenta con un documento principal adjunto, aseguramos que exista en la tabla documentos
    if (!empty($expediente['documento_adjunto'])) {
        $check_doc = $pdo->prepare("select count(*) from documentos where (id_expediente = :id_exp or id_registro = :id_reg) and ruta_documento = :ruta");
        $check_doc->execute(array(
            'id_exp' => $expediente['id_expediente'], 
            'id_reg' => $expediente['id_registro'], 
            'ruta' => $expediente['documento_adjunto']
        ));
        
        if ($check_doc->fetchColumn() == 0) {
            $insert_doc = $pdo->prepare("insert into documentos (id_expediente, id_registro, nombre_documento, tipo_documento, ruta_documento, fecha_subida, id_usuario, version, activo) values (:id_exp, :id_reg, :nombre, 'pdf', :ruta, :fecha, :user, 1, 1)");
            $insert_doc->execute(array(
                'id_exp' => $expediente['id_expediente'],
                'id_reg' => $expediente['id_registro'],
                'nombre' => $expediente['nombre_original'] ?: 'documento_principal.pdf',
                'ruta' => $expediente['documento_adjunto'],
                'fecha' => ($expediente['fecha_captura'] ? $expediente['fecha_captura'] : date('Y-m-d H:i:s')),
                'user' => $expediente['id_usuario'] ?: 1
            ));
        }
    }

    // Buscamos todos los documentos asociados por id_expediente o por el id_registro correspondiente
    $docs_stmt = $pdo->prepare("select d.nombre_documento, d.ruta_documento, d.fecha_subida, concat(u.nombre, ' ', u.apellido_paterno) as subido_por 
                                from documentos d 
                                left join usuario u on d.id_usuario = u.id_usuario 
                                where (d.id_expediente = :id_exp or d.id_registro = :id_reg) and d.activo = 1");
    $docs_stmt->execute(array('id_exp' => $expediente['id_expediente'], 'id_reg' => $expediente['id_registro']));
    $documentos = $docs_stmt->fetchAll(PDO::FETCH_ASSOC);

    ob_clean();
    echo json_encode(array(
        'success' => true,
        'expediente' => $expediente,
        'documentos' => $documentos
    ));
} catch (Throwable $e) {
    ob_clean();
    echo json_encode(array('success' => false, 'mensaje' => $e->getMessage()));
}
?>