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

if (!in_array($tbl, array("cpu", "mem", "temp", "netio", "disk", "sensors")))
    error(400, "Table is invalid");

$db = new mysqli($dbhost, $dbuser, $dbpw, $dbname);
if ($db->connect_error)
    error(500, "Connection failed: " . $db->connect_error);
$db->set_charset('utf8mb4');


// Find hostid
$stmt = $db->prepare('SELECT `hostid` FROM `hosts` WHERE `hostname` = ?');
if ($stmt === false)
    error(500, $db->error);
$stmt->bind_param('s', $hn);
if ($stmt->execute() !== true)
    error(500, $stmt->error);

$obj = $stmt->get_result()->fetch_row();
if ($obj === false)
    error(500, $stmt->error);
if ($obj === null)
    error(500, "No host record");

$hostid = $obj[0];


// Find records
$tslimit = ' AND `ts` > SUBDATE(UTC_TIMESTAMP(), INTERVAL 24 HOUR) ORDER BY ts';

$stmt = $db->prepare('SELECT * FROM `' . $tbl . '` WHERE `hostid` = ?' . $tslimit);
$stmt->bind_param('i', $hostid);

if ($tbl == "cpu") {
    $id = null;
    if (array_key_exists('id', $_GET))
        $id = intval($_GET['id']);

    if (is_int($id)) {
        // Special case, details for specific CPU core
        $stmt = $db->prepare('SELECT * FROM `' . $tbl . '` WHERE `hostid` = ? AND `id` = ?' . $tslimit);
        $stmt->bind_param('ii', $hostid, $id);
    } else {
        // Special case, generic idle percentage for CPU cores
        $stmt = $db->prepare('SELECT `ts`, `id`, IFNULL(`iowait`, 0) + `idle` AS `idle` FROM `' . $tbl . '` WHERE `hostid` = ?' . $tslimit);
        $stmt->bind_param('i', $hostid);
    }

} else if ($tbl == "disk") {
    $disk = null;
    if (array_key_exists('disk', $_GET))
        $disk = $_GET['disk'];

    if ($disk) {
        // Special case, details for specific disk
        $stmt = $db->prepare('SELECT * FROM `' . $tbl . '` WHERE `hostid` = ? AND `disk` = ?' . $tslimit);
        $stmt->bind_param('is', $hostid, $disk);
    }

} else if ($tbl == "netio") {
    $nic = null;
    if (array_key_exists('nic', $_GET))
        $nic = $_GET['nic'];

    if ($nic) {
        // Special case, details for specific nic
        $stmt = $db->prepare('SELECT * FROM `' . $tbl . '` WHERE `hostid` = ? AND `nic` = ?' . $tslimit);
        $stmt->bind_param('is', $hostid, $nic);
    }

} else if ($tbl == "sensors") {
    $type = null;
    if (array_key_exists('type', $_GET))
        $type = $_GET['type'];
    $sensor = null;
    if (array_key_exists('s', $_GET))
        $sensor = $_GET['s'];

    if ($type) {
        if ($sensor) {
            // Special case, details for specific sensor
            $stmt = $db->prepare('SELECT * FROM `' . $tbl . '` WHERE `hostid` = ? AND `type` = ? AND `sensor` = ?' . $tslimit);
            $stmt->bind_param('iss', $hostid, $type, $sensor);
        } else {
            // Special case, details for specific sensor type
            $stmt = $db->prepare('SELECT * FROM `' . $tbl . '` WHERE `hostid` = ? AND `type` = ?' . $tslimit);
            $stmt->bind_param('is', $hostid, $type);
        }
    }
}

$stmt->execute();
$obj = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

header('Content-Type: text/plain');
echo json_encode($obj);
?>
