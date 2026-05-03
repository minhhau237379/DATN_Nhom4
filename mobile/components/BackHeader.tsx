import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ReactNode } from "react";
import {
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type BackHeaderProps = {
  title: string;
  backgroundColor?: string;
  titleColor?: string;
  iconColor?: string;
  containerStyle?: StyleProp<ViewStyle>;
  rightSlot?: ReactNode;
  onBack?: () => void;
  /** Tab chính: không hiện nút back nhưng vẫn giữ khoảng trống 40px hai bên để tiêu đề căn giống màn có back (vd. Địa chỉ). */
  showBack?: boolean;
};

export default function BackHeader({
  title,
  backgroundColor = "#d5001c",
  titleColor = "#fff7f7",
  iconColor = "#fff7f7",
  containerStyle,
  rightSlot,
  onBack,
  showBack = true,
}: BackHeaderProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    router.back();
  };

  /**
   * Không dùng paddingTop = insets.top tay: trong native-stack (headerShown: false)
   * hook đôi khi = 0 ở frame đầu → nút back vẫn nằm dưới status bar / Dynamic Island.
   * SafeAreaView (edges top) đo inset đúng và áp vào layout ổn định hơn.
   */
  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.safeRoot, { backgroundColor }]}
    >
      <View style={[styles.container, containerStyle]}>
        {showBack ? (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          >
            <Ionicons name="arrow-back" size={24} color={iconColor} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}

        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.rightSlot}>{rightSlot}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeRoot: {},
  container: {
    minHeight: 52,
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: Platform.OS === "ios" ? 6 : 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    marginHorizontal: 8,
  },
  rightSlot: {
    width: 40,
    alignItems: "flex-end",
  },
});
