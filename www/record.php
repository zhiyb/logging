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

if (!array_key_exists('h', $_GET))
    error(400, "Invalid hostname");

$hn = $_GET['h'];
if (empty($hn))
    error(400, "Invalid hostname");

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



$db = new mysqli($dbhost, $dbuser, $dbpw, $dbname);
if ($db->connect_error)
    error(500, "Connection failed: " . $db->connect_error);
$db->set_charset('utf8mb4');

function db_insert($db, $tbl, $ts, $hn, $cols, $types, $vals) {
    $scols = "";
    foreach ($cols as $c)
        $scols .= "," . $c;
    $pars = str_repeat(",?", count($cols));
    $sql  = 'INSERT INTO ' . $tbl . ' (ts,hostname' . $scols . ') VALUES (?,?' . $pars . ')';
    var_dump($sql);
    $stmt = $db->prepare($sql);
    $stmt->bind_param('ss' . $types, $ts, $hn, ...$vals);
    if ($stmt->execute() !== true)
        return ["code" => 500, "msg" => $stmt->error];
    return ["code" => 200, "msg" => "OK"];
}

$validate = [
    "cpu" => ["id", "user", "system", "idle", "nice", "iowait", "irq", "softirq", "steal", "guest", "guest_nice"],
    "mem" => ["total", "available", "percent", "used", "free", "active", "inactive", "buffers", "cached", "shared", "slab", "zfs_arc"],
    "temp" => ["sensor", "label", "temp"],
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
            else
                $types .= "i";
        }
        $r = db_insert($db, $tbl, $ts, $hn, $cols, $types, $vals);
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

echo json_encode(["code" => $code, "msg" => $msg, "tables" => $ret]);

//var_dump($obj, $ts, $hn);
die();

$hn = "zhiyb-Linux";

$stmt = $db->prepare('SELECT * FROM ' . $tbl . ' WHERE hostname = ? AND `ts` > SUBDATE(UTC_TIMESTAMP(), INTERVAL 6 HOUR) ORDER BY ts DESC');
$stmt->bind_param('s', $hn);
$stmt->execute();
$obj = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

header('Content-Type: text/plain');
echo json_encode($obj);
?>
