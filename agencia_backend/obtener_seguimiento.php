<?php
require_once 'auth.php';
sicaeh_requiere_sesion();
ob_start();
header('content-type: application/json; charset=utf-8');
include 'conexion.php';

$id_usuario_actual = sicaeh_id_usuario();

// DIAGNÓSTICO TEMPORAL: Si el id de usuario está vacío, devuélvelo para verlo en consola
if (empty($id_usuario_actual)) {
    ob_clean();
    echo json_encode([
        'success' => false,
        'error' => 'El usuario no tiene una sesión activa válida o sicaeh_id_usuario() está vacío.',
        'sesion' => $_SESSION ?? 'sin sesión'
    ]);
    exit;
}

$filtro = isset($_GET['filtro']) ? $_GET['filtro'] : 'todos';
$busqueda = isset($_GET['busqueda']) ? trim($_GET['busqueda']) : '';
$pagina = isset($_GET['pagina']) ? max(1, (int)$_GET['pagina']) : 1;
$por_pagina = 10;
$inicio = ($pagina - 1) * $por_pagina;

try {
    $condiciones = ["id_usuario_asignado = :id_usuario"];
    $params = ['id_usuario' => $id_usuario_actual];

    if ($filtro !== 'todos') {
        $condiciones[] = "estatus_oficio = :filtro";
        $params['filtro'] = $filtro;
    }

    if (!empty($busqueda)) {
        $condiciones[] = "(num_oficio like :busqueda or numero_turno_aeeh like :busqueda or num_consecutivo like :busqueda)";
        $params['busqueda'] = "%" . $busqueda . "%";
    }

    $where = " where " . implode(" and ", $condiciones);

    $sql_total = "select count(*) as total from v_lista_seguimiento" . $where;
    $stmt_total = $pdo->prepare($sql_total);
    $stmt_total->execute($params);
    $total_registros = $stmt_total->fetch(PDO::FETCH_ASSOC)['total'];
    $total_paginas = max(1, ceil($total_registros / $por_pagina));

    $sql = "select * from v_lista_seguimiento" . $where . " order by id_registro desc limit :inicio, :por_pagina";
    $stmt = $pdo->prepare($sql);
    
    foreach ($params as $key => $value) {
        if ($key === 'id_usuario') {
            $stmt->bindValue(':' . $key, $value, PDO::PARAM_INT);
        } else {
            $stmt->bindValue(':' . $key, $value);
        }
    }
    $stmt->bindValue(':inicio', $inicio, PDO::PARAM_INT);
    $stmt->bindValue(':por_pagina', $por_pagina, PDO::PARAM_INT);
    $stmt->execute();
    
    $solicitudes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    ob_clean();
    echo json_encode([
        'success' => true,
        'solicitudes' => $solicitudes,
        'total_paginas' => $total_paginas,
        'pagina_actual' => $pagina
    ]);
} catch (PDOException $e) {
    ob_clean();
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>