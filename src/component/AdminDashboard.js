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
    const [mqttData, setMqttData] = useState([]);
    const navigate = useNavigate();

    // ✅ Kiểm tra admin
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user || user.email !== 'admin@admin.com') {
                navigate('/');
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    // ✅ Kết nối MQTT và lấy dữ liệu từ topic thongtinbenhnhan
    useEffect(() => {
        const client = mqtt.connect('wss://broker.emqx.io:8084/mqtt');

        client.on('connect', () => {
            console.log('Connected to MQTT broker');
            client.subscribe('thongtinbenhnhan', (err) => {
                if (!err) {
                    console.log('Subscribed to thongtinbenhnhan');
                }
            });
        });

        client.on('message', (topic, message) => {
            try {
                const data = JSON.parse(message.toString());
                setMqttData((prev) => [
                    {
                        heart_rate: data.heart_rate,
                        spo2: data.spo2,
                        status: data.status,
                        timestamp: data.timestamp,
                    },
                    ...prev.slice(0, 49), // giữ 50 bản ghi gần nhất
                ]);
            } catch (error) {
                console.error('Error parsing MQTT message:', error);
            }
        });

        return () => {
            client.end();
        };
    }, []);

    // ✅ Lấy danh sách người dùng từ Firestore
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

    return (
        <div className="admin-dashboard">
            <h1>Admin Dashboard</h1>
            
            <div className="dashboard-container">
                {/* Cột danh sách user */}
                <div className="users-list">
                    <h2>Danh sách người dùng</h2>
                    {users.map(user => (
                        <button
                            key={user.id}
                            className={`user-button ${selectedUser === user.id ? 'selected' : ''}`}
                            onClick={() => setSelectedUser(user.id)}
                        >
                            {user.email}
                        </button>
                    ))}
                </div>

                {/* Cột dữ liệu MQTT */}
                <div className="data-display">
                    <h2>Dữ liệu bệnh nhân (real-time)</h2>
                    <div className="data-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Heart Rate (BPM)</th>
                                    <th>SpO2 (%)</th>
                                    <th>Status</th>
                                    <th>Date & Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mqttData.length > 0 ? (
                                    mqttData.map((data, index) => (
                                        <tr key={index} className={`status-${data.status?.toLowerCase()}`}>
                                            <td>
                                                {typeof data.heart_rate === "number"
                                                    ? data.heart_rate.toFixed(2)
                                                    : "N/A"}
                                            </td>
                                            <td>
                                                {typeof data.spo2 === "number"
                                                    ? data.spo2.toFixed(2)
                                                    : "N/A"}
                                            </td>
                                            <td>{data.status || "N/A"}</td>
                                            <td>
                                                {data.timestamp
                                                    ? new Date(data.timestamp).toLocaleString()
                                                    : "N/A"}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4">Chưa có dữ liệu</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
