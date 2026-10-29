<?php

require 'conexion.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

header('content-type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $datos = json_decode(file_get_contents('php://input'), true);
    $correo = trim($datos['correo'] ?? '');

    if (empty($correo)) {
        echo json_encode(["estado" => "error", "mensaje" => "Por favor ingresa un correo."]);
        exit();
    }

    try {
        $stmt = $pdo->prepare("select id_usuario, nombre from usuario where correo = ?");
        $stmt->execute([$correo]);
        $usuario = $stmt->fetch();

        if ($usuario) {
            $id_usuario = $usuario['id_usuario'];
            $nombre_usuario = $usuario['nombre'] ?? 'Usuario';
            $token = bin2hex(random_bytes(32));
            $expiracion = date("Y-m-d H:i:s", strtotime("+15 minutes"));

            $stmt_update = $pdo->prepare("update usuario set token_recuperacion = ?, expiracion_token = ? where id_usuario = ?");
            $stmt_update->execute([$token, $expiracion, $id_usuario]);

            $app_url = $_ENV['app_url'] ?? 'http://localhost/SICAEH';
            $enlace = $app_url . "/login.html?token=" . urlencode($token);

            $mail = new PHPMailer(true);
            $mail->CharSet = 'UTF-8';
            $mail->isSMTP();
            $mail->Host = $_ENV['mail_host'];
            $mail->SMTPAuth = true;
            $mail->Username = $_ENV['mail_user'];
            $mail->Password = $_ENV['mail_pass'];
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = $_ENV['mail_port'];

            $mail->setFrom($_ENV['mail_user'], 'SICAEH Soporte');
            $mail->addAddress($correo);

            $mail->addEmbeddedImage('../img/Agencia.png', 'logo_agencia');
            $mail->isHTML(true);

            $mail->Subject = 'Recuperación de Contraseña - SICAEH';
            $mail->Body = '<div style="font-family:sans-serif;background-color:#f4f5f7;padding:30px;">' .
                          '<table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;">' .
                          '<tr><td style="padding:40px 30px 20px 30px;">' .
                          '<div style="text-align:center; margin-bottom:20px;">' .
                          '<img src="cid:logo_agencia" alt="Agencia Estatal de Energía de Hidalgo" width="150" style="display:inline-block;">' .
                          '</div>' .
                          '<h2 style="color:#691b31;margin-top:0;font-size:22px;border-bottom:2px solid #f0f0f0;padding-bottom:15px;">Recuperación de Contraseña</h2>' .
                          '<p style="color:#333333;font-size:15px;line-height:1.5;">Hola <b>' . strtoupper(htmlspecialchars($nombre_usuario)) . '</b>,</p>' .
                          '<p style="color:#333333;font-size:15px;line-height:1.5;">Has solicitado restablecer tu contraseña en el sistema SICAEH. Haz clic en el siguiente botón para continuar:</p>' .
                          '<div style="text-align:center;margin:35px 0 20px 0;">' .
                          '<a href="' . $enlace . '" style="background-color:#691b31;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px;display:inline-block;box-shadow:0 4px 6px rgba(105,27,49,0.2);">Restablecer Contraseña</a>' .
                          '</div>' .
                          '<p style="color:#666666;font-size:13px;line-height:1.5;margin-top:20px;">Este enlace expirará en <b>15 minutos</b>. Si no solicitaste este cambio, puedes ignorar este mensaje.</p>' .
                          '</td></tr>' .
                          '<tr style="background-color:#fafafa;"><td style="padding:20px 30px;text-align:center;border-top:1px solid #eeeeee;">' .
                          '<p style="font-size:12px;color:#888888;margin:0;">Agencia Estatal de Energía de Hidalgo</p>' .
                          '<p style="font-size:11px;color:#aaaaaa;margin:5px 0 0 0;">Este es un mensaje automático, por favor no respondas a este correo.</p>' .
                          '</td></tr>' .
                          '</table>' .
                          '</div>';

            $mail->send();
            echo json_encode(["estado" => "exito", "mensaje" => "Se ha enviado un enlace de recuperación a tu correo."]);
        } else {
            echo json_encode(["estado" => "exito", "mensaje" => "Si el correo está registrado, recibirás las instrucciones."]);
        }
    } catch (Exception $e) {
        echo json_encode(["estado" => "error", "mensaje" => "Error al enviar: " . $mail->ErrorInfo]);
    } catch (PDOException $e) {
        echo json_encode(["estado" => "error", "mensaje" => "Error en base de datos: " . $e->getMessage()]);
    }
}
?>