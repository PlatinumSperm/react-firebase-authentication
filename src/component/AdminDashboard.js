import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';
import mqtt from 'mqtt';

export default function AdminDashboard() {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [mqttData, setMqttData] = useState({});
    const navigate = useNavigate();
    const [client, setClient] = useState(null);

    // Kiểm tra xem người dùng hiện tại có phải là admin không
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user || user.email !== 'admin@admin.com') {
                navigate('/');
            }
        });

        return () => unsubscribe();
    }, [navigate]);

    // Kết nối MQTT và quản lý dữ liệu theo user
    useEffect(() => {
        const mqttClient = mqtt.connect('mqtt://broker.hivemq.com:1883');
        setClient(mqttClient);

        mqttClient.on('connect', () => {
            console.log('Connected to MQTT broker');
            // Khi có user được chọn, subscribe vào topic của user đó
            if (selectedUser) {
                const userTopic = `esp32/${selectedUser}/data`;
                mqttClient.subscribe(userTopic);
                console.log('Subscribed to:', userTopic);
            }
        });

        mqttClient.on('message', (topic, message) => {
            try {
                const data = JSON.parse(message.toString());
                setMqttData(prev => {
                    const userId = topic.split('/')[1]; // Lấy user ID từ topic
                    const userHistory = prev[userId] || [];
                    return {
                        ...prev,
                        [userId]: [
                            {
                                heart_rate: data.heart_rate,
                                spo2: data.spo2,
                                temperature: data.temperature,
                                status: data.status,
                                timestamp: data.timestamp
                            },
                            ...userHistory.slice(0, 49) // Giữ 50 bản ghi gần nhất
                        ]
                    };
                });
            } catch (error) {
                console.error('Error parsing MQTT message:', error);
            }
        });

        return () => {
            if (selectedUser) {
                mqttClient.unsubscribe(`esp32/${selectedUser}/data`);
            }
            mqttClient.end();
        };
    }, [selectedUser]);

    // Lấy danh sách người dùng từ Firestore
    useEffect(() => {
        const q = query(collection(db, "users"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const usersList = [];
            querySnapshot.forEach((doc) => {
                if (doc.data().email !== 'admin@admin.com') {
                    usersList.push({ id: doc.id, ...doc.data() });
                }
            });
            setUsers(usersList);
        });

        return () => unsubscribe();
    }, []);

    // Xử lý khi chọn user
    const handleUserSelect = (user) => {
        setSelectedUser(user.id);
    };

    return (
        <div className="admin-dashboard">
            <h1>Admin Dashboard</h1>
            
            <div className="dashboard-container">
                <div className="users-list">
                    <h2>Danh sách người dùng</h2>
                    {users.map(user => (
                        <button
                            key={user.id}
                            className={`user-button ${selectedUser === user.id ? 'selected' : ''}`}
                            onClick={() => handleUserSelect(user)}
                        >
                            {user.email}
                        </button>
                    ))}
                </div>

                <div className="data-display">
                    {selectedUser && (
                        <div className="mqtt-data">
                            <h2>Dữ liệu từ ESP32</h2>
                            <div className="data-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Heart Rate (BPM)</th>
                                            <th>SpO2 (%)</th>
                                            <th>Temperature (°C)</th>
                                            <th>Status</th>
                                            <th>Date & Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {mqttData[selectedUser] ? (
                                            mqttData[selectedUser].map((data, index) => (
                                                <tr key={index} className={`status-${data.status?.toLowerCase()}`}>
                                                    <td>{data.heart_rate?.toFixed(2) || 'N/A'}</td>
                                                    <td>{data.spo2?.toFixed(2) || 'N/A'}</td>
                                                    <td>{data.temperature?.toFixed(2) || 'N/A'}</td>
                                                    <td>{data.status || 'N/A'}</td>
                                                    <td>{data.timestamp || 'N/A'}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5">Không có dữ liệu</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
