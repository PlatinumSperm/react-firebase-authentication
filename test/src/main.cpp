#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include "MAX30100_PulseOximeter.h"
#include "time.h"

// ==== WiFi config ====
const char *ssid = "24.";
const char *password = "khongcomatkhau";

// ==== MQTT config ====
const char *mqtt_broker = "broker.emqx.io";
const char *topic = "thongtinbenhnhan";
const char *mqtt_username = "Bao";
const char *mqtt_password = "123123123";
const int mqtt_port = 1883;

WiFiClient espClient;
PubSubClient client(espClient);

// ==== MAX30100 config ====
#define REPORTING_PERIOD_MS 1000
PulseOximeter pox;
uint32_t tsLastReport = 0;

// ==== NTP config ====
const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 7 * 3600;  // GMT+7
const int   daylightOffset_sec = 0;

// ==== Callback khi nhận message từ broker ====
void callback(char *topic, byte *payload, unsigned int length) {
  Serial.print("📩 Message arrived [");
  Serial.print(topic);
  Serial.print("]: ");
  for (int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
  Serial.println();
}

// ==== Callback khi phát hiện nhịp tim ====
void onBeatDetected() {
  Serial.println("♥ Beat detected!");
}

// ==== Lấy thời gian hiện tại dạng string ====
String getTimeString() {
  struct tm timeinfo;
  if(!getLocalTime(&timeinfo)){
    Serial.println("❌ Failed to obtain time");
    return "unknown";
  }
  char timeString[30];
  strftime(timeString, sizeof(timeString), "%Y-%m-%d %H:%M:%S", &timeinfo);
  return String(timeString);
}

// ==== Kết nối WiFi với kiểm tra lỗi ====
void setup_wifi() {
  Serial.printf("🔌 Connecting to WiFi: %s\n", ssid);
  WiFi.begin(ssid, password);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    retries++;
    if (retries > 20) {   // Thử 20 lần (~10s)
      Serial.println("\n❌ WiFi connection failed. Stopping code.");
      while (true) delay(1000); // Dừng hẳn
    }
  }

  Serial.println("\n✅ WiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

// ==== Kết nối MQTT với kiểm tra lỗi ====
void setup_mqtt() {
  client.setServer(mqtt_broker, mqtt_port);
  client.setCallback(callback);

  int retries = 0;
  while (!client.connected()) {
    String client_id = "esp32-client-";
    client_id += String(WiFi.macAddress());
    Serial.printf("🔄 Connecting to MQTT as %s ...\n", client_id.c_str());

    if (client.connect(client_id.c_str(), mqtt_username, mqtt_password)) {
      Serial.println("✅ MQTT connected!");
      client.subscribe(topic);
    } else {
      Serial.print("❌ Failed, state=");
      Serial.println(client.state());
      retries++;
      if (retries > 5) {  // Thử 5 lần rồi bỏ
        Serial.println("🚨 Cannot connect to MQTT. Stopping code.");
        while (true) delay(1000); // Dừng hẳn
      }
      delay(2000);
    }
  }
}

// ==== Setup ====
void setup() {
  Serial.begin(115200);

  setup_wifi();
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  setup_mqtt();

  // Khởi tạo cảm biến MAX30100
  Serial.print("Initializing MAX30100...");
  if (!pox.begin()) {
    Serial.println("❌ FAILED");
    while (true) delay(1000);  // Dừng hẳn nếu cảm biến lỗi
  } else {
    Serial.println("✅ SUCCESS");
  }

  pox.setIRLedCurrent(MAX30100_LED_CURR_7_6MA);
  pox.setOnBeatDetectedCallback(onBeatDetected);
}

// ==== Loop ====
void loop() {
  if (!client.connected()) {
    setup_mqtt();  // Thử kết nối lại nếu mất MQTT
  }
  client.loop();
  pox.update();

  if (millis() - tsLastReport > REPORTING_PERIOD_MS) {
    float heartRate = pox.getHeartRate();
    float spo2 = pox.getSpO2();

    // Xác định trạng thái
    String status = "Normal";
    if (heartRate < 50) status = "Low HR";
    else if (heartRate > 120) status = "High HR";

    String timestamp = getTimeString();

    Serial.printf("❤️ HR: %.2f bpm | SpO2: %.2f %% | Status: %s | Time: %s\n",
                  heartRate, spo2, status.c_str(), timestamp.c_str());

    // JSON payload
    String payload = "{";
    payload += "\"heart_rate\": " + String(heartRate, 2) + ",";
    payload += "\"spo2\": " + String(spo2, 2) + ",";
    payload += "\"status\": \"" + status + "\",";
    payload += "\"timestamp\": \"" + timestamp + "\"";
    payload += "}";

    client.publish(topic, payload.c_str());
    Serial.println("📤 Published: " + payload);

    tsLastReport = millis();
  }
}
