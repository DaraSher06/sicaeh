<?php
//eliminar en cuanto se vaya hacer el despligue oficial
session_start();
if (ob_get_length()) ob_clean();
header('content-type: application/json; charset=utf-8');
include 'conexion.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$id_registro = $_GET['id_registro'] ?? 1;

try {
    $stmt_info = $pdo->prepare("select num_consecutivo, estatus_sla, num_oficio from v_lista_seguimiento where id_registro = ? limit 1");
    $stmt_info->execute([$id_registro]);
    $info_reg = $stmt_info->fetch(PDO::FETCH_ASSOC);

    if (!$info_reg) {
        echo json_encode(["estado" => "error", "mensaje" => "El registro especificado no existe."]);
        exit();
    }

    $num_consecutivo = $info_reg['num_consecutivo'] ?? 'S/N';
    $estatus_sla = $info_reg['estatus_sla'] ?? 'A tiempo';
    $num_oficio = $info_reg['num_oficio'] ?? 'S/N';

    $stmt_usu = $pdo->prepare("
        select u.correo, u.nombre 
        from turno t 
        inner join usuario u on t.id_usuario = u.id_usuario 
        where t.id_registro = ? 
        limit 1
    ");
    $stmt_usu->execute([$id_registro]);
    $dest = $stmt_usu->fetch(PDO::FETCH_ASSOC);

    if (!$dest || empty($dest['correo'])) {
        echo json_encode(["estado" => "error", "mensaje" => "El registro no tiene ningún usuario con correo asignado en la tabla turno."]);
        exit();
    }

    $app_url = $_ENV['app_url'] ?? 'http://localhost/SICAEH/';
    $enlace = $app_url . "/seguimiento.html?id_registro=" . $id_registro . "&estatus_sla=" . urlencode($estatus_sla);

    // --- LÓGICA DE COLORES DINÁMICOS SEGÚN EL ESTATUS REAL ---
    $estatus_lower = mb_strtolower(trim($estatus_sla));
    
    if (strpos($estatus_lower, 'tiempo') !== false || strpos($estatus_lower, 'normal') !== false) {
        // Verde (A tiempo / En tiempo)
        $bg_sla = '#e6f4ea';
        $color_sla = '#137333';
    } elseif (strpos($estatus_lower, 'proximo') !== false || strpos($estatus_lower, 'vencer') !== false || strpos($estatus_lower, 'alerta') !== false || strpos($estatus_lower, 'atención') !== false) {
        // Amarillo / Naranja (Próximo a vencer / Alerta)
        $bg_sla = '#fef7e0';
        $color_sla = '#b06000';
    } else {
        // Rojo (Atrasado / Vencido / Fuera de tiempo)
        $bg_sla = '#fce8e6';
        $color_sla = '#c5221f';
    }

    // 1. Primero inicializamos PHPMailer
    $mail = new PHPMailer(true);
    $mail->CharSet = 'UTF-8';
    $mail->isSMTP();
    $mail->Host = $_ENV['mail_host'];
    $mail->SMTPAuth = true;
    $mail->Username = $_ENV['mail_user'];
    $mail->Password = $_ENV['mail_pass'];
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = $_ENV['mail_port'];

    $mail->setFrom($_ENV['mail_user'], 'SICAEH Notificaciones');
    $mail->addAddress($dest['correo']);

    // 2. Adjuntamos la imagen usando una ruta relativa correcta 
    $mail->addEmbeddedImage('../img/Agencia.png', 'logo_agencia');

    $mail->isHTML(true);
    $mail->Subject = 'Nueva Asignación de Trámite - ' . strtoupper($num_consecutivo);
    $mail->Body = '<div style="font-family:sans-serif;background-color:#f4f5f7;padding:30px;">' .
                '<table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;">' .
                '<tr><td style="padding:40px 30px 20px 30px;">' .
                '<div style="text-align:center; margin-bottom:20px;">' .
                '<img src="cid:logo_agencia" alt="Agencia Estatal de Energía de Hidalgo" width="150" style="display:inline-block;">' .
                '</div>' .
                '<h2 style="color:#5a1c24;margin-top:0;font-size:22px;border-bottom:2px solid #f0f0f0;padding-bottom:15px;">Nueva Asignación SICAEH</h2>' .
                '<p style="color:#333333;font-size:15px;line-height:1.5;">Hola <b>' . strtoupper(htmlspecialchars($dest['nombre'])) . '</b>,</p>' .
                '<p style="color:#333333;font-size:15px;line-height:1.5;">Se te ha turnado la solicitud con Número Consecutivo:</p>' .
                '<div style="background-color:#f9f9f9;border-left:4px solid #691b31;padding:12px 15px;margin:15px 0;font-size:16px;font-weight:bold;color:#222222;">' . strtoupper($num_consecutivo) . '</div>' .
                '<p style="color:#333333;font-size:15px;line-height:1.5;">Número de Oficio: <b>' . strtoupper(htmlspecialchars($num_oficio)) . '</b></p>' .
                '<p style="color:#333333;font-size:15px;line-height:1.5;">Estatus SLA: <span style="background-color:' . $bg_sla . ';color:' . $color_sla . ';padding:4px 8px;border-radius:4px;font-weight:bold;font-size:13px;">' . strtoupper($estatus_sla)  . '</span></p>' .
                '<p style="color:#333333;font-size:15px;line-height:1.5;margin-top:20px;">Puedes revisarla y atenderla haciendo clic en el siguiente botón:</p>' .
                '<div style="text-align:center;margin:35px 0 20px 0;">' .
                '<a href="' . $enlace . '" style="background-color:#5a1c24;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px;display:inline-block;box-shadow:0 4px 6px rgba(90,28,36,0.2);">Ir al sistema SICAEH</a>' .
                '</div>' .
                '</td></tr>' .
                '<tr style="background-color:#fafafa;"><td style="padding:20px 30px;text-align:center;border-top:1px solid #eeeeee;">' .
                '<p style="font-size:12px;color:#888888;margin:0;">Agencia Estatal de Energía de Hidalgo</p>' .
                '<p style="font-size:11px;color:#aaaaaa;margin:5px 0 0 0;">Este es un mensaje automático, por favor no respondas a este correo.</p>' .
                '</td></tr>' .
                '</table>' .
                '</div>';
    
    $mail->send();
    echo json_encode([
        "estado" => "exito", 
        "mensaje" => "Correo de prueba enviado correctamente a " . $dest['correo']
    ]);

} catch (Exception $e) {
    echo json_encode([
        "estado" => "error", 
        "mensaje" => "Error al enviar: " . $mail->ErrorInfo
    ]);
}
?>