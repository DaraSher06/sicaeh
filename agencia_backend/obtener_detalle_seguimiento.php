<?php
require_once 'auth.php';
sicaeh_requiere_sesion();
ob_start();
error_reporting(E_ALL);
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
        echo json_encode(['success' => false, 'error' => 'id no proporcionado']);
        exit;
    }

    $sql = "select 
                r.id_registro,
                r.num_consecutivo,
                r.fecha_captura,
                u.nombre as usuario_asignado,
                r.id_tipo_sol,
                r.correo_remitente,
                s.beneficiarios_directos,
                s.beneficiarios_indirectos,
                s.se_envia_siga,
                s.num_expediente_fisico,
                s.num_gestion_siga,
                s.num_oficio_respuesta,
                et.tipo_entidad as turnar_a_entidad,
                et.especificacion as especificacion,
                s.observaciones,
                s.entidad_dio_respuesta,
                s.oficio_respuesta_entidad,
                s.observaciones_entidad,
                e.nombre_est as estatus_oficio,
                r.documento_adjunto,
                r.nombre_original
            from registros r
            left join turno t on r.id_registro = t.id_registro
            left join usuario u on t.id_usuario = u.id_usuario
            left join seguimiento s on r.id_registro = s.id_registro
            left join etapa e on s.id_etapa = e.id_etapa
            left join entidad_turno et on et.id_registro = r.id_registro
            where r.id_registro = :id
            limit 1";

    $stmt = $pdo->prepare($sql);
    $stmt->execute(['id' => $id]);
    $detalle = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$detalle) {
        ob_clean();
        echo json_encode(['success' => false, 'error' => 'registro no encontrado']);
        exit;
    }

    $docs_stmt = $pdo->prepare("select nombre_documento, ruta_documento from documentos where id_registro = :id and activo = 1");
    $docs_stmt->execute(['id' => $id]);
    $docs = $docs_stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!empty($detalle['documento_adjunto'])) {
        array_unshift($docs, [
            'nombre_documento' => $detalle['nombre_original'] ?: 'documento_inicial.pdf',
            'ruta_documento' => $detalle['documento_adjunto']
        ]);
    }
    $detalle['documentos'] = $docs;

    $tipos_stmt = $pdo->query("select id_tipo_sol, nombre_tipo from tipo_solicitud");
    $tipos_solicitud = $tipos_stmt->fetchAll(PDO::FETCH_ASSOC);

    ob_clean();
    echo json_encode([
        'success' => true,
        'detalle' => $detalle,
        'tipos_solicitud' => $tipos_solicitud
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    ob_clean();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}