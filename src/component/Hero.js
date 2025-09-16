import './Hero.css';

export default function Hero() {
    return (
        <section className="hero">
            <h1>Chào mừng đến với app quản lý sức khỏe của bạn</h1>
            <p>
                Trang quản lý sức khỏe của chúng tôi giúp bạn theo dõi nhịp tim và dự đoán tình trạng sức khỏe
                một cách chính xác.
            </p>
            <div className="hero-buttons">
                <button className="hero-btn-primary">
                    Khẩn cấp
                </button>
            </div>
            <div>
                <img
                    src="./src/c4d00151-0dd7-4984-b7d2-192cab7063a4.jpg"
                    alt="Healthy lifestyle"
                />
            </div>
        </section>
    );
}
