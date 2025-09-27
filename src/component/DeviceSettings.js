import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import mqtt from 'mqtt';
import Navbar from './Navbar';
import './DeviceSettings.css';

export default function DeviceSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [age, setAge] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [wifi, setWifi] = useState({
    ssid: '',
    password: ''
  });
  const [showMessage, setShowMessage] = useState({ text: '', type: '' });
  const [activeTab, setActiveTab] = useState('account');
  const mqttClientRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoading(false);
      if (user) {
        setUser(user);
        // Fetch user data from Firestore
        const fetchUserData = async () => {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setPhoneNumber(userData.phoneNumber || '');
            setAge(userData.age || '');
          }
        };
        fetchUserData();

        // Setup MQTT connection
        const client = mqtt.connect('wss://broker.emqx.io:8084/mqtt');
        mqttClientRef.current = client;

        client.on('connect', () => {
          console.log('MQTT Connected');
        });

      } else {
        navigate('/signin');
      }
    });

    return () => {
      unsubscribe();
      if (mqttClientRef.current) {
        mqttClientRef.current.end();
      }
    };
  }, [navigate]);

  const handleAccountSubmit = async (e) => {
    e.preventDefault();
    try {
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          phoneNumber,
          age
        });
        setShowMessage({ text: 'Thông tin tài khoản đã được cập nhật!', type: 'success' });
      }
    } catch (error) {
      setShowMessage({ text: 'Có lỗi xảy ra: ' + error.message, type: 'error' });
    }
  };

  const handleDeviceSubmit = (e) => {
    e.preventDefault();
    try {
      if (user && mqttClientRef.current) {
        const deviceSettings = {
          date,
          time,
          wifi: {
            ssid: wifi.ssid,
            password: wifi.password
          }
        };
        
        mqttClientRef.current.publish(
          `thongtinbenhnhan/${user.uid}/settings`,
          JSON.stringify(deviceSettings)
        );
        
        setShowMessage({ text: 'Đã cập nhật thiết lập thiết bị!', type: 'success' });
      }
    } catch (error) {
      setShowMessage({ text: 'Có lỗi xảy ra: ' + error.message, type: 'error' });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/signin');
    } catch (error) {
      setShowMessage({ text: 'Có lỗi khi đăng xuất: ' + error.message, type: 'error' });
    }
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
        <div className="settings-layout">
          <div className="settings-sidebar">
            <div 
              className={`sidebar-item ${activeTab === 'account' ? 'active' : ''}`}
              onClick={() => setActiveTab('account')}
            >
              Thiết lập tài khoản
            </div>
            <div 
              className={`sidebar-item ${activeTab === 'device' ? 'active' : ''}`}
              onClick={() => setActiveTab('device')}
            >
              Thiết lập thiết bị
            </div>
            <div className="sidebar-item logout" onClick={handleLogout}>
              Đăng xuất
            </div>
          </div>

          <div className="settings-content">
            {showMessage.text && (
              <div className={`message ${showMessage.type}`}>
                {showMessage.text}
              </div>
            )}

            {activeTab === 'account' ? (
              <div className="settings-section">
                <h2>Thiết lập tài khoản</h2>
                <form onSubmit={handleAccountSubmit}>
                  <div className="form-group">
                    <label>Tên đăng nhập:</label>
                    <input
                      type="text"
                      value={user?.email || ''}
                      disabled
                    />
                  </div>
                  <div className="form-group">
                    <label>Tuổi:</label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="Nhập tuổi"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Số điện thoại:</label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Nhập số điện thoại"
                      pattern="[0-9]{10}"
                      required
                    />
                  </div>
                  <button type="submit">Lưu thông tin</button>
                </form>
              </div>
            ) : (
              <div className="settings-section">
                <h2>Thiết lập thiết bị</h2>
                <form onSubmit={handleDeviceSubmit}>
                  <div className="form-group">
                    <label>Ngày:</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Thời gian:</label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      required
                      step="1"
                    />
                  </div>
                  <div className="form-group">
                    <label>Tên WiFi:</label>
                    <input
                      type="text"
                      value={wifi.ssid}
                      onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })}
                      placeholder="Tên mạng WiFi"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Mật khẩu WiFi:</label>
                    <input
                      type="password"
                      value={wifi.password}
                      onChange={(e) => setWifi({ ...wifi, password: e.target.value })}
                      placeholder="Mật khẩu WiFi"
                      required
                    />
                  </div>
                  <button type="submit">Lưu thiết lập</button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}