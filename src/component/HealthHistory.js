import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useMQTT } from '../context/MQTTContext';
import Navbar from './Navbar';
import './HealthHistory.css';

export default function HealthHistory() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('all'); // 'all' or 'alerts'
  const { healthData } = useMQTT();

  // 👉 State lưu dữ liệu hiển thị
  const [displayData, setDisplayData] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoading(false);
      if (!user) {
        navigate('/signin');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // 👉 Điều khiển tốc độ cập nhật dữ liệu
  useEffect(() => {
  if (healthData.length === 0) return;

  const latest = healthData[healthData.length - 1];

  if (displayData.length === 0) {
    // 🚀 Lần đầu load: hiển thị ngay
    setDisplayData([...healthData]);
    return;
  }

  if (latest.status === "alert") {
    setDisplayData([...healthData]);
  } else {
    const timer = setTimeout(() => {
      setDisplayData([...healthData]);
    }, 1000);

    return () => clearTimeout(timer);
  }
}, [healthData]);


  const filteredData =
    viewMode === "alerts"
      ? displayData.filter((item) => item.status === "alert")
      : displayData;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="history-container">
        <h1>Lịch sử sức khỏe</h1>

        <div className="view-toggle">
          <button
            className={viewMode === "all" ? "active" : ""}
            onClick={() => setViewMode("all")}
          >
            Hiển thị lịch sử
          </button>
          <button
            className={viewMode === "alerts" ? "active" : ""}
            onClick={() => setViewMode("alerts")}
          >
            Lịch sử báo động
          </button>
        </div>

        <div className="history-table">
          <table>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Nhịp tim (BPM)</th>
                <th>SpO₂ (%)</th>
                <th>Nhiệt độ (°C)</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.slice().reverse().map((item, index) => (
                <tr key={index} className={item.status}>
                  <td>{item.timestamp}</td>
                  <td className={item.alerts?.bpm ? "alert-value" : ""}>
                    {item.bpm}
                  </td>
                  <td className={item.alerts?.spo2 ? "alert-value" : ""}>
                    {item.spo2}
                  </td>
                  <td className={item.alerts?.temp ? "alert-value" : ""}>
                    {item.temp}
                  </td>
                  <td>
                    {item.status === "normal" ? "Bình thường" : "Báo động"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
