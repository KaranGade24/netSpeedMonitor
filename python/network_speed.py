import psutil
import time
import json
import sys
import subprocess
import platform



def get_ip():
    addrs = psutil.net_if_addrs()
    for iface in addrs.values():
        for snic in iface:
            if snic.family == 2:  # IPv4
                if not snic.address.startswith("127.") and len(snic.address.split(".")) == 4:
                    return snic.address
    return "0.0.0.0"

def ping_test():
    param = "-n" if platform.system().lower() == "windows" else "-c"
    cmd = ["ping", param, "1", "8.8.8.8"]

    try:
        result = subprocess.check_output(cmd, stderr=subprocess.STDOUT).decode()
        if "time=" in result:
            ping = result.split("time=")[1].split("ms")[0].strip()
            return float(ping), 0  # 0% loss
        else:
            return 0, 100
    except:
        return 0, 100






old = psutil.net_io_counters()

while True:
    time.sleep(1)

    new = psutil.net_io_counters()

    download_bytes = new.bytes_recv - old.bytes_recv
    upload_bytes = new.bytes_sent - old.bytes_sent

    ip = get_ip()
    ping, loss = ping_test()

    data = {
        "download_bytes": download_bytes,
        "upload_bytes": upload_bytes,
        "ip": ip,
        "ping": ping,
        "packet_loss": loss
    }

    sys.stdout.write(json.dumps(data) + "\n")
    sys.stdout.flush()

    old = new
