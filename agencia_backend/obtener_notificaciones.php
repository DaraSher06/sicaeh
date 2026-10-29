<?php
require_once 'auth.php';
sicaeh_requiere_sesion();
if (ob_get_length()) ob_clean();
header('content-type: application/json; charset=utf-8');
include 'conexion.php';

$id_usuario_actual = sicaeh_id_usuario();

if (!isset($_SESSION['alertas_mostradas']) || !is_array($_SESSION['alertas_mostradas'])) {
    $_SESSION['alertas_mostradas'] = [];
}

try {
    $sql = "select 
                id_registro, 
                num_consecutivo, 
                asunto, 
                estatus_sla, 
                fecha_limite,
                estatus_oficio 
            from v_lista_seguimiento 
            where id_usuario_asignado = :id_usuario
            order by fecha_limite asc 
            limit 30";

    $stmt = $pdo->prepare($sql);
    $stmt->execute(['id_usuario' => $id_usuario_actual]);
    $registros = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $notificaciones = [];
    $alertas_urgentes = [];

    foreach ($registros as $reg) {
        $estatus_sla = strtolower(trim($reg['estatus_sla'] ?? ''));
        $estatus_oficio = strtolower(trim($reg['estatus_oficio'] ?? ''));

        if ($estatus_sla === 'cumplido') continue;
        if ($estatus_oficio === 'atendido' || $estatus_oficio === 'cerrado') continue;

        $titulo = "aviso de trámite";
        if ($estatus_sla === 'vencido') {
            $titulo = "trámite vencido";
        } elseif ($estatus_sla === 'por vencer') {
            $titulo = "próximo a vencer";
        } elseif ($estatus_sla === 'a tiempo') {
            $titulo = "nueva asignación";
        }

        $notificacion_item = [
            'id_registro' => $reg['id_registro'],
            'titulo' => $titulo,
            'estatus_sla' => $reg['estatus_sla'],
            'mensaje' => "[{$reg['num_consecutivo']}] " . mb_substr($reg['asunto'], 0, 50) . "... (vence: {$reg['fecha_limite']})"
        ];

        $notificaciones[] = $notificacion_item;

        // ahora incluimos vencido, por vencer y nueva asignación (a tiempo) para el popup emergente
        if (in_array($estatus_sla, ['vencido', 'por vencer', 'a tiempo'])) {
            if (!in_array($reg['id_registro'], $_SESSION['alertas_mostradas'])) {
                $alertas_urgentes[] = $notificacion_item;   
            }
        }
    }

    ob_clean();
    echo json_encode([
        'success' => true,
        'notificaciones' => $notificaciones,
        'alertas_urgentes' => $alertas_urgentes
    ]);
} catch (pdoexception $e) {
    ob_clean();
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>