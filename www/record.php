<?php
require 'dbconf.php';
//ob_start("ob_gzhandler", 4 * 1024 * 1024);

function error($code, $msg = null) {
    http_response_code($code);
    if ($msg)
        die(json_encode(["code" => $code, "msg" => $msg]));
    die(json_encode(["code" => $code]));
}

if ($_SERVER["REQUEST_METHOD"] != "POST")
    error(400, "Invalid method");


// Verbose
$v = 0;
if (array_key_exists('v', $_GET))
    $v = $_GET['v'];


// Database connection
$db = new mysqli($dbhost, $dbuser, $dbpw, $dbname);
if ($db->connect_error)
    error(500, "Connection failed: " . $db->connect_error);
$db->set_charset('utf8mb4');


// Find hostid
$hostid = null;
if (array_key_exists('h', $_GET)) {
    // Legacy hostname specified
    $hn = $_GET['h'];
    if (empty($hn))
        error(400, "Invalid hostname");

    /*
    $stmt = $db->prepare('INSERT IGNORE INTO `hosts` (`hostname`, `hostuuid`, `clientuuid`) VALUES (?, UUID(), UUID())');
    if ($stmt === false)
        error(500, $db->error);
    $stmt->bind_param('s', $hn);
    if ($stmt->execute() !== true)
        error(500, $stmt->error);
    */

    $stmt = $db->prepare('SELECT `hostid` FROM `hosts` WHERE `hostname` = ? AND `migerated` = false');
    $stmt->bind_param('s', $hn);

} else if (array_key_exists('huid', $_GET)) {
    // Host UUID specified
    $huid = $_GET['huid'];
    if (empty($huid))
        error(400, "Invalid host UUID");

    $stmt = $db->prepare('SELECT `hostid` FROM `hosts` WHERE `hostuuid` = ?');
    $stmt->bind_param('s', $huid);

} else {
    error(400, "Invalid host");
}

if ($stmt->execute() !== true)
error(500, $stmt->error);

$obj = $stmt->get_result()->fetch_row();
if ($obj === false)
error(500, $stmt->error);
if ($obj === null)
error(500, "No host record");

$hostid = $obj[0];


// Process JSON input data
$obj = json_decode(file_get_contents("php://input"), true);
if ($obj == null)
    error(400, "Invalid data");

if (array_key_exists('ts', $obj)) {
    $dt = DateTime::createFromFormat("Y-m-d H:i:s", $obj['ts'], new DateTimeZone("UTC"));
    if (!$dt)
        error(400, "Invalid timestamp");
    $ts = $dt->format("Y-m-d H:i:s");
} else {
    $dt = new DateTime("now", new DateTimeZone("UTC"));
    $ts = $dt->format("Y-m-d H:i:s");
}

function db_insert($db, $tbl, $ts, $hostid, $cols, $types, $vals) {
    $scols = "";
    foreach ($cols as $c)
        $scols .= ",`" . $c . "`";
    $pars = str_repeat(",?", count($cols));
    $stmt = $db->prepare('INSERT INTO ' . $tbl . ' (ts,hostid' . $scols . ') VALUES (?,?' . $pars . ')');
    if ($stmt === false)
        return ["code" => 500, "msg" => $db->error];
    $stmt->bind_param('si' . $types, $ts, $hostid, ...$vals);
    if ($stmt->execute() !== true)
        return ["code" => 500, "msg" => $stmt->error];
    return ["code" => 200, "msg" => "OK"];
}

$validate = [
    "cpu" => ["id", "user", "system", "idle", "nice", "iowait", "irq", "softirq", "steal", "guest", "guest_nice"],
    "mem" => ["total", "available", "percent", "used", "free", "active", "inactive", "buffers", "cached", "shared", "slab", "zfs_arc"],
    "temp" => ["sensor", "label", "temp"],
    "netio" => ["nic", "interval", "bytes_sent", "bytes_recv", "packets_sent", "packets_recv"],
    "disk" => ["disk", "interval", "write_bytes", "read_bytes", "write_time", "read_time"],
    "sensors" => ["type", "sensor", "data"],
];

$ret = [];
foreach ($obj['tables'] as $tbl => $rows) {
    if (!array_key_exists($tbl, $validate)) {
        $ret[] = ["table" => $tbl, "code" => 400, "msg" => "Invalid table"];
        continue;
    }
    $vcols = $validate[$tbl];
    $rowret = [];
    $errmax = 0;
    foreach ($rows as $row) {
        $cols = [];
        $types = "";
        $vals = [];
        foreach ($row as $col => $val) {
            if (!in_array($col, $vcols))
                continue;
            $cols[] = $col;
            $vals[] = $val;
            if (is_string($val))
                $types .= "s";
            else if (is_int($val))
                $types .= "i";
            else if (is_float($val) || is_double($val))
                $types .= "d";
            else
                $types .= "?";
        }
        $r = db_insert($db, $tbl, $ts, $hostid, $cols, $types, $vals);
        $rowret[] = $r;
        if ($r["code"] > $rowret[$errmax]["code"])
            $errmax = count($rowret) - 1;
    }
    if (empty($rowret))
        $ret[] = ["table" => $tbl, "code" => 200, "msg" => "Empty"];
    else
        $ret[] = ["table" => $tbl, "code" => $rowret[$errmax]["code"], "msg" => $rowret[$errmax]["msg"], "rows" => $rowret];
}

$code = empty($ret) ? 200 : 0;
$msg = "Empty";
foreach ($ret as $r) {
    if ($r["code"] > $code) {
        $code = $r["code"];
        $msg = $r["msg"];
    }
}

if ($v)
    echo json_encode(["code" => $code, "msg" => $msg, "tables" => $ret]);
else
    echo json_encode(["code" => $code]);
?>
