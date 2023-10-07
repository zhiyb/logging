-- Adminer 4.8.1 MySQL 5.5.5-10.5.12-MariaDB-0+deb11u1 dump

SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;

USE `logging`;

SET NAMES utf8mb4;

CREATE TABLE `clients` (
  `key` tinytext NOT NULL,
  `hostname` tinytext NOT NULL,
  UNIQUE KEY `key_hostname` (`key`,`hostname`) USING HASH
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE `cpu` (
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
  `guest_nice` float DEFAULT NULL,
  KEY `hostid_ts` (`hostid`,`ts`),
  KEY `hostid_id_ts` (`hostid`,`id`,`ts`),
  CONSTRAINT `cpu_ibfk_1` FOREIGN KEY (`hostid`) REFERENCES `hosts` (`hostid`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE `disk` (
  `ts` datetime NOT NULL DEFAULT current_timestamp(),
  `hostid` int(10) unsigned NOT NULL DEFAULT 0,
  `disk` tinytext NOT NULL,
  `interval` float unsigned DEFAULT NULL,
  `write_bytes` bigint(20) unsigned DEFAULT NULL,
  `read_bytes` bigint(20) unsigned DEFAULT NULL,
  `write_time` bigint(20) unsigned DEFAULT NULL,
  `read_time` bigint(20) unsigned DEFAULT NULL,
  KEY `hostid_ts` (`hostid`,`ts`),
  KEY `hostid_disk_ts` (`hostid`,`disk`(255),`ts`),
  CONSTRAINT `disk_ibfk_1` FOREIGN KEY (`hostid`) REFERENCES `hosts` (`hostid`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE `hosts` (
  `hostid` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `hostname` tinytext NOT NULL,
  `type` tinytext NOT NULL DEFAULT 'sensors',
  `hostuuid` tinytext NOT NULL,
  `clientuuid` tinytext NOT NULL,
  `migerated` bit(1) NOT NULL DEFAULT b'1',
  `ts` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`hostid`),
  UNIQUE KEY `hostid` (`hostuuid`) USING HASH,
  UNIQUE KEY `clientid` (`clientuuid`) USING HASH,
  UNIQUE KEY `hostname` (`hostname`) USING HASH
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE `mem` (
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
  `zfs_arc` bigint(20) unsigned DEFAULT NULL,
  KEY `hostid_ts` (`hostid`,`ts`),
  CONSTRAINT `mem_ibfk_1` FOREIGN KEY (`hostid`) REFERENCES `hosts` (`hostid`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE `netio` (
  `ts` datetime NOT NULL DEFAULT current_timestamp(),
  `hostid` int(10) unsigned NOT NULL DEFAULT 0,
  `nic` tinytext NOT NULL,
  `interval` float unsigned DEFAULT NULL,
  `bytes_sent` bigint(20) unsigned DEFAULT NULL,
  `bytes_recv` bigint(20) unsigned DEFAULT NULL,
  `packets_sent` bigint(20) unsigned DEFAULT NULL,
  `packets_recv` bigint(20) unsigned DEFAULT NULL,
  KEY `hostid_ts` (`hostid`,`ts`),
  KEY `hostid_nic_ts` (`hostid`,`nic`(255),`ts`),
  CONSTRAINT `netio_ibfk_1` FOREIGN KEY (`hostid`) REFERENCES `hosts` (`hostid`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE `sensors` (
  `ts` datetime NOT NULL DEFAULT current_timestamp(),
  `hostid` int(10) unsigned NOT NULL DEFAULT 0,
  `type` tinytext NOT NULL,
  `sensor` tinytext NOT NULL,
  `data` blob DEFAULT NULL,
  KEY `hostid_ts` (`hostid`,`ts`),
  KEY `hostid_type_ts` (`hostid`,`type`(255),`ts`),
  KEY `hostid_type_sensor_ts` (`hostid`,`type`(255),`sensor`(255),`ts`),
  CONSTRAINT `sensors_ibfk_1` FOREIGN KEY (`hostid`) REFERENCES `hosts` (`hostid`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE `temp` (
  `ts` datetime NOT NULL DEFAULT current_timestamp(),
  `hostid` int(10) unsigned NOT NULL DEFAULT 0,
  `sensor` tinytext NOT NULL,
  `label` tinytext NOT NULL,
  `temp` float DEFAULT NULL,
  KEY `hostid_ts` (`hostid`,`ts`),
  CONSTRAINT `temp_ibfk_1` FOREIGN KEY (`hostid`) REFERENCES `hosts` (`hostid`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 2022-03-20 19:41:27
