<?php
require 'conexion.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

header('content-type: application/json; charset=utf-8');

try {
    $sql = "select 
                r.id_registro, 
                r.num_consecutivo, 
                r.num_oficio,
                r.asunto, 
                r.estatus_sla, 
                r.fecha_limite,
                u.correo,
                u.nombre as nombre_usuario
            from v_lista_seguimiento r
            inner join usuario u on r.id_usuario_asignado = u.id_usuario
            where lcase(r.estatus_sla collate utf8mb4_unicode_ci) in ('por vencer', 'vencido')
              and lcase(r.estatus_oficio collate utf8mb4_unicode_ci) not in ('atendido', 'cerrado')
              and u.correo is not null and u.correo != ''";

    $stmt = $pdo->query($sql);
    $registros = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $enviados = 0;
    $errores = 0;

    foreach ($registros as $reg) {
        $correo_destino = $reg['correo'];
        $num_consecutivo = $reg['num_consecutivo'] ?? 'S/N';
        $num_oficio = $reg['num_oficio'] ?? 'S/N';
        $estatus_sla = $reg['estatus_sla'] ?? 'Por vencer';
        $fecha_limite = $reg['fecha_limite'] ?? 'N/A';
        $id_registro = $reg['id_registro'];
        $nombre_usuario = $reg['nombre_usuario'] ?? 'Usuario';

        $estatus_lower = mb_strtolower(trim($estatus_sla));
        
        if (strpos($estatus_lower, 'tiempo') !== false || strpos($estatus_lower, 'normal') !== false) {
            $bg_sla = '#e6f4ea';
            $color_sla = '#137333';
        } elseif (strpos($estatus_lower, 'proximo') !== false || strpos($estatus_lower, 'vencer') !== false || strpos($estatus_lower, 'alerta') !== false || strpos($estatus_lower, 'atención') !== false) {
            $bg_sla = '#fef7e0';
            $color_sla = '#b06000';
        } else {
            $bg_sla = '#fce8e6';
            $color_sla = '#c5221f';
        }

        try {
            $app_url = $_ENV['app_url'] ?? 'http://localhost/SICAEH/';
            $enlace = $app_url . "/seguimiento.html?id_registro=" . $id_registro . "&estatus_sla=" . urlencode($estatus_sla);

            $mail = new PHPMailer(true);
            $mail->CharSet = 'UTF-8';
            $mail->isSMTP();
            $mail->Host = $_ENV['mail_host'];
            $mail->SMTPAuth = true;
            $mail->Username = $_ENV['mail_user'];
            $mail->Password = $_ENV['mail_pass'];
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = $_ENV['mail_port'];

            $mail->setFrom($_ENV['mail_user'], 'SICAEH Alertas');
            $mail->addAddress($correo_destino);

            $mail->addEmbeddedImage('../img/Agencia.png', 'logo_agencia');
            $mail->isHTML(true);

            $mail->Subject = 'Alerta SICAEH - Solicitud: ' . strtoupper($estatus_sla) . ' - Num. Consecutivo: ' . strtoupper($num_consecutivo);
            $mail->Body = '<div style="font-family:sans-serif;background-color:#f4f5f7;padding:30px;">' .
                          '<table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;">' .
                          '<tr><td style="padding:40px 30px 20px 30px;">' .
                          '<div style="text-align:center; margin-bottom:20px;">' .
                          '<img src="cid:logo_agencia" alt="Agencia Estatal de Energía de Hidalgo" width="150" style="display:inline-block;">' .
                          '</div>' .
                          '<h2 style="color:#691b31;margin-top:0;font-size:22px;border-bottom:2px solid #f0f0f0;padding-bottom:15px;">Alerta SICAEH</h2>' .
                          '<p style="color:#333333;font-size:15px;line-height:1.5;">Hola <b>' . strtoupper(htmlspecialchars($nombre_usuario)) . '</b>,</p>' .
                          '<p style="color:#333333;font-size:15px;line-height:1.5;">Te informamos que la solicitud con Número Consecutivo:</p>' .
                          '<div style="background-color:#f9f9f9;border-left:4px solid #691b31;padding:12px 15px;margin:15px 0;font-size:16px;font-weight:bold;color:#222222;">' . strtoupper($num_consecutivo) . '</div>' .
                          '<p style="color:#333333;font-size:15px;line-height:1.5;">Número de Oficio: <b>' . strtoupper(htmlspecialchars($num_oficio)) . '</b></p>' .
                          '<p style="color:#333333;font-size:15px;line-height:1.5;">Estatus: <span style="background-color:' . $bg_sla . ';color:' . $color_sla . ';padding:4px 8px;border-radius:4px;font-weight:bold;font-size:13px;">' . strtoupper($estatus_sla) . '</span></p>' .
                          '<p style="color:#333333;font-size:15px;line-height:1.5;">Fecha límite de antención: <b>' . htmlspecialchars($fecha_limite) . '</b></p>' .
                          '<p style="color:#333333;font-size:15px;line-height:1.5;margin-top:20px;">Puedes revisar y atender la solicitud haciendo clic en el siguiente botón:</p>' .
                          '<div style="text-align:center;margin:35px 0 20px 0;">' .
                          '<a href="' . $enlace . '" style="background-color:#691b31;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px;display:inline-block;box-shadow:0 4px 6px rgba(105,27,49,0.2);">Ir al Sistema SICAEH</a>' .
                          '</div>' .
                          '</td></tr>' .
                          '<tr style="background-color:#fafafa;"><td style="padding:20px 30px;text-align:center;border-top:1px solid #eeeeee;">' .
                          '<p style="font-size:12px;color:#888888;margin:0;">Agencia Estatal de Energía de Hidalgo</p>' .
                          '<p style="font-size:11px;color:#aaaaaa;margin:5px 0 0 0;">Este es un mensaje automático, por favor no respondas a este correo.</p>' .
                          '</td></tr>' .
                          '</table>' .
                          '</div>';

            $mail->send();
            $enviados++;
        } catch (Exception $e) {
            $errores++;
        }
    }

    echo json_encode([
        "estado" => "exito", 
        "mensaje" => "Proceso de alertas finalizado.",
        "correos_enviados" => $enviados,
        "errores" => $errores
    ]);

} catch (PDOException $e) {
    echo json_encode([
        "estado" => "error", 
        "mensaje" => "Error en base de datos: " . $e->getMessage()
    ]);
}
?>