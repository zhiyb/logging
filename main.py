#!/usr/bin/env python3
import datetime, time
import socket
import psutil
import json
import traceback
from urllib import request, parse

url = "http://nas.wg/logging/record.php"
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
    try:
        data = json.JSONEncoder().encode({"ts": ts, "tables": db}).encode('utf-8')
        req = request.Request(f"{url}?h={hn}", data = data)
        resp = request.urlopen(req)
    except:
        print("Error:", url, ts, hn, db)
        traceback.print_exc()
    db.clear()


first = True    # Insert NULL values to show discontinuity
while True:
    ts = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')

    for i, s in enumerate(psutil.cpu_times_percent(percpu=True)):
        d = {"ts": ts, "hostname": hn, "id": i}
        if not first:
            d |= {
                "user": s.user, "system": s.system, "idle": s.idle, "nice": s.nice,
                "iowait": s.iowait, "irq": s.irq, "softirq": s.softirq,
                "steal": s.steal, "guest": s.guest, "guest_nice": s.guest_nice,
            }
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
        d |= {
            "total": v.total, "available": v.available, "percent": v.percent,
            "used": v.used, "free": v.free, "active": v.active, "inactive": v.inactive,
            "buffers": v.buffers, "cached": v.cached, "shared": v.shared, "slab": v.slab,
            "zfs_arc": zfs_arc,
        }
    db_insert(db, "mem", d)

    v = psutil.sensors_temperatures()
    for key, val in v.items():
        for temp in val:
            d = {"ts": ts, "hostname": hn, "sensor": key, "label": temp.label}
            if not first:
                d |= {"temp": temp.current}
            db_insert(db, "temp", d)

    db_commit(url, db, ts, hn)

    time.sleep(interval)
    first = False
