<?php
require_once 'auth.php';
header('content-type: application/json; charset=utf-8');

$autenticado = sicaeh_id_usuario() > 0;

echo json_encode([
    'exito' => $autenticado,
    'autenticado' => $autenticado
]);
exit;