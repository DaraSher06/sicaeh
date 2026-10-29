<?php
require_once 'auth.php';
sicaeh_requiere_sesion();
if (ob_get_length()) ob_clean();
header('content-type: application/json; charset=utf-8');
include 'conexion.php';

$id_usuario_actual = sicaeh_id_usuario();

try {
    $sql = "select estatus_sla, count(*) as total 
            from v_lista_seguimiento 
            where id_usuario_asignado = :id_usuario 
            group by estatus_sla";
            
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['id_usuario' => $id_usuario_actual]);
    $alertas = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $resumen_sla = [
        'a tiempo' => 0, 
        'por vencer' => 0, 
        'vencido' => 0, 
        'cumplido' => 0
    ];

    foreach ($alertas as $row) {
        if (isset($resumen_sla[$row['estatus_sla']])) {
            $resumen_sla[$row['estatus_sla']] = (int)$row['total'];
        }
    }

    ob_clean();
    echo json_encode([
        'success' => true,
        'alertas' => $resumen_sla
    ]);
} catch (pdoexception $e) {
    ob_clean();
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>