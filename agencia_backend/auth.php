<?php
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '', // vacío para que tome el localhost actual de forma nativa
        'secure' => false,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

function sicaeh_normalizar_cargo($cargo) {
    $cargo = strtolower(trim((string)$cargo));
    if ($cargo === 'admin') {
        return 'administrador';
    }
    if ($cargo === 'captura') {
        return 'capturista';
    }
    $permitidos = ['administrador', 'supervisor', 'capturista', 'consulta'];
    return in_array($cargo, $permitidos, true) ? $cargo : 'consulta';
}

function sicaeh_cargo() {
    $bruto = $_SESSION['usuario_cargo'] ?? $_SESSION['rol'] ?? $_SESSION['nombre_rol'] ?? '';
    return sicaeh_normalizar_cargo($bruto);
}

function sicaeh_id_usuario() {
    if (!empty($_SESSION['id_usuario'])) {
        return intval($_SESSION['id_usuario']);
    }
    if (!empty($_SESSION['usuario_id'])) {
        return intval($_SESSION['usuario_id']);
    }
    return 0;
}

function sicaeh_es_elevado() {
    return in_array(sicaeh_cargo(), ['administrador', 'supervisor', 'capturista'], true);
}

function sicaeh_es_gestion() {
    return in_array(sicaeh_cargo(), ['administrador', 'supervisor'], true);
}

function sicaeh_responder_error($codigo, $mensaje) {
    if (!headers_sent()) {
        http_response_code($codigo);
        header('content-type: application/json; charset=utf-8');
    }
    echo json_encode([
        'success' => false,
        'exito' => false,
        'error' => $mensaje
    ]);
    exit;
}

function sicaeh_requiere_sesion() {
    if (sicaeh_id_usuario() <= 0) {
        sicaeh_responder_error(401, 'sesión no válida');
    }
}

function sicaeh_requiere_roles($roles) {
    sicaeh_requiere_sesion();
    $normalizados = [];
    foreach ((array)$roles as $rol) {
        $normalizados[] = sicaeh_normalizar_cargo($rol);
    }
    if (!in_array(sicaeh_cargo(), $normalizados, true)) {
        sicaeh_responder_error(403, 'acceso no autorizado');
    }
}