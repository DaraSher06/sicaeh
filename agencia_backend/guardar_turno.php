<?php
//require_once 'auth.php';
//sicaeh_requiere_roles(['administrador', 'supervisor']);
if (ob_get_length()) ob_clean();
header('content-type: application/json; charset=utf-8');
include 'conexion.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id_registro = $_POST['id_registro'] ?? $_POST['id'] ?? null;
    $ids_usuarios = $_POST['id_usuario'] ?? $_POST['usuarios'] ?? $_POST['asignar_usuario'] ?? [];
    $id_tipo_sol = $_POST['tipo_solicitud'] ?? $_POST['id_tipo_sol'] ?? null;

    if (empty($id_registro) || empty($ids_usuarios)) {
        echo json_encode([
            'success' => false, 
            'error' => 'faltan datos obligatorios o usuarios seleccionados.'
        ]);
        exit;
    }

    if (!is_array($ids_usuarios)) {
        $ids_usuarios = [$ids_usuarios];
    }

    if (empty($id_tipo_sol)) {
        $stmt_reg = $pdo->prepare("select id_tipo_sol from registros where id_registro = :id_registro");
        $stmt_reg->execute(['id_registro' => $id_registro]);
        $reg_data = $stmt_reg->fetch(PDO::FETCH_ASSOC);
        $id_tipo_sol = $reg_data['id_tipo_sol'] ?? 1;
    }

    $dias_atencion = $_POST['dias_atencion'] ?? 5;
    $tipo = $_POST['tipo'] ?? $_POST['prioridad'] ?? 'media';
    $id_etapa = $_POST['id_etapa'] ?? 1;
    $observaciones = $_POST['observaciones'] ?? '';

    try {
        $pdo->beginTransaction();

        // 1. primero insertamos en turno para que el trigger de seguimiento encuentre los días de atención
        $sql_turno = "insert into turno (id_registro, id_usuario, dias_atencion, tipo, id_etapa, observaciones, fecha_turno) values (:id_registro, :id_usuario, :dias_atencion, :tipo, :id_etapa, :observaciones, now())";
        $stmt_turno = $pdo->prepare($sql_turno);

        foreach ($ids_usuarios as $id_usuario) {
            if (empty($id_usuario)) continue;

            $stmt_turno->execute([
                'id_registro' => $id_registro,
                'id_usuario' => $id_usuario,
                'dias_atencion' => $dias_atencion,
                'tipo' => $tipo,
                'id_etapa' => $id_etapa,
                'observaciones' => $observaciones
            ]);
        }

        // 2. después insertamos en seguimiento (aquí se ejecuta el trigger trg_seguimiento_fecha_limite)
        $sql_seguimiento = "insert into seguimiento (id_registro, id_etapa, id_tipo_sol) values (:id_registro, 4, :id_tipo_sol)";
        $stmt_seguimiento = $pdo->prepare($sql_seguimiento);

        $stmt_seguimiento->execute([
            'id_registro' => $id_registro,
            'id_tipo_sol' => $id_tipo_sol
        ]);

        $pdo->commit();

        // --- RESPUESTA INMEDIATA AL NAVEGADOR ---
        $respuesta = json_encode([
            'success' => true,
            'mensaje' => 'Solicitud turnada y asignada a seguimiento correctamente.'
        ]);

        // si el servidor cuenta con fastcgi (php-fpm), enviamos el ok al cliente y cerramos la conexión web
        if (function_exists('fastcgi_finish_request')) {
            echo $respuesta;
            session_write_close();
            fastcgi_finish_request();
        }

        // --- ENVIAR CORREO AUTOMÁTICO EN SEGUNDO PLANO ---
        try {
            // Incluimos num_oficio y fecha_limite en la consulta a la vista
            $stmt_info = $pdo->prepare("select num_consecutivo, estatus_sla, num_oficio, fecha_limite from v_lista_seguimiento where id_registro = ? limit 1");
            $stmt_info->execute([$id_registro]);
            $info_reg = $stmt_info->fetch(PDO::FETCH_ASSOC);
            
            $num_consecutivo = $info_reg['num_consecutivo'] ?? 'S/N';
            $estatus_sla = $info_reg['estatus_sla'] ?? 'A tiempo';
            $num_oficio = $info_reg['num_oficio'] ?? 'S/N';
            $fecha_limite = $info_reg['fecha_limite'] ?? 'N/A';

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
                // Rojo institucional / Borgoña o Rojo alerta para Atrasado
                $bg_sla = '#fce8e6';
                $color_sla = '#c5221f';
            }

            $placeholders = implode(',', array_fill(0, count($ids_usuarios), '?'));
            $stmt_usu = $pdo->prepare("select correo, nombre from usuario where id_usuario in ($placeholders)");
            $stmt_usu->execute($ids_usuarios);
            $destinatarios = $stmt_usu->fetchAll(PDO::FETCH_ASSOC);

            // reutilizamos una sola instancia smtp para evitar reconexiones
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
            
            // Adjuntamos la imagen corporativa por CID para que funcione tanto en local como en producción
            $mail->addEmbeddedImage('../img/Agencia.png', 'logo_agencia');
            $mail->isHTML(true);

            foreach ($destinatarios as $dest) {
                if (!empty($dest['correo'])) {
                    $app_url = $_ENV['app_url'] ?? 'http://localhost/SICAEH/';
                    $enlace = $app_url . "/seguimiento.html?id_registro=" . $id_registro . "&estatus_sla=" . urlencode($estatus_sla);

                    $mail->clearAddresses();
                    $mail->addAddress($dest['correo']);

                    $mail->Subject = 'Nueva Asignación de Trámite - ' . strtoupper($num_consecutivo);
                    $mail->Body = '<div style="font-family:sans-serif;background-color:#f4f5f7;padding:30px;">' .
                                  '<table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;">' .
                                  '<tr><td style="padding:40px 30px 20px 30px;">' .
                                  '<div style="text-align:center; margin-bottom:20px;">' .
                                  '<img src="cid:logo_agencia" alt="Agencia Estatal de Energía de Hidalgo" width="150" style="display:inline-block;">' .
                                  '</div>' .
                                  '<h2 style="color:#691b31;margin-top:0;font-size:22px;border-bottom:2px solid #f0f0f0;padding-bottom:15px;">Nueva Asignación SICAEH</h2>' .
                                  '<p style="color:#333333;font-size:15px;line-height:1.5;">Hola <b>' . strtoupper(htmlspecialchars($dest['nombre'])) . '</b>,</p>' .
                                  '<p style="color:#333333;font-size:15px;line-height:1.5;">Se te ha turnado la solicitud con Número Consecutivo:</p>' .
                                  '<div style="background-color:#f9f9f9;border-left:4px solid #691b31;padding:12px 15px;margin:15px 0;font-size:16px;font-weight:bold;color:#222222;">' . strtoupper($num_consecutivo) . '</div>' .
                                  '<p style="color:#333333;font-size:15px;line-height:1.5;">Número de Oficio: <b>' . strtoupper(htmlspecialchars($num_oficio)) . '</b></p>' .
                                  '<p style="color:#333333;font-size:15px;line-height:1.5;">Estatus SLA: <span style="background-color:' . $bg_sla . ';color:' . $color_sla . ';padding:4px 8px;border-radius:4px;font-weight:bold;font-size:13px;">' . strtoupper($estatus_sla) . '</span></p>' .
                                  '<p style="color:#333333;font-size:15px;line-height:1.5;">Fecha límite de atención: <b>' . htmlspecialchars($fecha_limite) . '</b></p>' .
                                  '<p style="color:#333333;font-size:15px;line-height:1.5;margin-top:20px;">Puedes revisarla y atenderla haciendo clic en el siguiente botón:</p>' .
                                  '<div style="text-align:center;margin:35px 0 20px 0;">' .
                                  '<a href="' . $enlace . '" style="background-color:#691b31;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px;display:inline-block;box-shadow:0 4px 6px rgba(105,27,49,0.2);">Ir al sistema SICAEH</a>' .
                                  '</div>' .
                                  '</td></tr>' .
                                  '<tr style="background-color:#fafafa;"><td style="padding:20px 30px;text-align:center;border-top:1px solid #eeeeee;">' .
                                  '<p style="font-size:12px;color:#888888;margin:0;">Agencia Estatal de Energía de Hidalgo</p>' .
                                  '<p style="font-size:11px;color:#aaaaaa;margin:5px 0 0 0;">Este es un mensaje automático, por favor no respondas a este correo.</p>' .
                                  '</td></tr>' .
                                  '</table>' .
                                  '</div>';

                    $mail->send();
                }
            }
        } catch (Exception $mail_ex) {
            // los errores del correo en segundo plano no afectan el flujo principal
        }

        // en entornos apache/mod_php estándar donde no existe fastcgi_finish_request(), la respuesta se imprime aquí
        if (!function_exists('fastcgi_finish_request')) {
            echo $respuesta;
        }

    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
?>