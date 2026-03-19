import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type AppDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onClose: () => void;
};

export default function AppDialog({
  visible,
  title,
  message,
  confirmText = "Dong",
  cancelText,
  onConfirm,
  onClose,
}: AppDialogProps) {
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
      return;
    }

    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            {cancelText ? (
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>{cancelText}</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.confirmBtn, !cancelText && styles.singleBtn]}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  box: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  actions: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#eee",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelText: {
    color: "#333",
    fontWeight: "600",
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: "#e53935",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  singleBtn: {
    flex: 0,
    minWidth: 120,
    paddingHorizontal: 24,
  },
  confirmText: {
    color: "#fff",
    fontWeight: "700",
  },
});
