import React, { useState, useEffect, useRef } from "react";
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
  Label,
} from "recharts";
import "./Home.css";
import { motion } from "framer-motion";

export default function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [bpm, setBpm] = useState(null);
  const [spo2, setSpo2] = useState(null);
  const [temp, setTemp] = useState(null);
  const [ir, setIr] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [chartType, setChartType] = useState("BPM");

  const lastValueRef = useRef({ bpm: 0, spo2: 0, ir: 0, temp: 0 });
  const [status, setStatus] = useState({ text: "Không tìm thấy dữ liệu", type: "none" });

  // ⏱ Lưu thời gian nhận dữ liệu cuối cùng
  const lastMessageTime = useRef(Date.now());

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
        const newBpm = data.BPM !== -999 ? data.BPM : lastValueRef.current.bpm;
        const newSpo2 = data.SpO2 !== -999 ? data.SpO2 : lastValueRef.current.spo2;
        const newTemp = data.TempC !== -999 ? data.TempC : lastValueRef.current.temp;
        const newIr = data.IR !== -999 ? data.IR : lastValueRef.current.ir;

        // lưu giá trị mới vào ref
        lastValueRef.current = { bpm: newBpm, spo2: newSpo2, ir: newIr, temp: newTemp };
        lastMessageTime.current = Date.now(); // ✅ cập nhật thời gian nhận dữ liệu

        // ✅ update chart
        const now = new Date().toLocaleTimeString("vi-VN", {
          hour12: false,
          timeStyle: "medium",
        });

        setChartData((prev) => [
          ...prev.slice(-49),
          { time: now, bpm: newBpm, spo2: newSpo2, ir: newIr },
        ]);
      } catch (err) {
        console.error("Error parsing MQTT:", err);
      }
    });

    return () => {
      client.unsubscribe("thongtinbenhnhan");
      client.end();
    };
  }, []);

  // ✅ Cập nhật trạng thái
  useEffect(() => {
    if (bpm === null || spo2 === null || temp === null) {
      setStatus({ text: "Không tìm thấy dữ liệu", type: "none" });
    } else {
      const isNormal =
        bpm >= 60 && bpm <= 100 &&
        spo2 >= 90 &&
        temp >= 25 && temp <= 27;

      if (isNormal) {
        setStatus({ text: "Trạng thái: ổn định", type: "normal" });
      } else {
        setStatus({ text: "Trạng thái: báo động", type: "alert" });
      }
    }
  }, [bpm, spo2, temp]);

  // ✅ Card update mỗi 1s
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      // nếu không có dữ liệu mới trong 2s → giảm dần về 0
      if (now - lastMessageTime.current > 2000) {
        lastValueRef.current = {
          bpm: Math.max(0, lastValueRef.current.bpm - 2),
          spo2: Math.max(0, lastValueRef.current.spo2 - 1),
          temp: Math.max(0, lastValueRef.current.temp - 0.1),
          ir: Math.max(0, lastValueRef.current.ir - 500),
        };
      }

      setBpm(lastValueRef.current.bpm);
      setSpo2(lastValueRef.current.spo2);
      setTemp(Number(lastValueRef.current.temp.toFixed(1)));
      setIr(lastValueRef.current.ir);

      // cập nhật chart khi giảm giá trị
      const nowLabel = new Date().toLocaleTimeString("vi-VN", {
        hour12: false,
        timeStyle: "medium",
      });

      setChartData((prev) => [
        ...prev.slice(-49),
        {
          time: nowLabel,
          bpm: lastValueRef.current.bpm,
          spo2: lastValueRef.current.spo2,
          ir: lastValueRef.current.ir,
        },
      ]);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // ✅ Custom Line animate
  const MotionLine = ({ path, stroke }) => (
    <motion.path
      d={path}
      stroke={stroke}
      strokeWidth="2"
      fill="none"
      animate={{ d: path }}
      transition={{ duration: 0.1, ease: "linear" }}
    />
  );

  return (
    <>
      <Navbar />
      <Hero status={status} />
      <div className="home-container">
        {/* LEFT */}
        <div className="left-panel">
          <h2 className="section-title">Chỉ số hiện tại</h2>
          <div className="info-card heart">
            <div className="icon">❤️</div>
            <div className="info-content">
              <p className="info-title">Nhịp tim</p>
              <p className="info-value">{bpm ?? "--"} BPM</p>
            </div>
          </div>
          <div className="info-card spo2">
            <div className="icon">🫁</div>
            <div className="info-content">
              <p className="info-title">SpO₂</p>
              <p className="info-value">{spo2 ?? "--"} %</p>
            </div>
          </div>
          <div className="info-card temp">
            <div className="icon">🌡️</div>
            <div className="info-content">
              <p className="info-title">Nhiệt độ</p>
              <p className="info-value">{temp ?? "--"} °C</p>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="right-panel">
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
            <button
              className={chartType === "IR" ? "active" : ""}
              onClick={() => setChartType("IR")}
            >
              Sơ đồ tín hiệu PPG
            </button>
          </div>

          <h3>
            {chartType === "BPM"
              ? "Sơ đồ nhịp tim"
              : chartType === "SpO2"
              ? "Sơ đồ SpO₂"
              : "Sơ đồ tín hiệu PPG"}
          </h3>

          <ResponsiveContainer width="100%" height={350}>
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
              style={{ backgroundColor: "#fff" }}
            >
              <motion.g
                key={chartData.length}
                initial={{ x: 0 }}
                animate={{ x: -15 }}
                transition={{ duration: 0.12, ease: "linear" }}
              >
                <CartesianGrid stroke="#e0e0e0" strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: "#333", fontSize: 12 }}
                  axisLine={{ stroke: "#333" }}
                >
                  <Label value="Thời gian" offset={-5} position="insideBottom" fill="#333" />
                </XAxis>

                {chartType === "BPM" && (
                  <YAxis domain={[0, 140]} tick={{ fill: "#333", fontSize: 12 }} axisLine={{ stroke: "#333" }}>
                    <Label value="BPM" angle={-90} position="insideLeft" fill="#333" />
                  </YAxis>
                )}
                {chartType === "SpO2" && (
                  <YAxis domain={[0, 100]} tick={{ fill: "#333", fontSize: 12 }} axisLine={{ stroke: "#333" }}>
                    <Label value="%" angle={-90} position="insideLeft" fill="#333" />
                  </YAxis>
                )}
                {chartType === "IR" && (
                  <YAxis tick={{ fill: "#333", fontSize: 12 }} axisLine={{ stroke: "#333" }}>
                    <Label value="PPG" angle={-90} position="insideLeft" fill="#333" />
                  </YAxis>
                )}

                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #ccc" }}
                  labelStyle={{ color: "#333" }}
                  itemStyle={{ color: "#333" }}
                />

                {chartType === "BPM" && (
                  <Line
                    type="monotone"
                    dataKey="bpm"
                    stroke="#00b300"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                    content={({ points }) => {
                      const path = `M${points.map((p) => `${p.x},${p.y}`).join("L")}`;
                      return <MotionLine path={path} stroke="#00b300" />;
                    }}
                  />
                )}
                {chartType === "SpO2" && (
                  <Line
                    type="monotone"
                    dataKey="spo2"
                    stroke="#00bfff"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                    content={({ points }) => {
                      const path = `M${points.map((p) => `${p.x},${p.y}`).join("L")}`;
                      return <MotionLine path={path} stroke="#00bfff" />;
                    }}
                  />
                )}
                {chartType === "IR" && (
                  <Line
                    type="monotone"
                    dataKey="ir"
                    stroke="#ff9900"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                    content={({ points }) => {
                      const path = `M${points.map((p) => `${p.x},${p.y}`).join("L")}`;
                      return <MotionLine path={path} stroke="#ff9900" />;
                    }}
                  />
                )}
              </motion.g>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
