#!/usr/bin/env python3
import datetime, time
import socket
import psutil
import json
import traceback
from urllib import request, parse

url = "https://zhiyb.me/logging/record.php"
#url = "http://nas/logging/www/record.php"
interval = 30


hn = socket.gethostname()


db = {}

def db_insert(db, tbl, dic):
    if tbl not in db:
        db[tbl] = []
    del dic["ts"]
    del dic["hostname"]
    db[tbl].append(dic)

def db_commit(url, db, ts, hn):
    data = json.JSONEncoder().encode({"ts": ts, "tables": db}).encode('utf-8')
    db.clear()
    try:
        req = request.Request(f"{url}?h={hn}", data = data)
        resp = request.urlopen(req)
    except:
        print("Error:", url, ts, hn, db)
        traceback.print_exc()
        return False
    return True


first = True    # Insert NULL values to show discontinuity
nics = {}
disks = {}
pdt = datetime.datetime.utcnow()
while True:
    dt = datetime.datetime.utcnow()
    dsec = (dt - pdt).total_seconds()
    ts = dt.strftime('%Y-%m-%d %H:%M:%S')

    for i, s in enumerate(psutil.cpu_times_percent(percpu=True)):
        d = {"ts": ts, "hostname": hn, "id": i}
        if not first:
            d.update({
                "user": s.user, "system": s.system, "idle": s.idle, "nice": s.nice,
                "iowait": s.iowait, "irq": s.irq, "softirq": s.softirq,
                "steal": s.steal, "guest": s.guest, "guest_nice": s.guest_nice,
            })
        db_insert(db, "cpu", d)

    v = psutil.virtual_memory()
    # ZFS ARC caches
    zfs_arc = 0
    try:
        with open('/proc/spl/kstat/zfs/arcstats') as reader:
            arc = {}
            for line in reader.readlines()[2:]:
                name, t, data = line.split()
                arc[name] = data
            if "size" in arc:
                zfs_arc = arc["size"]
    except:
        pass
    d = {"ts": ts, "hostname": hn}
    if not first:
        slab = 0
        if "slab" in v:
            slab = v.slab
        d.update({
            "total": v.total, "available": v.available, "percent": v.percent,
            "used": v.used, "free": v.free, "active": v.active, "inactive": v.inactive,
            "buffers": v.buffers, "cached": v.cached, "shared": v.shared, "slab": slab,
            "zfs_arc": zfs_arc,
        })
    db_insert(db, "mem", d)

    v = psutil.sensors_temperatures()
    for key, val in v.items():
        for temp in val:
            d = {"ts": ts, "hostname": hn, "sensor": key, "label": temp.label}
            if not first:
                d.update({"temp": temp.current})
            db_insert(db, "temp", d)

    netif = psutil.net_if_stats()
    v = psutil.net_io_counters(pernic=True, nowrap=True)
    for key, val in netif.items():
        if not val.isup:
            del v[key]
    for key, val in v.items():
        d = {"ts": ts, "hostname": hn, "nic": key}
        if not first and key in nics:
            prv = nics[key]
            d.update({  "interval": dsec,
                      "bytes_sent": val.bytes_sent - prv.bytes_sent, "bytes_recv": val.bytes_recv - prv.bytes_recv,
                    "packets_sent": val.packets_sent - prv.packets_sent, "packets_recv": val.packets_recv - prv.packets_recv})
        db_insert(db, "netio", d)
    nics = v

    try:
        v = psutil.disk_io_counters(perdisk=True, nowrap=True)
    except:
        v = {}
    # Only report whole disks
    par = []
    for key in v.keys():
        for k in v.keys():
            if not k[-1].isdigit() and key != k and key.startswith(k):
                par.append(key)
                break
    for p in par:
        del v[p]
    for key, val in v.items():
        d = {"ts": ts, "hostname": hn, "disk": key}
        if not first and key in disks:
            prv = disks[key]
            d.update({  "interval": dsec,
                     "write_bytes": val.write_bytes - prv.write_bytes, "read_bytes": val.read_bytes - prv.read_bytes,
                      "write_time": val.write_time - prv.write_time, "read_time": val.read_time - prv.read_time})
        db_insert(db, "disk", d)
    disks = v

    # Signal discontinuity again if update failed
    first = not db_commit(url, db, ts, hn)
    pdt = dt
    time.sleep(interval)
