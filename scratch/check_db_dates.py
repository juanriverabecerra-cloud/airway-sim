import os
import time

db_paths = [
    "medical_truth.db",
    "src/knowledge/medical_truth.db",
    "public/medical_truth.db"
]

for p in db_paths:
    if os.path.exists(p):
        stat = os.stat(p)
        mtime = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(stat.st_mtime))
        print(f"{p}: size={stat.st_size} bytes, modified={mtime}")
    else:
        print(f"{p}: NOT FOUND")
