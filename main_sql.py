#!/usr/bin/env python3
import datetime, time
import socket
import psutil
import mysql.connector

interval = 30

db = mysql.connector.connect(
    host="localhost",
    user="logging",
    password="password",
    database="logging"
)


hn = socket.gethostname()
dbc = db.cursor()

def db_insert(tbl, dic):
    cols = []
    vals = []
    for key, val in dic.items():
        cols.append(key)
        vals.append(val)
    scols = ",".join(cols)
    svals = ",".join(["%s"]*len(cols))
    dbc.execute(f"INSERT INTO `{tbl}` ({scols}) VALUES ({svals})", tuple(vals))

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
        db_insert("cpu", d)

    v = psutil.virtual_memory()
    # ZFS ARC caches
    zfs_arc = 0
    with open('/proc/spl/kstat/zfs/arcstats') as reader:
        arc = {}
        for line in reader.readlines()[2:]:
            name, t, data = line.split()
            arc[name] = data
        if "size" in arc:
            zfs_arc = arc["size"]
    d = {"ts": ts, "hostname": hn}
    if not first:
        d |= {
            "total": v.total, "available": v.available, "percent": v.percent,
            "used": v.used, "free": v.free, "active": v.active, "inactive": v.inactive,
            "buffers": v.buffers, "cached": v.cached, "shared": v.shared, "slab": v.slab,
            "zfs_arc": zfs_arc,
        }
    db_insert("mem", d)

    v = psutil.sensors_temperatures()
    for key, val in v.items():
        for temp in val:
            d = {"ts": ts, "hostname": hn, "sensor": key, "label": temp.label}
            if not first:
                d |= {"temp": temp.current}
            db_insert("temp", d)

    db.commit()

    time.sleep(interval)
    first = False
