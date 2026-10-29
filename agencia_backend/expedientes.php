<?php
require_once 'auth.php';
sicaeh_requiere_sesion();
ob_start();
error_reporting(0);
ini_set('display_errors', 0);
header('content-type: application/json; charset=utf-8');

try {
    require_once 'conexion.php';
    if (!isset($pdo) || !($pdo instanceof PDO)) {
        throw new Exception('conexión a base de datos no disponible');
    }

    $accion = $_GET['accion'] ?? $_POST['accion'] ?? '';

    switch ($accion) {
            case 'listar':
            // sincronizar automáticamente registros nuevos para que tengan expediente
            $pdo->exec("insert into expediente (id_registro, no_expediente_fisico, fecha_apertura) 
                        select r.id_registro, concat('exp-', r.num_consecutivo), current_date() 
                        from registros r 
                        left join expediente ex on r.id_registro = ex.id_registro 
                        where ex.id_expediente is null");

            $pagina = isset($_GET['pagina']) ? intval($_GET['pagina']) : 1;
            $por_pagina = 10;
            $inicio = ($pagina - 1) * $por_pagina;

            $busqueda = isset($_GET['busqueda']) ? trim($_GET['busqueda']) : '';
            $estatus = isset($_GET['estatus']) ? trim($_GET['estatus']) : 'todos';
            $tipo_solicitud = isset($_GET['tipo_solicitud']) ? trim($_GET['tipo_solicitud']) : '';
            $enviado_a = isset($_GET['enviado_a']) ? trim($_GET['enviado_a']) : '';
            $fecha_limite = isset($_GET['fecha_limite']) ? trim($_GET['fecha_limite']) : '';
            $turnado_a = isset($_GET['turnado_a']) ? trim($_GET['turnado_a']) : '';

            $condiciones = array("1=1");
            $parametros = array();

            if ($busqueda !== '') {
                $condiciones[] = "(numero_oficio like ? or numero_turno_aeeh like ? or numero_consecutivo like ?)";
                $busqueda_param = "%" . $busqueda . "%";
                $parametros[] = $busqueda_param;
                $parametros[] = $busqueda_param;
                $parametros[] = $busqueda_param;
            }

            if ($estatus !== 'todos' && $estatus !== '') {
                $condiciones[] = "estatus_oficio = ?";
                $parametros[] = $estatus;
            }

            if ($tipo_solicitud !== '') {
                $condiciones[] = "tipo_solicitud = ?";
                $parametros[] = $tipo_solicitud;
            }

            if ($enviado_a !== '') {
                $condiciones[] = "enviado_a = ?";
                $parametros[] = $enviado_a;
            }

            if ($fecha_limite !== '') {
                $condiciones[] = "fecha_limite = ?";
                $parametros[] = $fecha_limite;
            }

            if ($turnado_a !== '') {
                $condiciones[] = "turnado_a like ?";
                $parametros[] = "%" . $turnado_a . "%";
            }

            $sql_where = "where " . implode(" and ", $condiciones);

            // Obtenemos el total real respetando el agrupamiento de la vista
            $sql_total = "select count(*) as total from (select id_expediente from v_lista_expedientes " . $sql_where . " group by id_expediente) as t_total";
            $stmt_total = $pdo->prepare($sql_total);
            $stmt_total->execute($parametros);
            $total_registros = $stmt_total->fetch(PDO::FETCH_ASSOC)['total'] ?? 0;
            $total_paginas = $por_pagina > 0 ? ceil($total_registros / $por_pagina) : 1;

            // Aseguramos que la consulta de datos devuelva exactamente los bloques de 10
            $sql_datos = "select * from v_lista_expedientes " . $sql_where . " group by id_expediente order by fecha_captura desc limit " . (int)$inicio . ", " . (int)$por_pagina;
            $stmt_datos = $pdo->prepare($sql_datos);
            $stmt_datos->execute($parametros);
            $datos = $stmt_datos->fetchAll(PDO::FETCH_ASSOC);

            ob_clean();
            echo json_encode(array(
                "success" => true,
                "datos" => $datos,
                "total_paginas" => $total_paginas,
                "pagina_actual" => $pagina
            ));
            break;
            
            case 'filtros_selects':
            $stmt_tipos = $pdo->query("select distinct nombre_tipo from tipo_solicitud where activo = 1 order by nombre_tipo asc");
            $tipos_sol = $stmt_tipos->fetchAll(PDO::FETCH_COLUMN);

            $stmt_enviados = $pdo->query("select distinct tipo_entidad from entidad_turno where tipo_entidad is not null and tipo_entidad != '' order by tipo_entidad asc");
            $enviados = $stmt_enviados->fetchAll(PDO::FETCH_COLUMN);

            $stmt_turnados = $pdo->query("select distinct concat(nombre, ' ', apellido_paterno, ' ', coalesce(apellido_materno, '')) as nombre_completo from usuario order by nombre asc");
            $turnados = $stmt_turnados->fetchAll(PDO::FETCH_COLUMN);

            ob_clean();
            echo json_encode(array(
                "success" => true,
                "tipos_solicitud" => $tipos_sol,
                "enviado_a" => $enviados,
                "turnado_a" => $turnados
            ));
            break;

        default:
            ob_clean();
            echo json_encode(array("success" => false, "mensaje" => "acción no reconocida"));
            break;
    }
} catch (Throwable $e) {
    ob_clean();
    echo json_encode(array("success" => false, "mensaje" => $e->getMessage()));
}
?>