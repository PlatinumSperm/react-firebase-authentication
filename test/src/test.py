import paho.mqtt.client as mqtt
import time
import json
from datetime import datetime
import random

broker = "broker.emqx.io"
port = 1883
topic = "thongtinbenhnhan"
username = "Bao"
password = "123123123"

client = mqtt.Client()
client.username_pw_set(username, password)
client.connect(broker, port, 60)

while True:
    # Tạo dữ liệu giả lập
    data = {
        "BPM": random.randint(60, 100),      # Nhịp tim
        "SpO2": random.randint(90, 100),     # SpO2
        "TempC": round(random.uniform(25, 30), 1),  # Nhiệt độ
        "IR": random.randint(50000, 70000),  # Tín hiệu PPG (IR)
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    payload = json.dumps(data)
    client.publish(topic, payload)
    print("Published:", payload)

    time.sleep(0.1)
