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

$tbl = "sensors";

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
$tslimit = ' AND `ts` > SUBDATE(UTC_TIMESTAMP(), INTERVAL 24 HOUR)';

$stmt = $db->prepare('SELECT DISTINCT `type` FROM `' . $tbl . '` WHERE `hostid` = ?' . $tslimit . ' ORDER BY `type`');
$stmt->bind_param('i', $hostid);
$stmt->execute();
$obj = $stmt->get_result()->fetch_all(MYSQLI_NUM);

header('Content-Type: text/plain');
$types = array();
foreach ($obj as $val)
    array_push($types, $val[0]);
echo json_encode($types);
?>
