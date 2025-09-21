import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import mqtt from 'mqtt';
import Navbar from './Navbar';
import './HealthHistory.css';

export default function HealthHistory() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('all'); // 'all' or 'alerts'

  const [healthData, setHealthData] = useState([]);
  const [currentData, setCurrentData] = useState({
    bpm: null,
    spo2: null,
    temp: null,
    ir: null
  });

  const lastDataRef = useRef(null);

  // ✅ Filter state
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [filterTimeFrom, setFilterTimeFrom] = useState('');
  const [filterTimeTo, setFilterTimeTo] = useState('');
  const [filterMetrics, setFilterMetrics] = useState({
    bpm: false,
    spo2: false,
    temp: false
  });

  // MQTT
  useEffect(() => {
    const client = mqtt.connect("wss://broker.emqx.io:8084/mqtt");

    client.on("connect", () => {
      console.log("Connected to MQTT");
      client.subscribe("thongtinbenhnhan");
    });

    client.on("message", (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        const newData = {
          bpm: data.BPM !== -999 ? data.BPM : currentData.bpm,
          spo2: data.SpO2 !== -999 ? data.SpO2 : currentData.spo2,
          temp: data.TempC !== -999 ? data.TempC : currentData.temp,
          ir: data.IR !== -999 ? data.IR : currentData.ir
        };

        const isAlert =
          newData.bpm < 60 || newData.bpm > 100 ||
          newData.spo2 < 90 ||
          newData.temp < 25 || newData.temp > 28;

        const timestamp = new Date().toLocaleString('vi-VN', {
          hour12: false,
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });

        const dataWithStatus = {
          ...newData,
          timestamp,
          status: isAlert ? 'alert' : 'normal',
          alerts: {
            bpm: newData.bpm < 60 || newData.bpm > 100,
            spo2: newData.spo2 < 90,
            temp: newData.temp < 25 || newData.temp > 28
          }
        };

        lastDataRef.current = dataWithStatus;
      } catch (err) {
        console.error("Error parsing MQTT:", err);
      }
    });

    return () => {
      client.unsubscribe("thongtinbenhnhan");
      client.end();
    };
  }, [currentData]);

  // Interval update
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastDataRef.current) {
        setCurrentData(lastDataRef.current);
        setHealthData(prev => [...prev, lastDataRef.current]);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoading(false);
      if (!user) {
        navigate('/signin');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Filtered data
  const filteredData =
    viewMode === 'alerts'
      ? healthData.filter(item => item.status === 'alert')
      : healthData;

  // ✅ Apply custom filter
  const applyFilter = (data) => {
    return data.filter(item => {
      if (item.status !== 'alert') return false;

      // Date filter
      if (filterDate && !item.timestamp.startsWith(filterDate)) return false;

      // Time filter
      if (filterTimeFrom || filterTimeTo) {
        const timePart = item.timestamp.split(', ')[1]; // "HH:MM:SS"
        if (filterTimeFrom && timePart < filterTimeFrom) return false;
        if (filterTimeTo && timePart > filterTimeTo) return false;
      }

      // Metrics filter
      const selectedMetrics = Object.keys(filterMetrics).filter(k => filterMetrics[k]);
      if (selectedMetrics.length > 0) {
        const matched = selectedMetrics.some(metric => item.alerts[metric]);
        if (!matched) return false;
      }

      return true;
    });
  };

  const dataToShow = applyFilter(filteredData);

  // ✅ Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const totalPages = Math.ceil(dataToShow.length / itemsPerPage);
  const paginatedData = dataToShow
    .slice()
    .reverse()
    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleResetFilter = () => {
    setFilterDate('');
    setFilterTimeFrom('');
    setFilterTimeTo('');
    setFilterMetrics({ bpm: false, spo2: false, temp: false });
  };

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

        <div className="view-toggle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <button
              className={viewMode === 'all' ? 'active' : ''}
              onClick={() => setViewMode('all')}
            >
              Hiển thị lịch sử
            </button>
            <button
              className={viewMode === 'alerts' ? 'active' : ''}
              onClick={() => setViewMode('alerts')}
            >
              Lịch sử báo động
            </button>
          </div>

          {/* ✅ Filter button */}
          <div>
            <button className="filter-toggle-btn" onClick={() => setFilterOpen(!filterOpen)}>
              {filterOpen ? 'Đóng bộ lọc' : 'Bộ lọc'}
            </button>
          </div>
        </div>

        {filterOpen && (
          <div className="filter-panel">
            <div className="filter-row">
              <label>Ngày:</label>
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
            </div>
            <div className="filter-row">
              <label>Từ giờ:</label>
              <input type="time" value={filterTimeFrom} onChange={e => setFilterTimeFrom(e.target.value)} />
              <label>Đến giờ:</label>
              <input type="time" value={filterTimeTo} onChange={e => setFilterTimeTo(e.target.value)} />
            </div>
            <div className="filter-row">
              <label>Báo động:</label>
              <label><input type="checkbox" checked={filterMetrics.bpm} onChange={() => setFilterMetrics({...filterMetrics, bpm: !filterMetrics.bpm})} /> BPM</label>
              <label><input type="checkbox" checked={filterMetrics.spo2} onChange={() => setFilterMetrics({...filterMetrics, spo2: !filterMetrics.spo2})} /> SpO₂</label>
              <label><input type="checkbox" checked={filterMetrics.temp} onChange={() => setFilterMetrics({...filterMetrics, temp: !filterMetrics.temp})} /> Nhiệt độ</label>
            </div>
            <div className="filter-row">
              <button className="filter-ok-btn" onClick={() => setCurrentPage(1)}>OK</button>
              <button className="filter-reset-btn" onClick={handleResetFilter}>Reset</button>
            </div>
          </div>
        )}

        <div className="card">
          <div className="table-container">
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
                {paginatedData.map((item, index) => (
                  <tr key={index} className={item.status}>
                    <td>{item.timestamp}</td>
                    <td className={item.alerts?.bpm ? 'alert-value' : ''}>{item.bpm}</td>
                    <td className={item.alerts?.spo2 ? 'alert-value' : ''}>{item.spo2}</td>
                    <td className={item.alerts?.temp ? 'alert-value' : ''}>{item.temp}</td>
                    <td>{item.status === 'normal' ? 'Bình thường' : 'Báo động'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination">
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
              ⬅ Trước
            </button>
            <span>Trang {currentPage} / {totalPages || 1}</span>
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
              Sau ➡
            </button>

            <select value={itemsPerPage} onChange={handleItemsPerPageChange}>
              <option value={5}>5 dòng / trang</option>
              <option value={10}>10 dòng / trang</option>
              <option value={20}>20 dòng / trang</option>
              <option value={50}>50 dòng / trang</option>
            </select>
          </div>
        </div>
      </div>
    </>
  );
}
