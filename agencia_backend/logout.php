<?php
session_start();
session_unset();
session_destroy();

header('content-type: application/json; charset=utf-8');
echo json_encode(['success' => true, 'mensaje' => 'sesión cerrada correctamente']);
exit();
?>