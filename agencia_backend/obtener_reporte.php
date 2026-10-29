<?php
require_once 'auth.php';
sicaeh_requiere_sesion();
ob_start();
header('content-type: application/json; charset=utf-8');
header('cache-control: no-cache, must-revalidate');
include 'conexion.php';

$id_usuario_sesion = sicaeh_id_usuario();
$es_elevado = sicaeh_es_elevado();

$vista = isset($_REQUEST['vista']) ? trim($_REQUEST['vista']) : '';
$ambito = strtolower(trim((string)($_REQUEST['ambito'] ?? 'general')));
if (!in_array($ambito, ['general', 'individual'], true)) {
    $ambito = 'general';
}
$fecha_inicio = isset($_GET['fecha_inicio']) ? trim($_GET['fecha_inicio']) : '';
$fecha_fin = isset($_GET['fecha_fin']) ? trim($_GET['fecha_fin']) : '';

$vistas_permitidas = [
    "v_benificiarios_directos_mensuales",
    "v_beneficiarios_directos_mensual",
    "v_beneficiarios_indirectos_mensual",
    "v_cobertura_municipal",
    "v_comportamiento_mensual",
    "v_grafica_clasificacion",
    "v_grafica_origen_solicitud",
    "v_grafica_solicitudes_ingresadas",
    "v_grafica_solicitudes_por_municipio",
    "v_impacto_social_beneficiarios",
    "v_grafica_sexo",
    "v_oficios_cfe",
    "sp_reporte_avanzado_filtros"
];

if (!in_array($vista, $vistas_permitidas)) {
    ob_clean();
    echo json_encode(['success' => false, 'error' => 'vista no válida']);
    exit;
}

try {
    // consulta solo ve lo propio; el resto puede pedir general o individual
    if (!$es_elevado) {
        $ambito = 'individual';
        $es_individual = true;
    } else {
        $es_individual = ($ambito === 'individual');
    }

    // 3. construimos el FROM y el WHERE de forma consistente
    $params_base = [];
    $condiciones = [];

    if ($es_individual && $id_usuario_sesion > 0) {
        $from_sql = " from registros r inner join turno t on t.id_registro = r.id_registro ";
        $condiciones[] = " t.id_usuario = :id_usuario_sesion ";
        $params_base['id_usuario_sesion'] = $id_usuario_sesion;
    } else {
        // general: consulta directa a la tabla registros
        $from_sql = " from registros r ";
    }

    if (!empty($fecha_inicio) && !empty($fecha_fin)) {
        $condiciones[] = " r.fecha_captura between :fecha_inicio and :fecha_fin ";
        $params_base['fecha_inicio'] = $fecha_inicio . ' 00:00:00';
        $params_base['fecha_fin'] = $fecha_fin . ' 23:59:59';
    }

    $where_sql = count($condiciones) > 0 ? " where " . implode(" and ", $condiciones) : "";

    // --- VISTA 1: SOLICITUDES INGRESADAS ---
    if ($vista === "v_grafica_solicitudes_ingresadas") {
        $sql_rec = "select count(distinct r.id_registro) as recibidas " . $from_sql . $where_sql;
        $stmt_rec = $pdo->prepare($sql_rec);
        $stmt_rec->execute($params_base);
        $res_rec = $stmt_rec->fetch(PDO::FETCH_ASSOC);

        $sql_etapas = "select 
                            sum(case when s.id_etapa = 5 then 1 else 0 end) as atendidas, 
                            sum(case when s.id_etapa in (6, 7) then 1 else 0 end) as en_proceso 
                       " . $from_sql . " 
                       left join seguimiento s on s.id_registro = r.id_registro " . $where_sql;
        $stmt_etapas = $pdo->prepare($sql_etapas);
        $stmt_etapas->execute($params_base);
        $res_etapas = $stmt_etapas->fetch(PDO::FETCH_ASSOC);

        $sql_mun = "select count(distinct r.id_municipio) as municipios_atendidos " . $from_sql . $where_sql;
        $stmt_mun = $pdo->prepare($sql_mun);
        $stmt_mun->execute($params_base);
        $res_mun = $stmt_mun->fetch(PDO::FETCH_ASSOC);

        ob_clean();
        echo json_encode([
            'success' => true,
            'ambito' => $ambito,
            'recibidas' => intval($res_rec['recibidas'] ?? 0),
            'atendidas' => intval($res_etapas['atendidas'] ?? 0),
            'en_proceso' => intval($res_etapas['en_proceso'] ?? 0),
            'municipios_atendidos' => intval($res_mun['municipios_atendidos'] ?? 0)
        ]);
        exit;
    }

    // --- VISTA 2: CLASIFICACIÓN ---
    if ($vista === "v_grafica_clasificacion") {
        $join_turno_clasif = ($es_individual && $id_usuario_sesion > 0) ? " inner join turno t on t.id_registro = r.id_registro " : "";
        $sql = "select 
                    case 
                        when trim(lower(clasificacion)) in ('expos', 'capacitaciones', 'congresos', 'ferias', 'foros', 'ponencias', 'talleres', 'reuniones de trabajo', 'conferencias', 'conferencia') then 'invitaciones'
                        else clasificacion
                    end as clasificacion,
                    sum(total_solicitudes) as total_solicitudes
                from (
                    select t_sol.nombre_tipo as clasificacion, count(r.id_registro) as total_solicitudes 
                    from tipo_solicitud t_sol 
                    left join registros r on t_sol.id_tipo_sol = r.id_tipo_sol 
                    " . $join_turno_clasif . "
                    " . $where_sql . "
                    group by t_sol.id_tipo_sol, t_sol.nombre_tipo
                ) as subconsulta
                group by 
                    case 
                        when trim(lower(clasificacion)) in ('expos', 'capacitaciones', 'congresos', 'ferias', 'foros', 'ponencias', 'talleres', 'reuniones de trabajo', 'conferencias', 'conferencia') then 'invitaciones'
                        else clasificacion
                    end";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params_base);
        $resultados = $stmt->fetchAll(PDO::FETCH_ASSOC);

        ob_clean();
        echo json_encode(['success' => true, 'data' => $resultados]);
        exit;
    }

    // --- VISTA 3: ORIGEN SOLICITUD ---
    if ($vista === "v_grafica_origen_solicitud") {
        $sql = "select 
                    case 
                        when r.gestion_atencion_pueblo = 1 then 'atención al pueblo' 
                        else 'otras instancias' 
                    end as origen_solicitud, 
                    count(r.id_registro) as total_solicitudes 
                " . $from_sql . " " . $where_sql . "
                group by r.gestion_atencion_pueblo";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params_base);
        $resultados = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $total_general = array_sum(array_column($resultados, 'total_solicitudes'));
        foreach ($resultados as &$item) {
            $val = intval($item['total_solicitudes']);
            $item['porcentaje'] = $total_general > 0 ? round(($val / $total_general) * 100, 1) : 0;
        }

        ob_clean();
        echo json_encode(['success' => true, 'data' => $resultados]);
        exit;
    }

    // --- VISTA 4: COBERTURA MUNICIPAL ---
    if ($vista === "v_cobertura_municipal") {
        $sql_total_muni = "select count(*) as total from municipio"; 
        $stmt_tm = $pdo->prepare($sql_total_muni);
        $stmt_tm->execute();
        $res_tm = $stmt_tm->fetch(PDO::FETCH_ASSOC);
        $total_municipios = intval($res_tm['total'] ?? 84);

        $sql_con = "select count(distinct r.id_municipio) as con_solicitud " . $from_sql . " " . $where_sql;
        $stmt_con = $pdo->prepare($sql_con);
        $stmt_con->execute($params_base);
        $res_con = $stmt_con->fetch(PDO::FETCH_ASSOC);
        $municipios_con = intval($res_con['con_solicitud'] ?? 0);

        $municipios_sin = max(0, $total_municipios - $municipios_con);
        $porcentaje = $total_municipios > 0 ? round(($municipios_con / $total_municipios) * 100, 1) : 0;

        $resultados = [[
            "total_municipios" => $total_municipios,
            "municipios_con_solicitud" => $municipios_con,
            "municipios_sin_solicitud" => $municipios_sin,
            "porcentaje_cobertura" => $porcentaje
        ]];

        ob_clean();
        echo json_encode(['success' => true, 'data' => $resultados]);
        exit;
    }

    // --- VISTA 5: COMPORTAMIENTO MENSUAL ---
    if ($vista === "v_comportamiento_mensual") {
        $sql = "select date_format(r.fecha_captura, '%Y-%m') as mes, count(r.id_registro) as total_solicitudes 
                " . $from_sql . " " . $where_sql . "
                group by date_format(r.fecha_captura, '%Y-%m') order by mes asc";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params_base);
        $resultados = $stmt->fetchAll(PDO::FETCH_ASSOC);

        ob_clean();
        echo json_encode(['success' => true, 'data' => $resultados]);
        exit;
    }

    // --- vista 6: beneficiarios directos ---
    if ($vista === "v_beneficiarios_directos_mensual" || $vista === "v_benificiarios_directos_mensuales") {
        if ($es_individual && $id_usuario_sesion > 0) {
            $sql = "select 
                        date_format(r.fecha_captura, '%Y-%m') as mes, 
                        coalesce(sum(s.beneficiarios_directos), 0) as total_beneficiarios_directos 
                    from registros r 
                    inner join turno t on t.id_registro = r.id_registro 
                    left join seguimiento s on s.id_registro = r.id_registro 
                    where t.id_usuario = :id_usuario_sesion " . (!empty($fecha_inicio) && !empty($fecha_fin) ? " and r.fecha_captura between :fecha_inicio and :fecha_fin " : "") . "
                    group by date_format(r.fecha_captura, '%Y-%m') 
                    order by mes asc";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params_base);
        } else {
            // modo general: leemos la vista de mysql mapeando el nombre real de la columna 'total_directos'
            $sql = "select 
                        lpad(mes, 2, '0') as mes, 
                        total_directos as total_beneficiarios_directos 
                    from v_beneficiarios_directos_mensual 
                    order by cast(mes as unsigned) asc";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
        }

        $resultados = $stmt->fetchAll(PDO::FETCH_ASSOC);

        ob_clean();
        echo json_encode(['success' => true, 'data' => $resultados]);
        exit;
    }

    // --- vista 7: beneficiarios indirectos ---
    if ($vista === "v_beneficiarios_indirectos_mensual") {
        if ($es_individual && $id_usuario_sesion > 0) {
            $sql = "select 
                        date_format(r.fecha_captura, '%Y-%m') as mes, 
                        coalesce(sum(s.beneficiarios_indirectos), 0) as total_beneficiarios_indirectos 
                    from registros r 
                    inner join turno t on t.id_registro = r.id_registro 
                    left join seguimiento s on s.id_registro = r.id_registro 
                    where t.id_usuario = :id_usuario_sesion " . (!empty($fecha_inicio) && !empty($fecha_fin) ? " and r.fecha_captura between :fecha_inicio and :fecha_fin " : "") . "
                    group by date_format(r.fecha_captura, '%Y-%m') 
                    order by mes asc";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params_base);
        } else {
            // modo general: leemos la vista de mysql mapeando el nombre real de la columna 'total_indirectos'
            $sql = "select 
                        lpad(mes, 2, '0') as mes, 
                        total_indirectos as total_beneficiarios_indirectos 
                    from v_beneficiarios_indirectos_mensual 
                    order by cast(mes as unsigned) asc";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
        }

        $resultados = $stmt->fetchAll(PDO::FETCH_ASSOC);

        ob_clean();
        echo json_encode(['success' => true, 'data' => $resultados]);
        exit;
    }

    // --- VISTA 8: GRÁFICA SEXO ---
    if ($vista === "v_grafica_sexo") {
        $cond_sexo = " trim(lower(r.sexo)) in ('femenino', 'f', 'masculino', 'm') ";
        $where_sexo = empty($where_sql) ? " where " . $cond_sexo : $where_sql . " and " . $cond_sexo;

        $sql = "select 
                    trim(lower(r.sexo)) as sexo, 
                    count(r.id_registro) as total_solicitudes 
                " . $from_sql . " " . $where_sexo . "
                group by trim(lower(r.sexo))";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params_base);
        $resultados = $stmt->fetchAll(PDO::FETCH_ASSOC);

        ob_clean();
        echo json_encode(['success' => true, 'data' => $resultados]);
        exit;
    }

    // --- VISTA 9: REPORTE AVANZADO / MUNICIPIOS ---
    if ($vista === "sp_reporte_avanzado_filtros" || $vista === "v_grafica_solicitudes_por_municipio") {
        $join_turno_muni = ($es_individual && $id_usuario_sesion > 0) ? " inner join turno t on t.id_registro = r.id_registro " : "";
        
        $sql_muni = "select 
                        m.id_municipio,
                        m.nombre_municipio,
                        count(r.id_registro) as total_solicitudes
                    from municipio m
                    left join registros r on r.id_municipio = m.id_municipio 
                    " . $join_turno_muni . "
                    " . $where_sql . "
                    group by m.id_municipio, m.nombre_municipio
                    order by m.id_municipio asc";

        $stmt_muni = $pdo->prepare($sql_muni);
        $stmt_muni->execute($params_base);
        $tabla_municipios = $stmt_muni->fetchAll(PDO::FETCH_ASSOC);

        $sql_top = "select 
                        m.id_municipio,
                        m.nombre_municipio,
                        count(r.id_registro) as total
                    " . $from_sql . "
                    inner join municipio m on m.id_municipio = r.id_municipio 
                    " . $where_sql . "
                    group by m.id_municipio, m.nombre_municipio
                    order by total desc limit 1";

        $stmt_top = $pdo->prepare($sql_top);
        $stmt_top->execute($params_base);
        $municipio_top = $stmt_top->fetch(PDO::FETCH_ASSOC);

        $desglose_top = [];
        if ($municipio_top) {
            $params_top = array_merge($params_base, ['id_municipio' => $municipio_top['id_municipio']]);
            $cond_top_where = empty($where_sql) ? " where r.id_municipio = :id_municipio " : $where_sql . " and r.id_municipio = :id_municipio ";

            $sql_clasif_top = "select 
                                ts.nombre_tipo as clasificacion,
                                count(r.id_registro) as total_solicitudes
                            from tipo_solicitud ts
                            left join registros r on r.id_tipo_sol = ts.id_tipo_sol 
                            " . $join_turno_muni . "
                            " . str_replace("where", "and", $cond_top_where) . "
                            group by ts.id_tipo_sol, ts.nombre_tipo order by ts.id_tipo_sol asc";

            $stmt_clasif = $pdo->prepare($sql_clasif_top);
            $stmt_clasif->execute($params_top);
            $desglose_top = $stmt_clasif->fetchAll(PDO::FETCH_ASSOC);
        }

        $cond_sexo = " trim(lower(r.sexo)) in ('femenino', 'f', 'masculino', 'm') ";
        $where_sexo = empty($where_sql) ? " where " . $cond_sexo : $where_sql . " and " . $cond_sexo;

        $sql_sexo = "select 
                        trim(lower(r.sexo)) as sexo, 
                        count(r.id_registro) as total_solicitudes 
                    " . $from_sql . " " . $where_sexo . "
                    group by trim(lower(r.sexo))";
        
        $stmt_sexo = $pdo->prepare($sql_sexo);
        $stmt_sexo->execute($params_base);
        $desglose_sexo = $stmt_sexo->fetchAll(PDO::FETCH_ASSOC);

        ob_clean();
        echo json_encode([
            'success' => true,
            'tabla_municipios' => $tabla_municipios,
            'municipio_top' => $municipio_top,
            'desglose_top' => $desglose_top,
            'desglose_sexo' => $desglose_sexo
        ]);
        exit;
    }

    // --- vista 10: oficios cfe ---
    if ($vista === "v_oficios_cfe") {
        $zona_cfe = isset($_GET['zona']) ? strtolower(trim($_GET['zona'])) : 'todas';
        $cond_cfe = [];
        $params_cfe = [];

        if ($es_individual && $id_usuario_sesion > 0) {
            $cond_cfe[] = " t.id_usuario = :id_usuario_sesion ";
            $params_cfe['id_usuario_sesion'] = $id_usuario_sesion;
        }

        if ($zona_cfe !== 'todas' && !empty($zona_cfe)) {
            if ($zona_cfe === 'tula') {
                // busca 'tula' pero excluye explícitamente 'tulancingo'
                $cond_cfe[] = " (lower(v.zona_cfe) like :zona_tula and lower(v.zona_cfe) not like :no_tulancingo) ";
                $params_cfe['zona_tula'] = '%tula%';
                $params_cfe['no_tulancingo'] = '%tulancingo%';
            } else {
                $cond_cfe[] = " lower(v.zona_cfe) like :zona_cfe ";
                $params_cfe['zona_cfe'] = '%' . $zona_cfe . '%';
            }
        }

        if (!empty($fecha_inicio) && !empty($fecha_fin)) {
            $cond_cfe[] = " v.fecha_captura between :fecha_inicio and :fecha_fin ";
            $params_cfe['fecha_inicio'] = $fecha_inicio . ' 00:00:00';
            $params_cfe['fecha_fin'] = $fecha_fin . ' 23:59:59';
        }

        $where_cfe_sql = count($cond_cfe) > 0 ? " where " . implode(" and ", $cond_cfe) : "";

        $sql = "select distinct
                    v.num_consecutivo,
                    v.oficio_enviado,
                    v.oficio_respuesta,
                    v.tipo_solicitud,
                    v.municipio,
                    v.zona_cfe
                from v_oficios_cfe v 
                " . ($es_individual ? " inner join turno t on t.id_registro = v.id_registro " : "") . "
                " . $where_cfe_sql . " 
                order by v.id_registro desc";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params_cfe);
        $resultados = $stmt->fetchAll(PDO::FETCH_ASSOC);

        ob_clean();
        echo json_encode(['success' => true, 'data' => $resultados]);
        exit;
    }
    
    $sql = "select * from " . $vista;
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $resultados = $stmt->fetchAll(PDO::FETCH_ASSOC);

    ob_clean();
    echo json_encode(['success' => true, 'data' => $resultados]);

} catch (PDOException $e) {
    ob_clean();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>x