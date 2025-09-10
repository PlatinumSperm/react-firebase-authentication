import paho.mqtt.client as mqtt
import time
import json
from datetime import datetime

broker = "broker.emqx.io"
port = 1883
topic = "thongtinbenhnhan"
username = "Bao"
password = "123123123"

client = mqtt.Client()
client.username_pw_set(username, password)
client.connect(broker, port, 60)

while True:
    data = {
        "heart_rate": 75,
        "spo2": 97,
        "status": "Normal",
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    payload = json.dumps(data)
    client.publish(topic, payload)
    print("Published:", payload)
    time.sleep(2)
