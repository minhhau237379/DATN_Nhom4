import { useState } from "react";
import "../assets/css/register.css";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function Register() {

  const [form,setForm] = useState({
    username:"",
    email:"",
    phoneNumber:"",
    password:"",
    confirmPassword:""
  });

  const [showPassword,setShowPassword] = useState(false);
  const [showConfirmPassword,setShowConfirmPassword] = useState(false);

  const [errors,setErrors] = useState({});
  const [message,setMessage] = useState(null);
  const [loading,setLoading] = useState(false);

  const handleChange = (e)=>{
    setForm({...form,[e.target.name]:e.target.value});
  };

  const validatePassword = ()=>{

    const {password} = form;

    if(password.length < 8 || password.length > 16)
      return "Mật khẩu phải từ 8-16 ký tự";

    if(!/[A-Z]/.test(password))
      return "Phải có ít nhất 1 chữ hoa";

    if(!/[!@#$%^&*]/.test(password))
      return "Phải có ít nhất 1 ký tự đặc biệt";

    return null;
  };

  const handleSubmit = async (e)=>{

    e.preventDefault();
    setErrors({});

    const newErrors = {};

    const passwordError = validatePassword();

    if(passwordError)
      newErrors.password = passwordError;

    if(form.password !== form.confirmPassword)
      newErrors.confirmPassword = "Mật khẩu không khớp";

    if(!/^[0-9]{10,11}$/.test(form.phoneNumber))
      newErrors.phoneNumber = "Số điện thoại phải 10-11 số";

    if(Object.keys(newErrors).length){
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try{

      const res = await api.post("/auth/register",{
        username:form.username,
        email:form.email,
        phoneNumber:form.phoneNumber,
        password:form.password
      });

      const data = res.data;

      if(data.success){

        setMessage({
          type:"success",
          text:"Đăng ký thành công!"
        });

        setTimeout(()=>{
          window.location.href="/login?registered=true";
        },1500);

      }else{

        setMessage({
          type:"danger",
          text:data.message || "Đăng ký thất bại"
        });

      }

    }catch(err){

      console.error(err);

      setMessage({
        type:"danger",
        text:"Lỗi kết nối server"
      });

    }

    setLoading(false);

  };

  return(

    <div className="register-page">

      <div className="register-container">

        <div className="header">

          <img src="/images/UI/logo.jpg" className="logo"/>

          <h1 className="title">Tạo Tài Khoản</h1>

          <p className="subtitle">
            Tham gia cùng chúng tôi ngay hôm nay
          </p>

        </div>

        {message && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label className="form-label">Tên đăng nhập</label>

            <input
              name="username"
              className="form-control"
              value={form.username}
              onChange={handleChange}
              required
            />

          </div>

          <div className="form-group">

            <label className="form-label">Email</label>

            <input
              name="email"
              type="email"
              className="form-control"
              value={form.email}
              onChange={handleChange}
              required
            />

          </div>

          <div className="form-group">

            <label className="form-label">
              Số điện thoại
            </label>

            <input
              name="phoneNumber"
              className="form-control"
              value={form.phoneNumber}
              onChange={handleChange}
            />

            {errors.phoneNumber && (
              <div className="error">
                {errors.phoneNumber}
              </div>
            )}

          </div>

          <div className="form-group">

            <label className="form-label">
              Mật khẩu
            </label>

            <div className="password-wrapper">

              <input
                type={showPassword ? "text":"password"}
                name="password"
                className="form-control"
                value={form.password}
                onChange={handleChange}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={()=>setShowPassword(!showPassword)}
              >
                <img
                  src={
                    showPassword ? "/images/UI/show.jpg" : "/images/UI/hide.jpg"
                  }
                  alt="toggle"
                />
              </button>

            </div>

            {errors.password && (
              <div className="error">
                {errors.password}
              </div>
            )}

          </div>

          <div className="form-group">

            <label className="form-label">
              Xác nhận mật khẩu
            </label>

            <div className="password-wrapper">

              <input
                type={showConfirmPassword ? "text":"password"}
                name="confirmPassword"
                className="form-control"
                value={form.confirmPassword}
                onChange={handleChange}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={()=>setShowConfirmPassword(!showConfirmPassword)}
              >
                <img
                  src={
                    showConfirmPassword  ? "/images/UI/show.jpg" : "/images/UI/hide.jpg"
                  }
                  alt="toggle"
                />
              </button>

            </div>

            {errors.confirmPassword && (
              <div className="error">
                {errors.confirmPassword}
              </div>
            )}

          </div>

          <button
            className="btn-register"
            disabled={loading}
          >

            {loading ? "Đang xử lý..." : "Tạo tài khoản"}

          </button>

        </form>

        <div className="links">
          <Link to="/login">Đã có tài khoản? Đăng nhập</Link>
        </div>

      </div>

    </div>

  );

}