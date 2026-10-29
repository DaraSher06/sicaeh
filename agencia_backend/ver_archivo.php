<?php
require_once 'conexion.php';

$nombre_pedido = trim((string)($_GET['nombre'] ?? ''));

if ($nombre_pedido === '') {
    http_response_code(400);
    echo 'nombre de archivo no válido';
    exit;
}

$ruta_db = null;

// 1. Buscamos directamente en la tabla documentos por el nombre exacto o similar
$stmt = $pdo->prepare("select ruta_documento, nombre_documento from documentos where nombre_documento = :nombre or ruta_documento like :like_nombre limit 1");
$stmt->execute([
    'nombre' => $nombre_pedido,
    'like_nombre' => '%' . $nombre_pedido . '%'
]);
$fila = $stmt->fetch(PDO::FETCH_ASSOC);

if ($fila && !empty($fila['ruta_documento'])) {
    $ruta_db = $fila['ruta_documento'];
}

// 2. Si no está en documentos, buscamos en la tabla registros por nombre original
if (!$ruta_db) {
    $stmt = $pdo->prepare("select documento_adjunto from registros where nombre_original = :nombre or documento_adjunto like :like_nombre limit 1");
    $stmt->execute([
        'nombre' => $nombre_pedido,
        'like_nombre' => '%' . $nombre_pedido . '%'
    ]);
    $ruta_db = $stmt->fetchColumn();
}

// 3. Si aún no hay ruta en BD, usamos el nombre pedido directamente como archivo físico
$nombre_archivo = $ruta_db ? basename($ruta_db) : basename($nombre_pedido);

$candidatos = [
    __DIR__ . '/uploads/' . $nombre_archivo,
    __DIR__ . '/../uploads/' . $nombre_archivo,
    $_SERVER['DOCUMENT_ROOT'] . '/SICAEH/uploads/' . $nombre_archivo,
    $_SERVER['DOCUMENT_ROOT'] . '/agenda_backend/uploads/' . $nombre_archivo,
    __DIR__ . '/' . ltrim($nombre_pedido, '/'),
    $_SERVER['DOCUMENT_ROOT'] . '/' . ltrim($nombre_pedido, '/')
];

$archivo_encontrado = '';
foreach ($candidatos as $c) {
    if (file_exists($c) && is_file($c)) {
        $archivo_encontrado = $c;
        break;
    }
}

if (empty($archivo_encontrado)) {
    http_response_code(404);
    echo 'archivo no encontrado en disco: ' . htmlspecialchars($nombre_archivo);
    exit;
}

$ext = strtolower(pathinfo($archivo_encontrado, PATHINFO_EXTENSION));
$mimes = [
    'pdf'  => 'application/pdf',
    'jpg'  => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png'  => 'image/png',
    'gif'  => 'image/gif',
    'webp' => 'image/webp',
    'doc'  => 'application/msword',
    'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls'  => 'application/vnd.ms-excel',
    'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

$mime = $mimes[$ext] ?? 'application/octet-stream';
$nombre_descarga = $nombre_pedido;

// Si es imagen, mostramos el visor adaptado con fondo oscuro
if (isset($_GET['vista']) && in_array($ext, ['png', 'jpg', 'jpeg', 'gif', 'webp'])) {
    $url_img = "ver_archivo.php?nombre=" . urlencode($nombre_pedido);
    echo '<!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>' . htmlspecialchars($nombre_descarga) . '</title>
        <style>
            html, body { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #1e1e1e; display: flex; justify-content: center; align-items: center; overflow: hidden; }
            img { max-width: 95%; max-height: 95%; object-fit: contain; box-shadow: 0 4px 15px rgba(0,0,0,0.5); border-radius: 4px; }
        </style>
    </head>
    <body>
        <img src="' . $url_img . '" alt="' . htmlspecialchars($nombre_descarga) . '">
    </body>
    </html>';
    exit;
}

header('content-type: ' . $mime);
header('content-length: ' . filesize($archivo_encontrado));
header('content-disposition: inline; filename="' . str_replace('"', '', $nombre_descarga) . '"');
readfile($archivo_encontrado);
exit;