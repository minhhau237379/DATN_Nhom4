import AsyncStorage from "@react-native-async-storage/async-storage";

export const getStoredToken = async () => {
  return AsyncStorage.getItem("token");
};

export const isLoggedIn = async () => {
  const token = await getStoredToken();
  return Boolean(token);
};
