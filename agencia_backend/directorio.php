<?php
require_once 'auth.php';
sicaeh_requiere_sesion();
ob_start();
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('content-type: application/json; charset=utf-8');

try {
    if (!file_exists('conexion.php')) {
        throw new Exception('el archivo conexion.php no existe en la carpeta agencia_backend');
    }
    
    require_once 'conexion.php';

    if (!isset($pdo) || !($pdo instanceof PDO)) {
        throw new Exception('conexión PDO a base de datos no disponible');
    }

    $rol_usuario = sicaeh_cargo();
    $accion = $_GET['accion'] ?? '';

    // Si intenta realizar acciones de modificación sin el rol adecuado
    if (in_array($accion, ['crear', 'editar', 'eliminar']) && $rol_usuario === 'consulta') {
        echo json_encode(['success' => false, 'mensaje' => 'Acceso no autorizado para este rol.']);
        exit;
    }

    if ($accion === 'filtros') {
        $stmt_sec = $pdo->query("select id_sector, nombre_sector from sector");
        $sectores = $stmt_sec->fetchAll(PDO::FETCH_ASSOC);

        $stmt_inst = $pdo->query("select id_institucion, nombre_institucion from institucion");
        $instituciones = $stmt_inst->fetchAll(PDO::FETCH_ASSOC);

        $stmt_muni = $pdo->query("select id_municipio, nombre_municipio from municipio");
        $municipios = $stmt_muni->fetchAll(PDO::FETCH_ASSOC);

        $stmt_loc = $pdo->query("select id_localidad, id_municipio, nombre_localidad from localidad");
        $localidades = $stmt_loc->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "sectores" => $sectores,
            "instituciones" => $instituciones,
            "municipios" => $municipios,
            "localidades" => $localidades
        ]);
        exit;
    }

    if ($accion === 'listar') {
        $busqueda = trim($_GET['busqueda'] ?? '');
        $id_sector = trim($_GET['id_sector'] ?? '');
        $id_institucion = trim($_GET['id_institucion'] ?? '');

        $sql = "select c.id_contacto, c.nombre_completo, c.cargo, c.telefono_celular, c.telefono_oficina, c.correo_institucional, c.correo_personal, c.ruta_foto_tarjeta, i.nombre_institucion, i.nombre_unidad_administrativa, i.domicilio, s.nombre_sector 
                from contacto c 
                inner join institucion i on c.id_institucion = i.id_institucion 
                inner join sector s on i.id_sector = s.id_sector 
                where 1=1";
        
        $params = [];

        if (!empty($busqueda)) {
            $sql .= " and (c.nombre_completo like :busq or c.cargo like :busq or c.correo_institucional like :busq or i.nombre_institucion like :busq or i.nombre_unidad_administrativa like :busq)";
            $params['busq'] = "%" . $busqueda . "%";
        }

        if (!empty($id_sector)) {
            $sql .= " and s.id_sector = :sec";
            $params['sec'] = $id_sector;
        }

        if (!empty($id_institucion)) {
            $sql .= " and i.id_institucion = :inst";
            $params['inst'] = $id_institucion;
        }

        $sql .= " order by c.nombre_completo asc";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $datos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        ob_clean();
        echo json_encode(['success' => true, 'datos' => $datos, 'rol_actual' => $rol_usuario]);
        exit;
    }

    if ($accion === 'detalle') {
        $id_contacto = $_GET['id'] ?? null;

        if (!$id_contacto) {
            echo json_encode(["success" => false, "error" => "id no proporcionado"]);
            exit;
        }

        $sql = "select c.*, i.nombre_institucion, i.nombre_unidad_administrativa, i.domicilio, i.localidad, s.nombre_sector, m.nombre_municipio 
                from contacto c 
                inner join institucion i on c.id_institucion = i.id_institucion 
                inner join sector s on i.id_sector = s.id_sector 
                left join municipio m on i.id_municipio = m.id_municipio 
                where c.id_contacto = ?";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id_contacto]);
        $contacto = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($contacto) {
            echo json_encode(["success" => true, "contacto" => $contacto]);
        } else {
            echo json_encode(["success" => false, "error" => "contacto no encontrado"]);
        }
        exit;
    }

    ob_clean();
    echo json_encode(['success' => false, 'error' => 'acción no válida']);
    exit;

} catch (Throwable $e) {
    ob_clean();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    exit;
}
?>