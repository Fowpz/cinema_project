// Выбор постера на телефоне: загрузка из галереи или буфера обмена.
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

// Постер можно выбрать из галереи или вставить из буфера обмена.
export default function PosterPicker({ value, onChange }) {
  const [error, setError] = useState(null);

  const pickFromGallery = async () => {
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        base64: true,
      });
      if (result.canceled) return;
      const { base64, mimeType } = result.assets[0];
      onChange(`data:${mimeType || 'image/jpeg'};base64,${base64}`);
    } catch {
      setError('Не удалось открыть галерею');
    }
  };

  const pasteFromClipboard = async () => {
    setError(null);
    try {
      const image = await Clipboard.getImageAsync({
        format: 'jpeg',
        jpegQuality: 0.8,
      });
      if (image) onChange(image.data);
      else setError('В буфере обмена нет картинки');
    } catch {
      setError('Не удалось прочитать буфер обмена');
    }
  };

  return (
    <View>
      <Text style={styles.label}>Постер</Text>
      {value && (
        <>
          <Image
            source={{ uri: value }}
            style={styles.preview}
            resizeMode="contain"
          />
          <Pressable onPress={() => onChange(null)}>
            <Text style={styles.link}>Убрать постер</Text>
          </Pressable>
        </>
      )}
      <View style={styles.buttons}>
        <Pressable style={styles.button} onPress={pickFromGallery}>
          <Text style={styles.buttonText}>Из галереи</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={pasteFromClipboard}>
          <Text style={styles.buttonText}>Из буфера</Text>
        </Pressable>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: '#61758a', fontSize: 13, marginBottom: 7 },
  preview: {
    width: 120,
    aspectRatio: 2 / 3,
    borderRadius: 10,
    backgroundColor: '#f3f7fa',
    marginBottom: 8,
  },
  link: { color: '#d95c5c', fontWeight: '600', fontSize: 13, marginBottom: 10 },
  error: { color: '#d95c5c', fontSize: 13, marginBottom: 10 },
  buttons: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  button: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#9dcbe6',
    borderRadius: 10,
    backgroundColor: '#f6fbfe',
    padding: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#2589bd', fontWeight: '700' },
});
