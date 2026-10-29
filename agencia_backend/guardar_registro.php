<?php
require_once 'auth.php';
sicaeh_requiere_roles(['administrador', 'supervisor', 'capturista']);
if (ob_get_length()) ob_clean();
header('content-type: application/json; charset=utf-8');

include 'conexion.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    
    if (empty($_POST) && isset($_SERVER['CONTENT_LENGTH']) && $_SERVER['CONTENT_LENGTH'] > 0) {
        echo json_encode([
            'success' => false, 
            'error' => 'El archivo adjunto es demasiado pesado para el servidor y superó el límite de subida permitido.'
        ]);
        exit;
    }
    $num_oficio = $_POST['num_oficio'] ?? '';
    $num_turno = $_POST['num_turno'] ?? '';
    $fecha_turno = !empty($_POST['fecha_turno']) ? $_POST['fecha_turno'] : null;
    $fecha_captura = !empty($_POST['fecha_captura']) ? $_POST['fecha_captura'] : date('Y-m-d');
    
    $id_remitente = !empty($_POST['id_remitente']) ? $_POST['id_remitente'] : null;
    $nom_remitente = !empty($_POST['nom_remitente']) ? $_POST['nom_remitente'] : null;
    $sexo = !empty($_POST['sexo']) ? $_POST['sexo'] : null;
    
    $val_gestion = $_POST['gestion_atencion_pueblo'] ?? '';
    $gestion_atencion_pueblo = ($val_gestion === 'si' || $val_gestion === '1') ? 1 : 0;

    $telefono_remitente = !empty($_POST['telefono_remitente']) ? $_POST['telefono_remitente'] : null;
    $correo_remitente = !empty($_POST['correo_remitente']) ? $_POST['correo_remitente'] : null;
    $asunto = $_POST['asunto'] ?? '';
    $solicitante = !empty($_POST['solicitante']) ? $_POST['solicitante'] : null;
    $id_tipo_sol = !empty($_POST['id_tipo_sol']) ? $_POST['id_tipo_sol'] : null;
    $id_etapa = $_POST['id_etapa'] ?? 1;
    
    $id_edo = !empty($_POST['id_edo']) ? $_POST['id_edo'] : null;
    $id_municipio = !empty($_POST['id_municipio']) ? $_POST['id_municipio'] : null;
    $id_localidad = !empty($_POST['id_localidad']) ? $_POST['id_localidad'] : null;

    $municipio_otro = !empty($_POST['municipio_texto']) ? $_POST['municipio_texto'] : null;
    $localidad_otro = !empty($_POST['localidad_texto']) ? $_POST['localidad_texto'] : null;

    $num_gestion_siga = !empty($_POST['num_gestion_siga']) ? $_POST['num_gestion_siga'] : null;
    $id_usuario_captura = sicaeh_id_usuario();

    $ruta_documento = null;
    $nombre_original = null;

    if (isset($_FILES['documento_adjunto']) && $_FILES['documento_adjunto']['error'] === UPLOAD_ERR_OK) {
        $file_tmp_path = $_FILES['documento_adjunto']['tmp_name'];
        $file_name = $_FILES['documento_adjunto']['name'];
        $nombre_original = $file_name;
        
        $file_extension = strtolower(pathinfo($file_name, PATHINFO_EXTENSION));
        
        $allowed_extensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'];
        if (in_array($file_extension, $allowed_extensions)) {
            $upload_file_dir = '../uploads/';
            if (!is_dir($upload_file_dir)) {
                mkdir($upload_file_dir, 0755, true);
            }
            $new_file_name = md5(time() . $file_name) . '.' . $file_extension;
            $dest_path = $upload_file_dir . $new_file_name;
            
            if (move_uploaded_file($file_tmp_path, $dest_path)) {
                $ruta_documento = $dest_path;
            }
        }
    }

    if (empty($num_oficio) || empty($num_turno) || empty($asunto)) {
        echo json_encode(['success' => false, 'error' => 'Faltan campos obligatorios principales.']);
        exit;
    }

    try {
        $pdo->beginTransaction();

        // 1. insertamos el registro principal (sin fecha_evento)
        $sql = "insert into registros (
                    num_oficio, num_turno, fecha_turno, fecha_captura, id_remitente, 
                    nom_remitente, sexo, gestion_atencion_pueblo, telefono_remitente, 
                    correo_remitente, asunto, solicitante, id_tipo_sol, id_etapa, 
                    id_edo, id_municipio, id_localidad, municipio_otro, localidad_otro, 
                    num_gestion_siga, id_usuario_captura, documento_adjunto, nombre_original
                ) values (
                    :num_oficio, :num_turno, :fecha_turno, :fecha_captura, :id_remitente, 
                    :nom_remitente, :sexo, :gestion_atencion_pueblo, :telefono_remitente, 
                    :correo_remitente, :asunto, :solicitante, :id_tipo_sol, :id_etapa, 
                    :edo, :municipio, :localidad, :municipio_otro, :localidad_otro, 
                    :num_gestion_siga, :id_usuario_captura, :documento_adjunto, :nombre_original
                )";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'num_oficio' => $num_oficio,
            'num_turno' => $num_turno,
            'fecha_turno' => $fecha_turno,
            'fecha_captura' => $fecha_captura,
            'id_remitente' => $id_remitente,
            'nom_remitente' => $nom_remitente,
            'sexo' => $sexo,
            'gestion_atencion_pueblo' => $gestion_atencion_pueblo,
            'telefono_remitente' => $telefono_remitente,
            'correo_remitente' => $correo_remitente,
            'asunto' => $asunto,
            'solicitante' => $solicitante,
            'id_tipo_sol' => $id_tipo_sol,
            'id_etapa' => $id_etapa,
            'edo' => $id_edo,
            'municipio' => $id_municipio,
            'localidad' => $id_localidad,
            'municipio_otro' => $municipio_otro,
            'localidad_otro' => $localidad_otro,
            'num_gestion_siga' => $num_gestion_siga,
            'id_usuario_captura' => $id_usuario_captura,
            'documento_adjunto' => $ruta_documento,
            'nombre_original' => $nombre_original
        ]);

        $id_nuevo_registro = $pdo->lastInsertId();

        // 2. guardamos las fechas asociadas en la tabla 'registro_fechas'
        // caso a: si se envía un rango continuo (fecha_inicio y fecha_fin)
        if (!empty($_POST['fecha_inicio']) && !empty($_POST['fecha_fin'])) {
            $periodo = new DatePeriod(
                new DateTime($_POST['fecha_inicio']),
                new DateInterval('P1D'),
                (new DateTime($_POST['fecha_fin']))->modify('+1 day')
            );

            $stmt_fecha = $pdo->prepare("insert into registro_fechas (id_registro, fecha) values (:id_registro, :fecha)");
            foreach ($periodo as $dt) {
                $stmt_fecha->execute([
                    'id_registro' => $id_nuevo_registro,
                    'fecha' => $dt->format('Y-m-d')
                ]);
            }
        } 
        // caso b: si son fechas independientes enviadas en un arreglo (fechas_evento[])
        else if (!empty($_POST['fechas_evento']) && is_array($_POST['fechas_evento'])) {
            $stmt_fecha = $pdo->prepare("insert into registro_fechas (id_registro, fecha) values (:id_registro, :fecha)");
            foreach ($_POST['fechas_evento'] as $f) {
                if (!empty($f)) {
                    $stmt_fecha->execute([
                        'id_registro' => $id_nuevo_registro,
                        'fecha' => $f
                    ]);
                }
            }
        }
        // caso c: si mandan una sola fecha suelta desde un input simple
        else if (!empty($_POST['fecha_evento_simple'])) {
            $stmt_fecha = $pdo->prepare("insert into registro_fechas (id_registro, fecha) values (:id_registro, :fecha)");
            $stmt_fecha->execute([
                'id_registro' => $id_nuevo_registro,
                'fecha' => $_POST['fecha_evento_simple']
            ]);
        }

        $pdo->commit();

        echo json_encode([
            'success' => true, 
            'id_registro' => $id_nuevo_registro,
            'mensaje' => 'Registro guardado correctamente.'
        ]);

    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
?>