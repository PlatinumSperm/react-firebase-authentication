import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import Navbar from "./Navbar";
import Hero from "./Hero";
import mqtt from "mqtt";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [bpm, setBpm] = useState(null);
  const [spo2, setSpo2] = useState(null);
  const [temp, setTemp] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [chartType, setChartType] = useState("BPM"); // ✅ mặc định là BPM

  // ✅ Check auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoading(false);
      if (!user) {
        navigate("/signin");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // ✅ MQTT connect
  useEffect(() => {
    const client = mqtt.connect("wss://broker.emqx.io:8084/mqtt");

    client.on("connect", () => {
      console.log("Connected to MQTT");
      client.subscribe("thongtinbenhnhan");
    });

    client.on("message", (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        setBpm(data.BPM !== -999 ? data.BPM : null);
        setSpo2(data.SpO2 !== -999 ? data.SpO2 : null);
        setTemp(data.TempC !== -999 ? data.TempC : null);

        // update chart (giữ 30 điểm gần nhất)
        setChartData((prev) => [
          ...prev.slice(-29),
          {
            time: new Date().toLocaleTimeString(),
            bpm: data.BPM !== -999 ? data.BPM : null,
            spo2: data.SpO2 !== -999 ? data.SpO2 : null,
          },
        ]);
      } catch (err) {
        console.error("Error parsing MQTT:", err);
      }
    });

    return () => client.end();
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // ✅ Xác định màu trái tim
  const getHeartColor = () => {
    if (bpm == null) return "#d9d9d9";
    if (bpm < 50 || bpm > 120) return "#ffa940";
    return "#ff4d4f";
  };

  // ✅ Xác định màu SpO2
  const getSpo2Color = () => {
    if (spo2 == null) return "#000";
    return spo2 < 90 ? "#ff4d4f" : "#52c41a";
  };

  // ✅ Xác định màu TempC
  const getTempColor = () => {
    if (temp == null) return "#000";
    return temp < 22 || temp > 32 ? "#ff4d4f" : "#1890ff";
  };

  return (
    <>
      <Navbar />
      <Hero />

      <div className="home-container">
        {/* LEFT */}
        <div className="left-panel">
        {/* Card Nhịp tim */}
        <div className="info-card">
          <div className="icon">❤️</div>
          <div className="info-content">
            <p className="info-title">Nhịp tim</p>
            <p className="info-value" style={{ color: getHeartColor() }}>
              {bpm ?? "--"} BPM
            </p>
          </div>
        </div>

        {/* Card SpO2 */}
        <div className="info-card">
          <div className="icon">🫁</div>
          <div className="info-content">
            <p className="info-title">SpO₂</p>
            <p className="info-value" style={{ color: getSpo2Color() }}>
              {spo2 ?? "--"} %
            </p>
          </div>
        </div>

  {/* Card Nhiệt độ */}
  <div className="info-card">
    <div className="icon">🌡️</div>
    <div className="info-content">
      <p className="info-title">Nhiệt độ</p>
      <p className="info-value" style={{ color: getTempColor() }}>
        {temp ?? "--"} °C
      </p>
    </div>
  </div>
</div>

        {/* RIGHT */}
        <div className="right-panel">
          {/* ✅ Nút chọn loại biểu đồ */}
          <div className="chart-toggle">
            <button
              className={chartType === "BPM" ? "active" : ""}
              onClick={() => setChartType("BPM")}
            >
              Sơ đồ nhịp tim
            </button>
            <button
              className={chartType === "SpO2" ? "active" : ""}
              onClick={() => setChartType("SpO2")}
            >
              Sơ đồ SpO₂
            </button>
          </div>

          <h3>{chartType === "BPM" ? "Sơ đồ nhịp tim" : "Sơ đồ SpO₂"}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" hide />
              <YAxis />
              <Tooltip />
              {chartType === "BPM" ? (
                <Line
                  type="monotone"
                  dataKey="bpm"
                  stroke="#ff4d4f"
                  strokeWidth={2}
                  dot={false}
                />
              ) : (
                <Line
                  type="monotone"
                  dataKey="spo2"
                  stroke="#52c41a"
                  strokeWidth={2}
                  dot={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
