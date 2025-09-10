import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { logout } from '../authService';
import './Navbar.css';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/signin');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">Logo</Link>
      <ul className="navbar-menu">
        <li><Link to="/">Nhịp tim</Link></li>
        <li><Link to="/health">Lịch sử sức khỏe</Link></li>
        <li><Link to="/news">Thời tiết</Link></li>
      </ul>
      {user ? (
        <div className="user-controls">
          <span className="user-email">{user.email}</span>
          <button onClick={handleLogout} className="navbar-btn">
            Đăng xuất
          </button>
        </div>
      ) : (
        <Link to="/signin">
          <button className="navbar-btn">Đăng nhập</button>
        </Link>
      )}
    </nav>
  );
}
