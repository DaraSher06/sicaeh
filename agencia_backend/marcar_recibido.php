<?php
require_once 'auth.php';
sicaeh_requiere_sesion();

if (session_status() === PHP_SESSION_ACTIVE) {
    session_write_close();
}

header('content-type: application/json; charset=utf-8');
require_once 'conexion.php'; 

try {
    $idreg = $_POST['id_registro'] ?? null;
    if (!$idreg) {
        $raw = file_get_contents('php://input');
        parse_str($raw, $parsed);
        $idreg = $parsed['id_registro'] ?? null;
    }

    if (!$idreg) {
        echo json_encode(['success' => false, 'error' => 'id no válido']);
        exit;
    }

    $chk = $pdo->prepare("select id_seguimiento from seguimiento where id_registro = :id limit 1");
    $chk->execute(['id' => $idreg]);
    $existe = $chk->fetch();

    if ($existe) {
        $sql = "update seguimiento set 
                    recibido = 1, 
                    fecha_recibido = curdate(), 
                    id_etapa = (select id_etapa from etapa where lower(nombre_est) like '%proceso%' limit 1)
                where id_registro = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['id' => $idreg]);
    } else {
        $sql = "insert into seguimiento (id_registro, recibido, fecha_recibido, id_etapa, id_tipo_sol) 
                values (
                    :id1, 
                    1, 
                    curdate(), 
                    (select id_etapa from etapa where lower(nombre_est) like '%proceso%' limit 1),
                    (select id_tipo_sol from registros where id_registro = :id2 limit 1)
                )";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['id1' => $idreg, 'id2' => $idreg]);
    }

    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
exit;