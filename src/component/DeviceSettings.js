import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import Navbar from './Navbar';
import './DeviceSettings.css';

export default function DeviceSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [wifi, setWifi] = useState({
    ssid: '',
    password: ''
  });
  const [showMessage, setShowMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoading(false);
      if (!user) {
        navigate('/signin');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    try {
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          phoneNumber: phoneNumber
        });
        setShowMessage({ text: 'Số điện thoại đã được cập nhật!', type: 'success' });
      }
    } catch (error) {
      setShowMessage({ text: 'Có lỗi xảy ra: ' + error.message, type: 'error' });
    }
  };

  const handleDateSubmit = (e) => {
    e.preventDefault();
    // TODO: Implement date setting logic
    setShowMessage({ text: 'Đã cập nhật ngày!', type: 'success' });
  };

  const handleTimeSubmit = (e) => {
    e.preventDefault();
    // TODO: Implement time setting logic
    setShowMessage({ text: 'Đã cập nhật thời gian!', type: 'success' });
  };

  const handleWifiSubmit = (e) => {
    e.preventDefault();
    // TODO: Implement WiFi setting logic
    setShowMessage({ text: 'Đã cập nhật WiFi!', type: 'success' });
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
      <div className="settings-container">
        <h1>Thiết lập thiết bị</h1>

        {showMessage.text && (
          <div className={`message ${showMessage.type}`}>
            {showMessage.text}
          </div>
        )}

        <div className="settings-grid">
          <div className="settings-card">
            <h2>Cài đặt ngày</h2>
            <form onSubmit={handleDateSubmit}>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              <button type="submit">Cập nhật ngày</button>
            </form>
          </div>

          <div className="settings-card">
            <h2>Cài đặt thời gian</h2>
            <form onSubmit={handleTimeSubmit}>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                step="1"
              />
              <button type="submit">Cập nhật thời gian</button>
            </form>
          </div>

          <div className="settings-card">
            <h2>Cài đặt WiFi</h2>
            <form onSubmit={handleWifiSubmit}>
              <input
                type="text"
                placeholder="Tên mạng WiFi"
                value={wifi.ssid}
                onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })}
                required
              />
              <input
                type="password"
                placeholder="Mật khẩu WiFi"
                value={wifi.password}
                onChange={(e) => setWifi({ ...wifi, password: e.target.value })}
                required
              />
              <button type="submit">Cập nhật WiFi</button>
            </form>
          </div>

          <div className="settings-card">
            <h2>Cài đặt số điện thoại</h2>
            <form onSubmit={handlePhoneSubmit}>
              <input
                type="tel"
                placeholder="Nhập số điện thoại"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                pattern="[0-9]{10}"
                required
              />
              <button type="submit">Lưu số điện thoại</button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}