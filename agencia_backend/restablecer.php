<?php

require 'conexion.php';

header('content-type: application/json');

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $datos = json_decode(file_get_contents('php://input'), true);
    $token = trim($datos['token'] ?? '');
    $nuevapassword = trim($datos['nueva_password'] ?? '');

    if (empty($token) || empty($nuevapassword)) {
        echo json_encode(["estado" => "error", "mensaje" => "Datos incompletos."]);
        exit();
    }

    try {
        $stmt = $pdo->prepare("select id_usuario from usuario where token_recuperacion = ? and expiracion_token >= now()");
        $stmt->execute([$token]);
        $usuario = $stmt->fetch();

        if ($usuario) {
            $id_usuario = $usuario['id_usuario'];
            $passwordhash = password_hash($nuevapassword, PASSWORD_DEFAULT);

            $stmt_update = $pdo->prepare("update usuario set contrasena = ?, token_recuperacion = null, expiracion_token = null where id_usuario = ?");
            $stmt_update->execute([$passwordhash, $id_usuario]);

            echo json_encode(["estado" => "exito", "mensaje" => "Contraseña actualizada con éxito. Redirigiendo al login..."]);
        } else {
            echo json_encode(["estado" => "error", "mensaje" => "El token es inválido o ya ha expirado."]);
        }
    } catch (PDOException $e) {
        echo json_encode(["estado" => "error", "mensaje" => "Error en base de datos: " . $e->getMessage()]);
    }
}
?>