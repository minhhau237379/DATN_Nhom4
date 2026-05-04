import { useEffect, useRef, useState } from "react";
import { Alert, Platform } from "react-native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { subscribeToAccountLock } from "../services/authLock";

export default function RootLayout() {
  const isHandling = useRef(false);

  useEffect(() => {
    const unsubscribe = subscribeToAccountLock(async ({ message }) => {
      if (isHandling.current) return;
      isHandling.current = true;

      // Xóa token + user
      await AsyncStorage.multiRemove(["token", "user"]);

      if (Platform.OS === "web") {
        window.alert(message || "Tài khoản đã bị khóa");
        router.replace("/login");
        isHandling.current = false;
      } else {
        Alert.alert("Tài khoản bị khóa", message || "Tài khoản đã bị khóa", [
          {
            text: "OK",
            onPress: () => {
              router.replace("/login");
              isHandling.current = false;
            },
          },
        ]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </>
  );
}
