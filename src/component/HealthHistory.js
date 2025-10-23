import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import mqtt from 'mqtt';
import { analyzeHeartData } from '../utils/heartrules';
import Navbar from './Navbar';
import './HealthHistory.css';

export default function HealthHistory() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState(null);

  const [healthData, setHealthData] = useState([]);
  const [currentData, setCurrentData] = useState({
    bpm: null,
    spo2: null,
    temp: null,
    ir: null
  });

  const lastDataRef = useRef(null);
  const mqttClientRef = useRef(null);

  // ✅ Filter state
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterTimeFrom, setFilterTimeFrom] = useState('');
  const [filterTimeTo, setFilterTimeTo] = useState('');
  const [filterMetrics, setFilterMetrics] = useState({
    bpm: false,
    spo2: false,
    temp: false
  });
  // State to store active filters
  const [activeFilters, setActiveFilters] = useState({
    timeFrom: '',
    timeTo: '',
    metrics: {
      bpm: false,
      spo2: false,
      temp: false
    }
  });

  // Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoading(false);
      if (user) {
        setUid(user.uid); // ✅ lấy uid để tạo topic riêng
      } else {
        navigate('/signin');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // MQTT và Data Management
  useEffect(() => {
    if (!uid) return;

    // Khôi phục dữ liệu từ localStorage nếu có
    const savedHealthData = localStorage.getItem(`historyData_${uid}`);
    if (savedHealthData) {
      setHealthData(JSON.parse(savedHealthData));
    }

    const client = mqtt.connect("wss://broker.emqx.io:8084/mqtt");
    mqttClientRef.current = client;

    const topic = `thongtinbenhnhan/${uid}`;

    client.on("connect", () => {
      console.log("Connected to MQTT");
      client.subscribe(topic);
    });

    const handleMessage = (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        const prevData = lastDataRef.current || currentData;
        const newData = {
          bpm: data.BPM !== -999 ? data.BPM : prevData.bpm,
          spo2: data.SpO2 !== -999 ? data.SpO2 : prevData.spo2,
          temp: data.TempC !== -999 ? data.TempC : prevData.temp,
          ir: data.IR !== -999 ? data.IR : prevData.ir
        };

        // Use analyzeHeartData to determine warnings/status similarly to Home.js
        // We don't have activityMode here, default to 'Nghỉ ngơi' as in heartrules
        const analysis = analyzeHeartData(newData.bpm, newData.spo2, newData.temp, 'Nghỉ ngơi');

        const now = new Date();

        const dataWithStatus = {
          ...newData,
          timestamp: now.toLocaleString('vi-VN', {
            hour12: false,
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }),
          timestampRaw: now.toISOString(), // ✅ thêm trường để so sánh filter
          status: analysis.warnings.length > 0 ? 'alert' : 'normal',
          alerts: {
            bpm: analysis.warnings.includes('Nhịp tim bất thường'),
            spo2: analysis.warnings.includes('SpO2 thấp'),
            temp: analysis.warnings.includes('Nhiệt độ bất thường') || false
          }
        };

        lastDataRef.current = dataWithStatus;
        setCurrentData(dataWithStatus);

        setHealthData(prev => {
          const newHealthData = [...prev, dataWithStatus];
          localStorage.setItem(`historyData_${uid}`, JSON.stringify(newHealthData.slice(-1000)));
          return newHealthData;
        });
      } catch (err) {
        console.error("Error parsing MQTT:", err);
      }
    };

    client.on("message", handleMessage);

    return () => {
      client.unsubscribe(topic);
      client.end();
    };
  }, [uid]); // ✅ chạy lại khi uid thay đổi

  // Filtered data - Chỉ lấy dữ liệu báo động
  const filteredData = healthData.filter(item => item.status === 'alert');

  // ✅ Apply custom filter
  const applyFilter = (data) => {
    return data.filter(item => {
      if (item.status !== 'alert') return false;

      if (activeFilters.timeFrom || activeFilters.timeTo) {
        const itemDate = new Date(item.timestampRaw); // dùng ISO để so sánh
        if (activeFilters.timeFrom) {
          const fromDate = new Date(activeFilters.timeFrom);
          if (itemDate < fromDate) return false;
        }
        if (activeFilters.timeTo) {
          const toDate = new Date(activeFilters.timeTo);
          if (itemDate > toDate) return false;
        }
      }

      const selectedMetrics = Object.keys(activeFilters.metrics).filter(k => activeFilters.metrics[k]);
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
    setFilterTimeFrom('');
    setFilterTimeTo('');
    setFilterMetrics({ bpm: false, spo2: false, temp: false });
    setActiveFilters({
      timeFrom: '',
      timeTo: '',
      metrics: {
        bpm: false,
        spo2: false,
        temp: false
      }
    });
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
        <h1>Lịch sử báo động</h1>

        <div className="view-toggle" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <button className="filter-toggle-btn" onClick={() => setFilterOpen(!filterOpen)}>
            {filterOpen ? 'Đóng bộ lọc' : 'Bộ lọc'}
          </button>
        </div>

        {filterOpen && (
          <div className="modal-overlay">
            <div className="filter-panel">
              <h2>Bộ lọc dữ liệu</h2>
              
              <div className="filter-row">
                <label>Khoảng thời gian:</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '14px' }}>Từ:</label>
                    <input 
                      type="datetime-local" 
                      value={filterTimeFrom} 
                      onChange={e => setFilterTimeFrom(e.target.value)}
                      step="1"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '14px' }}>Đến:</label>
                    <input 
                      type="datetime-local" 
                      value={filterTimeTo} 
                      onChange={e => setFilterTimeTo(e.target.value)}
                      step="1"
                    />
                  </div>
                </div>
              </div>

              <div className="filter-row">
                <label>Lọc theo loại báo động:</label>
                <div className="filter-metrics">
                  <label>
                    <input 
                      type="checkbox" 
                      checked={filterMetrics.bpm} 
                      onChange={() => setFilterMetrics({...filterMetrics, bpm: !filterMetrics.bpm})}
                    />
                    Nhịp tim
                  </label>
                  <label>
                    <input 
                      type="checkbox" 
                      checked={filterMetrics.spo2} 
                      onChange={() => setFilterMetrics({...filterMetrics, spo2: !filterMetrics.spo2})}
                    />
                    SpO₂
                  </label>
                  <label>
                    <input 
                      type="checkbox" 
                      checked={filterMetrics.temp} 
                      onChange={() => setFilterMetrics({...filterMetrics, temp: !filterMetrics.temp})}
                    />
                    Nhiệt độ
                  </label>
                </div>
              </div>

              <div className="filter-buttons">
                <button className="filter-reset-btn" onClick={handleResetFilter}>
                  Reset
                </button>
                <button className="filter-cancel-btn" onClick={() => setFilterOpen(false)}>
                  Cancel
                </button>
                <button className="filter-ok-btn" onClick={() => {
                  setCurrentPage(1);
                  setActiveFilters({
                    timeFrom: filterTimeFrom,
                    timeTo: filterTimeTo,
                    metrics: { ...filterMetrics }
                  });
                  setFilterOpen(false);
                }}>
                  OK
                </button>
              </div>
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
