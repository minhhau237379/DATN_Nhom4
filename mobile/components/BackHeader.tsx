import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ReactNode } from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

type BackHeaderProps = {
  title: string;
  backgroundColor?: string;
  titleColor?: string;
  iconColor?: string;
  containerStyle?: StyleProp<ViewStyle>;
  rightSlot?: ReactNode;
  onBack?: () => void;
};

export default function BackHeader({
  title,
  backgroundColor = "#d5001c",
  titleColor = "#fff7f7",
  iconColor = "#fff7f7",
  containerStyle,
  rightSlot,
  onBack,
}: BackHeaderProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor }, containerStyle]}>
      <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
        <Ionicons name="arrow-back" size={24} color={iconColor} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.rightSlot}>{rightSlot}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 56,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    marginHorizontal: 8,
  },
  rightSlot: {
    width: 36,
    alignItems: "flex-end",
  },
});
