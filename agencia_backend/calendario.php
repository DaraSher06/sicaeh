<?php
require_once 'auth.php';
sicaeh_requiere_sesion();
ob_start();
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('content-type: application/json; charset=utf-8');

try {
    if (!file_exists('conexion.php')) {
        throw new Exception('el archivo conexion.php no existe');
    }
    
    require_once 'conexion.php';

    if (!isset($pdo) || !($pdo instanceof PDO)) {
        throw new Exception('conexión pdo no disponible');
    }

    $rol_usuario = sicaeh_cargo();
    $id_usuario_actual = sicaeh_id_usuario();
    
    $accion = $_GET['accion'] ?? '';

    if (in_array($accion, ['crear', 'editar', 'eliminar']) && $rol_usuario === 'consulta') {
        echo json_encode(['success' => false, 'mensaje' => 'acceso no autorizado.']);
        exit;
    }

    if ($accion === 'calendario') {
        $mes = isset($_GET['mes']) ? intval($_GET['mes']) : date('n');
        $anio = isset($_GET['anio']) ? intval($_GET['anio']) : date('Y');

       $sql = "select distinct v.id_expediente as id, v.id_registro, v.no_expediente_fisico, v.numero_oficio, v.numero_turno_aeeh, v.asunto, v.remitente, v.estatus_oficio as estatus, rf.fecha as fecha_evento, v.tipo_solicitud 
                from v_lista_expedientes v
                inner join turno t on v.id_registro = t.id_registro
                inner join registro_fechas rf on v.id_registro = rf.id_registro
                where t.id_usuario = :id_usuario
                  and month(rf.fecha) = :mes and year(rf.fecha) = :anio
                  and (
                        lcase(v.tipo_solicitud) like '%expo%' or
                        lcase(v.tipo_solicitud) like '%taller%' or
                        lcase(v.tipo_solicitud) like '%congreso%' or
                        lcase(v.tipo_solicitud) like '%ponencia%' or
                        lcase(v.tipo_solicitud) like '%reunion%' or
                        lcase(v.tipo_solicitud) like '%reunión%' or
                        lcase(v.tipo_solicitud) like '%feria%' or
                        lcase(v.tipo_solicitud) like '%foro%' or
                        lcase(v.tipo_solicitud) like '%capacitacion%' or
                        lcase(v.tipo_solicitud) like '%capacitación%' or
                        lcase(v.tipo_solicitud) like '%invitacion%' or
                        lcase(v.tipo_solicitud) like '%invitación%' or
                        lcase(v.tipo_solicitud) like '%congresos%'
                      )";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'id_usuario' => $id_usuario_actual,
            'mes' => $mes, 
            'anio' => $anio
        ]);
        $eventos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode($eventos);

        ob_clean();
        echo json_encode([
            "success" => true,
            "eventos" => $eventos,
            "rol_actual" => $rol_usuario
        ]);
        exit;
    }

    ob_clean();
    echo json_encode(['success' => false, 'error' => 'acción no válida']);
    exit;

} catch (Throwable $e) {
    ob_clean();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    exit;
}
?>