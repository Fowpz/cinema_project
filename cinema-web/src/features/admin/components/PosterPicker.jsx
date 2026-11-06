// Выбор постера на компьютере: загрузка файла или вставка картинки из буфера.
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function readPosterFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Выберите файл с картинкой'));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      reject(new Error('Постер слишком большой, максимум 10 МБ'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsDataURL(file);
  });
}

// Постер можно выбрать файлом с компьютера или вставить из буфера обмена (Ctrl+V).
export default function PosterPicker({ value, onChange }) {
  const [error, setError] = useState(null);

  useEffect(() => {
    const handlePaste = (event) => {
      const item = [...event.clipboardData.items].find((clipboardItem) =>
        clipboardItem.type.startsWith('image/'),
      );
      // Обычный текст остаётся в поле, куда его вставляют.
      if (!item) return;
      event.preventDefault();
      readPosterFile(item.getAsFile())
        .then((image) => {
          onChange(image);
          setError(null);
        })
        .catch((readError) => setError(readError.message));
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onChange]);

  const openFileDialog = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/gif';
    input.onchange = () => {
      if (!input.files[0]) return;
      readPosterFile(input.files[0])
        .then((image) => {
          onChange(image);
          setError(null);
        })
        .catch((readError) => setError(readError.message));
    };
    input.click();
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
      <Pressable style={styles.dropzone} onPress={openFileDialog}>
        <Text style={styles.dropzoneTitle}>
          {value ? 'Выбрать другой файл' : 'Выбрать файл'}
        </Text>
        <Text style={styles.dropzoneHint}>
          или скопируйте картинку и нажмите Ctrl+V. JPG, PNG, WEBP, GIF, до 10 МБ
        </Text>
      </Pressable>
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
  dropzone: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#9dcbe6',
    borderRadius: 10,
    backgroundColor: '#f6fbfe',
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  dropzoneTitle: { color: '#2589bd', fontWeight: '700', marginBottom: 4 },
  dropzoneHint: { color: '#61758a', fontSize: 12, textAlign: 'center' },
});
