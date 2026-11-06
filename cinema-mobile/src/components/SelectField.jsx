import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function SelectField({ label, value, options, onChange }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.options}
      >
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => onChange(option.value)}
            >
              <Text
                style={[styles.optionText, selected && styles.optionTextSelected]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 10 },
  label: { color: '#61758a', fontSize: 13, marginBottom: 7 },
  options: { gap: 7, paddingBottom: 2 },
  option: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f3f7fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e4ec',
  },
  optionSelected: { backgroundColor: '#e3f2fd', borderColor: '#9dcbe6' },
  optionText: { color: '#61758a', fontSize: 13 },
  optionTextSelected: { color: '#2589bd', fontWeight: '700' },
});
