#!/bin/bash -e
cd "$(dirname "$0")"

eval $(php <<"PHP"
<?php
require '../dbconf.php';
echo('dbuser="' . $dbuser . "\"\n");
echo('dbpw="' . $dbpw . "\"\n");
echo('dbhost="' . $dbhost . "\"\n");
echo('dbname="' . $dbname . "\"\n");
?>
PHP
)

gunzip -c | mysql -u "$dbuser" --password="$dbpw" -h "$dbhost" -D "$dbname"
