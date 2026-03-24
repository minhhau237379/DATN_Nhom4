import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/css/splash.css";

function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const particlesContainer = document.getElementById("particles");

    function createParticles() {
      const particleCount = 50;

      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement("div");
        particle.className = "particle";

        particle.style.left = `${Math.random() * 100}vw`;
        particle.style.top = `${Math.random() * 100}vh`;

        const size = Math.random() * 3 + 1;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;

        particle.style.opacity = Math.random() * 0.5 + 0.3;
        particle.style.animationDelay = `${Math.random() * 15}s`;

        particlesContainer.appendChild(particle);
      }
    }

    createParticles();

    const loadingTexts = [
      "Đang tải ứng dụng...",
      "Khởi tạo hệ thống...",
      "Kết nối cơ sở dữ liệu...",
      "Sẵn sàng!",
      "Chào mừng đến với HoppyStore88!"
    ];

    let textIndex = 0;
    const loadingTextElement = document.getElementById("loadingText");

    const textInterval = setInterval(() => {
      loadingTextElement.style.opacity = "0.5";
      setTimeout(() => {
        loadingTextElement.textContent = loadingTexts[textIndex];
        loadingTextElement.style.opacity = "1";
        textIndex = (textIndex + 1) % loadingTexts.length;
      }, 300);
    }, 1500);

    const redirect = setTimeout(() => {
      document.body.style.opacity = "0.7";
      document.body.style.transition = "opacity 0.5s ease";

      setTimeout(() => {
        navigate("/products");
      }, 800);
    }, 5000);

    const handleClick = () => navigate("/products");
    document.body.addEventListener("click", handleClick);

    return () => {
      clearInterval(textInterval);
      clearTimeout(redirect);

      document.body.removeEventListener("click", handleClick);

      const particlesContainer = document.getElementById("particles");
      if (particlesContainer) {
        particlesContainer.innerHTML = "";
      }

      document.body.style.opacity = "1";
      document.body.style.transition = "";
    };
  }, [navigate]);

  return (
    <div className="splash-page">
      <div className="particles" id="particles"></div>

      <div className="splash-container">
        <div className="logo-container">
          <img
            src="/images/UI/logo.jpg"
            alt="HoppyStore88 Logo"
            className="logo"
          />
        </div>

        <h1 className="app-name">HoppyStore88</h1>

        <p className="app-tagline">
          Nền tảng mua sắm thông minh - Kết nối người tiêu dùng với những sản
          phẩm chất lượng nhất
        </p>

        <div className="features">
          <div className="feature">🛒 Mua sắm tiện lợi</div>
          <div className="feature">🚚 Giao hàng nhanh</div>
          <div className="feature">⭐ Đảm bảo chất lượng</div>
        </div>

        <div className="loading-container">
          <div className="loading-text" id="loadingText">
            Đang tải ứng dụng...
          </div>

          <div className="loading-bar">
            <div className="loading-progress"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Splash;