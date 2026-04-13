// import { useEffect, useRef, useState } from "react";
// import { AppState, AppStateStatus } from "react-native";
// import { Stack, router } from "expo-router";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { StatusBar } from "expo-status-bar";
// import AppDialog from "../components/AppDialog";
// import api from "../services/api";
// import { subscribeToAccountLock } from "../services/authLock";
// import { getStoredToken } from "../utils/auth";

// const POLL_INTERVAL_MS = 5000;

// export default function RootLayout() {
//   const [lockVisible, setLockVisible] = useState(false);
//   const [lockMessage, setLockMessage] = useState("");
//   const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
//   const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
//   const checkingRef = useRef(false);
//   const shuttingDownRef = useRef(false);

//   const clearTimers = () => {
//     if (intervalRef.current) {
//       clearInterval(intervalRef.current);
//       intervalRef.current = null;
//     }

//     if (timeoutRef.current) {
//       clearTimeout(timeoutRef.current);
//       timeoutRef.current = null;
//     }
//   };

//   const performLogout = async () => {
//     if (shuttingDownRef.current) {
//       return;
//     }

//     shuttingDownRef.current = true;
//     clearTimers();

//     setLockVisible(false);
//     setLockMessage("");

//     await AsyncStorage.removeItem("token");
//     await AsyncStorage.removeItem("user");
//     router.replace("/login");

//     setTimeout(() => {
//       shuttingDownRef.current = false;
//     }, 1000);
//   };

//   useEffect(() => {
//     const unsubscribe = subscribeToAccountLock(({ message }) => {
//       if (shuttingDownRef.current) {
//         return;
//       }

//       setLockMessage(message);
//       setLockVisible(true);

//       if (timeoutRef.current) {
//         clearTimeout(timeoutRef.current);
//       }

//       timeoutRef.current = setTimeout(() => {
//         performLogout();
//       }, 1500);
//     });

//     return () => {
//       unsubscribe();
//       clearTimers();
//     };
//   }, []);

//   const checkAccountState = async () => {
//     if (checkingRef.current || shuttingDownRef.current) {
//       return;
//     }

//     const token = await getStoredToken();
//     if (!token) {
//       return;
//     }

//     checkingRef.current = true;

//     try {
//       await api.get("/profile/info");
//     } catch (error) {
//       if (!error || typeof error !== "object") {
//         return;
//       }
//     } finally {
//       checkingRef.current = false;
//     }
//   };

//   useEffect(() => {
//     checkAccountState();

//     intervalRef.current = setInterval(() => {
//       checkAccountState();
//     }, POLL_INTERVAL_MS);

//     const sub = AppState.addEventListener(
//       "change",
//       (state: AppStateStatus) => {
//         if (state === "active") {
//           checkAccountState();
//         }
//       },
//     );

//     return () => {
//       sub.remove();
//       clearTimers();
//     };
//   }, []);

//   return (
//     <>
//       <Stack screenOptions={{ headerShown: false }} />

//       <AppDialog
//         visible={lockVisible}
//         title="Tài khoản đã bị khóa"
//         message={lockMessage || "Tài khoản của bạn đã bị khóa."}
//         confirmText="Đăng nhập lại"
//         onClose={performLogout}
//         onConfirm={performLogout}
//       />

//       <StatusBar style="auto" />
//     </>
//   );
// }
