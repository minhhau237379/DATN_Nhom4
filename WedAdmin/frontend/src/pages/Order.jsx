import { useEffect, useState } from "react";
import "../assets/css/order.css";
import BottomNav from "../components/BottomNav";

export default function Order() {

  const [orders,setOrders] = useState([]);

  useEffect(()=>{
    fetch("/api/orders",{credentials:"include"})
      .then(res=>res.json())
      .then(data=>{
        if(data.success) setOrders(data.data);
      });
  },[]);

  const getStatusText=(status)=>{
    const map={
      pending:"Chờ xử lý",
      processing:"Đang xử lý",
      shipped:"Đang giao hàng",
      delivered:"Đã giao",
      cancelled:"Đã hủy"
    };
    return map[status]||status;
  };

  const cancelOrder=async(orderId)=>{

    if(!window.confirm("Bạn có chắc chắn muốn hủy đơn hàng này?")) return;

    const reason=prompt("Lý do hủy đơn hàng:");
    if(!reason) return;

    const res=await fetch(`/orders/${orderId}/cancel`,{
      method:"PUT",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({reason})
    });

    const result=await res.json();

    if(result.success){
      alert("Đã hủy đơn hàng thành công");
      window.location.reload();
    }else{
      alert("Lỗi: "+result.message);
    }

  };

  return(

    <main className="container orders-page">

      <h1>Đơn hàng của tôi</h1>

      <div className="orders-list">

        {orders.length>0 ? (

          orders.map(order=>(
            <div className="order-card" key={order._id}>

              <div className="order-header">

                <div>
                  <h3>Mã đơn: #{order._id.slice(-6)}</h3>
                  <p className="order-date">
                    Đặt ngày: {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                  </p>
                </div>

                <div className={`order-status ${order.orderStatus}`}>
                  {getStatusText(order.orderStatus)}
                </div>

              </div>

              <div className="order-items">

                {order.items.slice(0,2).map((item,i)=>(
                  <div className="order-item" key={i}>

                    <img
                      src={item.image || "/images/no-image.png"}
                      alt={item.name || "Sản phẩm"}
                    />

                    <div className="item-info">
                      <h4>{item.name || "Sản phẩm đã xóa"}</h4>
                      <p>Số lượng: {item.quantity}</p>
                    </div>

                  </div>
                ))}

                {order.items.length>2 && (
                  <p className="more-items">
                    +{order.items.length-2} sản phẩm khác
                  </p>
                )}

              </div>

              <div className="order-footer">

                <div className="order-total">
                  Tổng cộng:
                  <strong>
                    {" "}
                    {order.totalPrice.toLocaleString()}
                  </strong>
                </div>

                <div className="order-actions">

                  <a
                    href={`/orders/${order._id}`}
                    className="btn btn-outline"
                  >
                    Xem chi tiết
                  </a>

                  {order.orderStatus==="pending" && (
                    <button
                      className="btn btn-danger"
                      onClick={()=>cancelOrder(order._id)}
                    >
                      Hủy đơn
                    </button>
                  )}

                </div>

              </div>

            </div>
          ))

        ):(

          <div className="empty-orders">

            <p>Bạn chưa có đơn hàng nào</p>

            <a href="/shop" className="btn btn-primary">
              Mua sắm ngay
            </a>

          </div>

        )}

      </div>

    </main>

  );

}