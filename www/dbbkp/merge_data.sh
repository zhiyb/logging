#!/bin/bash -ex
cd "$(dirname "$0")"

php <<"PHP"
<?php
require '../dbconf.php';
//ob_start("ob_gzhandler", 4 * 1024 * 1024);

function error($code, $msg = null) {
    //http_response_code($code);
    if ($msg)
        echo('ERROR ' . $code . ': ' . $msg . "\n");
    if ($code === 200)
        exit(0);
    exit($code - 400);
}

$db = new mysqli($dbhost, $dbuser, $dbpw, $dbname);
if ($db->connect_error)
    error(500, "Connection failed: " . $db->connect_error);
$db->set_charset('utf8mb4');


// Merge tables
function merge_bkp_table($db, $tbl) {
    $ret = $db->query('INSERT INTO `' . $tbl . '` SELECT * FROM `bkp_' . $tbl . '`');
    if ($ret === false)
        error(500, $db->error);
    $ret = $db->query('DROP TABLE `bkp_' . $tbl . '`');
    if ($ret === false)
        error(500, $db->error);
}

$tbls = ['cpu', 'disk', 'mem', 'netio', 'sensors', 'temp'];
foreach ($tbls as $tbl)
    merge_bkp_table($db, $tbl);
?>
PHP
