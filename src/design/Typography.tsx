import { Text, View } from "react-native";
import { useTheme } from "../theme";
export function PageHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  const { styles } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.body}>{subtitle}</Text>}
    </View>
  );
}
