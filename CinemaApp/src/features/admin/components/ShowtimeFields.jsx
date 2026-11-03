import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import SelectField from '../../../components/SelectField';
import { buildDateOptions } from '../options';

// Поля одного сеанса: зал, дата, время и цена.
export default function ShowtimeFields({ value, halls, onChange }) {
  const dateOptions = useMemo(() => buildDateOptions(), []);

  return (
    <View>
      <Text style={styles.label}>Зал</Text>
      <View style={styles.halls}>
        {halls.map((hall) => (
          <Pressable
            key={hall.id}
            style={[
              styles.hallChip,
              hall.id === value.hallId && styles.hallChipActive,
            ]}
            onPress={() => onChange({ hallId: hall.id })}
          >
            <Text
              style={[
                styles.hallText,
                hall.id === value.hallId && styles.hallTextActive,
              ]}
            >
              {hall.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <SelectField
        label="Дата сеанса"
        value={value.date}
        options={dateOptions}
        onChange={(date) => onChange({ date })}
      />

      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.half]}
          value={value.time}
          onChangeText={(time) => onChange({ time })}
          placeholder="Время, ЧЧ:ММ"
          placeholderTextColor="#7890a4"
          keyboardType="numbers-and-punctuation"
        />
        <TextInput
          style={[styles.input, styles.half]}
          value={String(value.price)}
          onChangeText={(price) => onChange({ price: Number(price) || 0 })}
          keyboardType="number-pad"
          placeholder="Цена, ₽"
          placeholderTextColor="#7890a4"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: '#61758a', fontSize: 13, marginBottom: 7 },
  halls: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 },
  hallChip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f3f7fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e4ec',
  },
  hallChipActive: { backgroundColor: '#e3f2fd', borderColor: '#9dcbe6' },
  hallText: { color: '#61758a', fontSize: 13 },
  hallTextActive: { color: '#2589bd', fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cddce8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: '#17324d',
    fontSize: 15,
    marginBottom: 10,
  },
});
