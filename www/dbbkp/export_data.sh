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


// Create tables if not exists
function create_bkp_table($db, $sql) {
    $ret = $db->query($sql);
    if ($ret === false)
        error(500, $db->error);
}

create_bkp_table($db, 'CREATE TABLE IF NOT EXISTS `bkp_cpu` (
  `ts` datetime NOT NULL DEFAULT current_timestamp(),
  `hostid` int(10) unsigned NOT NULL DEFAULT 0,
  `id` int(11) NOT NULL,
  `user` float DEFAULT NULL,
  `system` float DEFAULT NULL,
  `idle` float DEFAULT NULL,
  `nice` float DEFAULT NULL,
  `iowait` float DEFAULT NULL,
  `irq` float DEFAULT NULL,
  `softirq` float DEFAULT NULL,
  `steal` float DEFAULT NULL,
  `guest` float DEFAULT NULL,
  `guest_nice` float DEFAULT NULL
) DEFAULT CHARSET=utf8mb4;');

create_bkp_table($db, 'CREATE TABLE IF NOT EXISTS `bkp_disk` (
  `ts` datetime NOT NULL DEFAULT current_timestamp(),
  `hostid` int(10) unsigned NOT NULL DEFAULT 0,
  `disk` tinytext NOT NULL,
  `interval` float unsigned DEFAULT NULL,
  `write_bytes` bigint(20) unsigned DEFAULT NULL,
  `read_bytes` bigint(20) unsigned DEFAULT NULL,
  `write_time` bigint(20) unsigned DEFAULT NULL,
  `read_time` bigint(20) unsigned DEFAULT NULL
) DEFAULT CHARSET=utf8mb4;');

create_bkp_table($db, 'CREATE TABLE IF NOT EXISTS `bkp_mem` (
  `ts` datetime NOT NULL DEFAULT current_timestamp(),
  `hostid` int(10) unsigned NOT NULL DEFAULT 0,
  `total` bigint(20) unsigned DEFAULT NULL,
  `available` bigint(20) unsigned DEFAULT NULL,
  `percent` float DEFAULT NULL,
  `used` bigint(20) unsigned DEFAULT NULL,
  `free` bigint(20) unsigned DEFAULT NULL,
  `active` bigint(20) unsigned DEFAULT NULL,
  `inactive` bigint(20) unsigned DEFAULT NULL,
  `buffers` bigint(20) unsigned DEFAULT NULL,
  `cached` bigint(20) unsigned DEFAULT NULL,
  `shared` bigint(20) unsigned DEFAULT NULL,
  `slab` bigint(20) unsigned DEFAULT NULL,
  `zfs_arc` bigint(20) unsigned DEFAULT NULL
) DEFAULT CHARSET=utf8mb4;');

create_bkp_table($db, 'CREATE TABLE IF NOT EXISTS `bkp_netio` (
  `ts` datetime NOT NULL DEFAULT current_timestamp(),
  `hostid` int(10) unsigned NOT NULL DEFAULT 0,
  `nic` tinytext NOT NULL,
  `interval` float unsigned DEFAULT NULL,
  `bytes_sent` bigint(20) unsigned DEFAULT NULL,
  `bytes_recv` bigint(20) unsigned DEFAULT NULL,
  `packets_sent` bigint(20) unsigned DEFAULT NULL,
  `packets_recv` bigint(20) unsigned DEFAULT NULL
) DEFAULT CHARSET=utf8mb4;');

create_bkp_table($db, 'CREATE TABLE IF NOT EXISTS `bkp_sensors` (
  `ts` datetime NOT NULL DEFAULT current_timestamp(),
  `hostid` int(10) unsigned NOT NULL DEFAULT 0,
  `type` tinytext NOT NULL,
  `sensor` tinytext NOT NULL,
  `data` blob DEFAULT NULL
) DEFAULT CHARSET=utf8mb4;');

create_bkp_table($db, 'CREATE TABLE IF NOT EXISTS `bkp_temp` (
  `ts` datetime NOT NULL DEFAULT current_timestamp(),
  `hostid` int(10) unsigned NOT NULL DEFAULT 0,
  `sensor` tinytext NOT NULL,
  `label` tinytext NOT NULL,
  `temp` float DEFAULT NULL
) DEFAULT CHARSET=utf8mb4;');


// Move old data to backup table
$dt = new DateTime("now", new DateTimeZone("UTC"));
$ts = $dt->sub(new DateInterval('P2D'))->format("Y-m-d H:i:s");
$tslimit = '`ts` < "' . $ts . '"';

function move_data($db, $tbl, $tslimit) {
    $db->begin_transaction();
    $ret = $db->query('INSERT INTO `bkp_' . $tbl . '` SELECT * FROM `' . $tbl . '` WHERE ' . $tslimit);
    if ($ret === false) {
        $db->rollback();
        error(500, $db->error);
    }
    $ret = $db->query('DELETE FROM `' . $tbl . '` WHERE ' . $tslimit);
    if ($ret === false) {
        $db->rollback();
        error(500, $db->error);
    }
    //$db->rollback();
    $db->commit();
}

$tbls = ['cpu', 'disk', 'mem', 'netio', 'sensors', 'temp'];
//$tbls = ['mem', 'sensors'];
$bkps = '';
foreach ($tbls as $tbl) {
    move_data($db, $tbl, $tslimit);
    $bkps = $bkps . 'bkp_' . $tbl . ' ';
}


// Dump tables
passthru('mysqldump --skip-lock-tables ' .
    '-u ' . $dbuser . ' -p"' . $dbpw . '" -h ' . $dbhost . ' ' . $dbname . ' ' .
    $bkps . ' | gzip -c');
?>
PHP
