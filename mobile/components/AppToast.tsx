import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

type AppToastProps = {
  visible: boolean;
  title?: string;
  message: string;
  duration?: number;
  onHide: () => void;
};

export default function AppToast({
  visible,
  title,
  message,
  duration = 1600,
  onHide,
}: AppToastProps) {
  useEffect(() => {
    if (!visible) {
      return;
    }

    const timeout = setTimeout(() => {
      onHide();
    }, duration);

    return () => {
      clearTimeout(timeout);
    };
  }, [duration, onHide, visible]);

  if (!visible) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.wrapper}>
      <View style={styles.toast}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 18,
    zIndex: 999,
    alignItems: "center",
  },
  toast: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "rgba(17,17,17,0.95)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  title: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 4,
  },
  message: {
    color: "#fff",
    lineHeight: 20,
  },
});
