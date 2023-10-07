<?php
require 'dbconf.php';
ob_start("ob_gzhandler", 4 * 1024 * 1024);

function error($code, $msg = null) {
    http_response_code($code);
    if ($msg)
        die('ERROR ' . $code . ': ' . $msg);
    die();
}

if (!array_key_exists('key', $_GET))
    $key = "guest";
else
    $key = $_GET['key'];

if (empty($key))
    error(400, "Key is empty");

$db = new mysqli($dbhost, $dbuser, $dbpw, $dbname);
if ($db->connect_error)
    error(500, "Connection failed: " . $db->connect_error);
$db->set_charset('utf8mb4');

$stmt = $db->prepare(
    'SELECT `type`, `hosts`.`hostname`, `hosts`.`clientuuid`, `ts` FROM `clients`
    LEFT JOIN `hosts`
    ON `clients`.`hostname` = `hosts`.`hostname`
    WHERE `clients`.`key` = ?
    ORDER BY `type`, `hostname`');
$stmt->bind_param('s', $key);
$stmt->execute();
$obj = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

header('Content-Type: text/plain');
echo json_encode($obj);
?>
