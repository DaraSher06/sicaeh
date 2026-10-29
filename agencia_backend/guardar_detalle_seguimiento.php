<?php
require_once 'auth.php';
sicaeh_requiere_roles(['administrador', 'supervisor', 'capturista']);
ob_start();
error_reporting(E_ALL);
ini_set('display_errors', 0);
header('content-type: application/json; charset=utf-8');

try {
    require_once 'conexion.php';

    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    $id = $data['id_registro'] ?? null;

    if (!$id) {
        ob_clean();
        echo json_encode(['success' => false, 'error' => 'id no válido']);
        exit;
    }

    if (isset($pdo) && $pdo instanceof PDO) {
        $pdo->beginTransaction();
    } else {
        throw new Exception('conexión a base de datos no disponible');
    }

    $ts_val = !empty($data['id_tipo_sol']) ? $data['id_tipo_sol'] : null;
    if ($ts_val !== null) {
        $updreg = $pdo->prepare("update registros set id_tipo_sol = :ts, correo_remitente = :ce where id_registro = :id");
        $updreg->execute([
            'ts' => $ts_val,
            'ce' => $data['correo_remitente'] ?? null,
            'id' => $id
        ]);
    } else {
        $updreg = $pdo->prepare("update registros set correo_remitente = :ce where id_registro = :id");
        $updreg->execute([
            'ce' => $data['correo_remitente'] ?? null,
            'id' => $id
        ]);
    }

    $chk = $pdo->prepare("select id_seguimiento, id_etapa from seguimiento where id_registro = :id limit 1");
    $chk->execute(['id' => $id]);
    $existente = $chk->fetch(PDO::FETCH_ASSOC);

    if ($existente && (int)$existente['id_etapa'] === 7) {
        $pdo->rollBack();
        ob_clean();
        echo json_encode(['success' => false, 'error' => 'La gestión está cerrada, no se permiten modificaciones.']);
        exit;
    }

    $map_etapa = ['atendido' => 6, 'cerrado' => 7, 'cerrada' => 7];
    $est_raw = strtolower(trim($data['estatus_oficio'] ?? ''));
    $target_etapa = $map_etapa[$est_raw] ?? ($existente['id_etapa'] ?? null);

    // Determinar la fecha de cierre si la etapa es final (7)
    $fecha_cierre_val = ((int)$target_etapa === 7) ? date('Y-m-d') : null;

    if ($existente) {
        $sql = "update seguimiento set 
                    beneficiarios_directos = :bd,
                    beneficiarios_indirectos = :bi,
                    se_envia_siga = :ses,
                    num_expediente_fisico = :ef,
                    num_gestion_siga = :gs,
                    num_oficio_respuesta = :origen,
                    observaciones = :obs,
                    entidad_dio_respuesta = :edr,
                    oficio_respuesta_entidad = :ore,
                    observaciones_entidad = :oent,
                    id_etapa = :ide,
                    fecha_cierre = :fc
                where id_registro = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'bd' => !empty($data['beneficiarios_directos']) ? $data['beneficiarios_directos'] : null,
            'bi' => !empty($data['beneficiarios_indirectos']) ? $data['beneficiarios_indirectos'] : null,
            'ses' => isset($data['se_envia_siga']) && $data['se_envia_siga'] !== '' ? $data['se_envia_siga'] : 0,
            'ef' => $data['num_expediente_fisico'] ?? null,
            'gs' => $data['num_gestion_siga'] ?? null,
            'origen' => $data['num_oficio_respuesta'] ?? null,
            'obs' => $data['observaciones'] ?? null,
            'edr' => $data['entidad_dio_respuesta'] ?? null,
            'ore' => $data['oficio_respuesta_entidad'] ?? null,
            'oent' => $data['observaciones_entidad'] ?? null,
            'ide' => $target_etapa,
            'fc' => $fecha_cierre_val,
            'id' => $id
        ]);
    } else {
        $sql = "insert into seguimiento (id_registro, beneficiarios_directos, beneficiarios_indirectos, se_envia_siga, num_expediente_fisico, num_gestion_siga, num_oficio_respuesta, observaciones, entidad_dio_respuesta, oficio_respuesta_entidad, observaciones_entidad, id_etapa, fecha_cierre) 
                values (:id, :bd, :bi, :ses, :ef, :gs, :origen, :obs, :edr, :ore, :oent, :ide, :fc)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'id' => $id,
            'bd' => !empty($data['beneficiarios_directos']) ? $data['beneficiarios_directos'] : null,
            'bi' => !empty($data['beneficiarios_indirectos']) ? $data['beneficiarios_indirectos'] : null,
            'ses' => isset($data['se_envia_siga']) && $data['se_envia_siga'] !== '' ? $data['se_envia_siga'] : 0,
            'ef' => $data['num_expediente_fisico'] ?? null,
            'gs' => $data['num_gestion_siga'] ?? null,
            'origen' => $data['num_oficio_respuesta'] ?? null,
            'obs' => $data['observaciones'] ?? null,
            'edr' => $data['entidad_dio_respuesta'] ?? null,
            'ore' => $data['oficio_respuesta_entidad'] ?? null,
            'oent' => $data['observaciones_entidad'] ?? null,
            'ide' => $target_etapa,
            'fc' => $fecha_cierre_val
        ]);
    }

    if (array_key_exists('entidad_dio_respuesta', $data) || array_key_exists('oficio_respuesta_entidad', $data) || array_key_exists('observaciones_entidad', $data)) {
        $upd_entidad = $pdo->prepare("update seguimiento set 
            entidad_dio_respuesta = :edr,
            oficio_respuesta_entidad = :ore,
            observaciones_entidad = :oent
        where id_registro = :id");
        $upd_entidad->execute([
            'edr' => $data['entidad_dio_respuesta'] ?? null,
            'ore' => $data['oficio_respuesta_entidad'] ?? null,
            'oent' => $data['observaciones_entidad'] ?? null,
            'id' => $id
        ]);
    }

    $turnar_raw = strtolower(trim($data['turnar_a_entidad'] ?? ''));
    if (!empty($turnar_raw)) {
        $reg_stmt = $pdo->prepare("select id_municipio, num_consecutivo from registros where id_registro = :id limit 1");
        $reg_stmt->execute(['id' => $id]);
        $reg_info = $reg_stmt->fetch(PDO::FETCH_ASSOC);
        
        $id_municipio = !empty($data['id_municipio']) ? $data['id_municipio'] : ($reg_info['id_municipio'] ?? null);

        $turnar = (str_contains($turnar_raw, 'cfe')) ? 'cfe_zonas' : $turnar_raw;

        $id_zona_val = !empty($data['id_zona']) ? $data['id_zona'] : null;
        if ($turnar === 'cfe_zonas' && $id_municipio && !$id_zona_val) {
            $zona_stmt = $pdo->prepare("select id_zona from municipio_cfe_zona where id_municipio = :mcp limit 1");
            $zona_stmt->execute(['mcp' => $id_municipio]);
            $zona_row = $zona_stmt->fetch(PDO::FETCH_ASSOC);
            $id_zona_val = $zona_row['id_zona'] ?? null;
        }

        $esp_val = !empty($data['especificacion']) ? trim($data['especificacion']) : null;
        
        if (!empty($data['especificacion'])) {
            $esp_val = trim($data['especificacion']);
        } elseif (!empty($data['especificacion_entidad'])) {
            $esp_val = trim($data['especificacion_entidad']);
        } elseif ($turnar === 'otros') {
            $esp_val = $data['observaciones'] ?? null;
        }

        $del_ent = $pdo->prepare("delete from entidad_turno where id_registro = :id_reg");
        $del_ent->execute(['id_reg' => $id]);

        $ins_ent = $pdo->prepare("insert into entidad_turno (id_registro, nombre_entidad, tipo_entidad, id_zona, id_municipio, especificacion) values (:id_reg, :ne, :te, :iz, :im, :esp)");
        $ins_ent->execute([
            'id_reg' => $id,
            'ne' => strtoupper($turnar) . ' - ' . ($reg_info['num_consecutivo'] ?? $id),
            'te' => $turnar,
            'iz' => $id_zona_val,
            'im' => $id_municipio,
            'esp' => $esp_val
        ]);
    }

    if ((int)$target_etapa === 7) {
        $chk_exp = $pdo->prepare("select id_expediente from expediente where id_registro = :id limit 1");
        $chk_exp->execute(['id' => $id]);
        $exp_row = $chk_exp->fetch(PDO::FETCH_ASSOC);
        
        $ef_val = $data['num_expediente_fisico'] ?? null;
        if ($exp_row) {
            $upd_exp = $pdo->prepare("update expediente set fecha_cierre = curdate(), no_expediente_fisico = coalesce(:ef, no_expediente_fisico) where id_registro = :id");
            $upd_exp->execute(['ef' => $ef_val, 'id' => $id]);
        } else {
            $ins_exp = $pdo->prepare("insert into expediente (id_registro, no_expediente_fisico, fecha_apertura, fecha_cierre) values (:id, :ef, curdate(), curdate())");
            $ins_exp->execute(['id' => $id, 'ef' => $ef_val]);
        }
    }

    $pdo->commit();
    ob_clean();
    echo json_encode(['success' => true]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    ob_clean();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>