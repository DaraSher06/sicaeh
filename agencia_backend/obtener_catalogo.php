<?php
require_once 'auth.php';
sicaeh_requiere_sesion();
if (ob_get_length()) ob_clean();
header('content-type: application/json; charset=utf-8');

include 'conexion.php';

$catalogo = $_GET['catalogo'] ?? '';

try {
    switch ($catalogo) {
        case 'remitente':
            $stmt = $pdo->query("select id_remitente as id, nombre_remitente as nombre from remitente order by nombre_remitente asc");
            break;
        case 'tipo_solicitud':
            $stmt = $pdo->query("select id_tipo_sol as id, nombre_tipo as nombre from tipo_solicitud where activo = true order by nombre_tipo asc");
            break;
        case 'edo':
            $stmt = $pdo->query("select id_edo as id, nombre_edo as nombre from edo order by nombre_edo asc");
            break;
        case 'municipio':
            $id_edo = $_GET['id_edo'] ?? null;
            if ($id_edo) {
                $stmt = $pdo->prepare("select id_municipio as id, nombre_municipio as nombre from municipio where id_edo = :id_edo order by nombre_municipio asc");
                $stmt->execute(['id_edo' => $id_edo]);
            } else {
                $stmt = $pdo->query("select id_municipio as id, nombre_municipio as nombre from municipio order by nombre_municipio asc");
            }
            break;
        case 'localidad':
            $id_municipio = $_GET['id_municipio'] ?? null;
            if ($id_municipio) {
                $stmt = $pdo->prepare("select id_localidad as id, nombre_localidad as nombre from localidad where id_municipio = :id_municipio order by nombre_localidad asc");
                $stmt->execute(['id_municipio' => $id_municipio]);
            } else {
                $stmt = $pdo->query("select id_localidad as id, nombre_localidad as nombre from localidad order by nombre_localidad asc");
            }
            break;
        case 'usuario':
            // corregido para usar apellido_paterno y apellido_materno en lugar de la columna apellidos
            $stmt = $pdo->query("select id_usuario as id, concat(nombre, ' ', apellido_paterno, ' ', coalesce(apellido_materno, '')) as nombre from usuario where activo = true order by nombre asc");
            break;
        default:
            echo json_encode(['success' => false, 'error' => 'catalogo no valido']);
            exit;
    }

    $datos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'data' => $datos]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>