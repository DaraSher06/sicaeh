<?php
ini_set('display_errors', 0);
error_reporting(0);
require_once 'auth.php';
sicaeh_requiere_roles(['administrador', 'supervisor', 'capturista']);
header('content-type: application/json; charset=utf-8');
require_once 'conexion.php';

try {
    if (!isset($pdo)) {
        throw new exception('conexión a base de datos no disponible');
    }

    $id_registro = $_POST['id_registro'] ?? null;
    if (!$id_registro || !isset($_FILES['archivo_seguimiento'])) {
        echo json_encode(['success' => false, 'error' => 'datos incompletos']);
        exit;
    }

    $file = $_FILES['archivo_seguimiento'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(['success' => false, 'error' => 'error al subir archivo código: ' . $file['error']]);
        exit;
    }

    $upload_dir = '../uploads/';
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0755, true);
    }

    $nombre_original = basename($file['name']);
    $extension = strtolower(pathinfo($nombre_original, PATHINFO_EXTENSION));
    $permitidas = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'];
    if (!in_array($extension, $permitidas, true)) {
        echo json_encode(['success' => false, 'error' => 'tipo de archivo no permitido']);
        exit;
    }
    $nombre_unico = uniqid('doc_') . '_' . preg_replace('/[^a-zA-Z0-9.-]/', '_', $nombre_original);
    $ruta_destino = $upload_dir . $nombre_unico;
    $ruta_db = 'uploads/' . $nombre_unico;

    if (move_uploaded_file($file['tmp_name'], $ruta_destino)) {
        $pdo->begintransaction();

        $exp_stmt = $pdo->prepare("select id_expediente from expediente where id_registro = :id limit 1");
        $exp_stmt->execute(['id' => $id_registro]);
        $exp_info = $exp_stmt->fetch(pdo::FETCH_ASSOC);
        $id_expediente = $exp_info['id_expediente'] ?? null;

        $upd_act = $pdo->prepare("update documentos set activo = 0 where id_registro = :id and nombre_documento = :nd");
        $upd_act->execute(['id' => $id_registro, 'nd' => $nombre_original]);

        $sql = "insert into documentos 
                (id_expediente, id_registro, nombre_documento, tipo_documento, ruta_documento, fecha_subida, id_usuario, version, activo) 
                values 
                (:exp, :reg, :nom, :tipo, :ruta, now(), :usr, 1, 1)";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'exp'  => $id_expediente,
            'reg'  => $id_registro,
            'nom'  => $nombre_original,
            'tipo' => $extension,
            'ruta' => $ruta_db,
            'usr'  => sicaeh_id_usuario()
        ]);

        $pdo->commit();
        echo json_encode(['success' => true, 'ruta' => $ruta_db, 'nombre' => $nombre_original]);
    } else {
        echo json_encode(['success' => false, 'error' => 'no se pudo mover el archivo']);
    }
} catch (pdoexception $e) {
    if (isset($pdo) && $pdo->intransaction()) {
        $pdo->rollback();
    }
    echo json_encode(['success' => false, 'error' => 'pdo: ' . $e->getMessage()]);
} catch (exception $e) {
    if (isset($pdo) && $pdo->intransaction()) {
        $pdo->rollback();
    }
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}