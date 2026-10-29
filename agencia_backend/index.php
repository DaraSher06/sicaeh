<?php
ob_start();
header("content-type: application/json; charset=utf-8");

require_once 'auth.php';
include 'conexion.php';

$accion = $_GET['accion'] ?? '';

if ($accion === 'login' && strtoupper($_SERVER['REQUEST_METHOD']) === 'POST') {
    $datos = json_decode(file_get_contents('php://input'), true);
    
    $usuario_ingresado = isset($datos['usuario']) && is_string($datos['usuario']) ? trim($datos['usuario']) : '';
    $password = isset($datos['password']) && is_string($datos['password']) ? trim($datos['password']) : '';

    try {
        $sql = "select id_usuario, nombre, nombre_usuario, contrasena, cargo, activo from usuario where nombre_usuario = :usuario";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['usuario' => $usuario_ingresado]);
        $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$usuario || !password_verify($password, $usuario['contrasena'])) {
            ob_clean();
            echo json_encode(['exito' => false, 'error' => 'usuario o contraseña incorrectos']);
        } elseif (isset($usuario['activo']) && $usuario['activo'] !== null && intval($usuario['activo']) === 0) {
            ob_clean();
            echo json_encode(['exito' => false, 'error' => 'la cuenta está desactivada']);
        } else {
            $sql_update = "update usuario set ultima_actividad = now() where id_usuario = ?";
            $stmt_update = $pdo->prepare($sql_update);
            $stmt_update->execute([$usuario['id_usuario']]);

            $cargo = sicaeh_normalizar_cargo($usuario['cargo'] ?? 'consulta');
            $_SESSION['id_usuario'] = $usuario['id_usuario'];
            $_SESSION['usuario_id'] = $usuario['id_usuario'];
            $_SESSION['usuario_nombre'] = $usuario['nombre'];
            $_SESSION['usuario_cargo'] = $cargo;
            $_SESSION['rol'] = $cargo;
            
            ob_clean();
            echo json_encode(['exito' => true, 'nombre' => $usuario['nombre'], 'cargo' => $cargo]);
        }
    } catch (PDOException $e) {
        ob_clean();
        echo json_encode(['exito' => false, 'error' => 'error de conexión con la base de datos: ' . $e->getMessage()]);
    }
    exit;
}

if ($accion === 'sesion') {
    if (!isset($_SESSION['id_usuario'])) {
        ob_clean();
        echo json_encode(['exito' => false]);
    } else {
        $nombre_bruto = $_SESSION['usuario_nombre'] ?? 'usuario';
        $nombre = ucwords(strtolower($nombre_bruto));
        
        $ubicacion = $_SESSION['usuario_ubicacion'] ?? 'hidalgo, méxico';
        $cargo = sicaeh_cargo();

        $palabras = preg_split('/\s+/', trim($nombre));
        $iniciales = strtoupper(mb_substr($palabras[0], 0, 1));
        if (count($palabras) > 1) {
            $iniciales .= strtoupper(mb_substr(end($palabras), 0, 1));
        }

        ob_clean();
        echo json_encode([
            'exito' => true,
            'nombre' => $nombre,
            'ubicacion' => $ubicacion,
            'iniciales' => $iniciales,
            'cargo' => $cargo
        ]);
    }
    exit;
}

ob_clean();
echo json_encode(['error' => 'acción no válida']);
?>