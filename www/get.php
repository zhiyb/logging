<?php
require 'dbconf.php';
ob_start("ob_gzhandler", 4 * 1024 * 1024);

function error($code, $msg = null) {
    http_response_code($code);
    if ($msg)
        die('ERROR ' . $code . ': ' . $msg);
    die();
}

if (!array_key_exists('h', $_GET))
	error(400, "Hostname not specified");

$hn = $_GET['h'];
if (empty($hn))
    error(400, "Hostname is empty");

if (!array_key_exists('t', $_GET))
	error(400, "Table not specified");

$tbl = $_GET['t'];
if (empty($tbl))
    error(400, "Table is empty");

if (!in_array($tbl, array("cpu", "mem", "temp", "netio", "disk")))
    error(400, "Table is invalid");

$db = new mysqli($dbhost, $dbuser, $dbpw, $dbname);
if ($db->connect_error)
    error(500, "Connection failed: " . $db->connect_error);
$db->set_charset('utf8mb4');

$tslimit = ' AND `ts` > SUBDATE(UTC_TIMESTAMP(), INTERVAL 24 HOUR) ORDER BY ts';

$stmt = $db->prepare('SELECT * FROM `' . $tbl . '` WHERE `hostname` = ?' . $tslimit);
$stmt->bind_param('s', $hn);

if ($tbl == "cpu") {
    $id = null;
    if (array_key_exists('id', $_GET))
        $id = intval($_GET['id']);

    if (is_int($id)) {
        // Special case, details for specific CPU core
        $stmt = $db->prepare('SELECT * FROM `' . $tbl . '` WHERE `hostname` = ? AND `id` = ?' . $tslimit);
        $stmt->bind_param('si', $hn, $id);
    } else {
        // Special case, generic idle percentage for CPU cores
        $stmt = $db->prepare('SELECT `ts`, `id`, `idle` FROM `' . $tbl . '` WHERE `hostname` = ?' . $tslimit);
        $stmt->bind_param('s', $hn);
    }
}

$stmt->execute();
$obj = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

header('Content-Type: text/plain');
echo json_encode($obj);
?>
