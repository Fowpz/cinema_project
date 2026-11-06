import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { resolveImageUrl } from '../services/api';

const PALETTE = ['#1e3a5f', '#1a1a2e', '#1a2a1a', '#3a1a2e', '#2a2a1a'];

function colorFor(movieId) {
  const numericId = parseInt(movieId, 10) || 0;
  return PALETTE[numericId % PALETTE.length];
}

// Постер с фиксированным соотношением сторон 2:3.
// Картинка всегда показывается целиком (contain), без обрезки,
// а при ошибке загрузки вместо пустого блока рисуется заглушка.
export default function Poster({ uri, title, movieId, width, style }) {
  const [failedUri, setFailedUri] = useState(null);
  const showImage = Boolean(uri) && failedUri !== uri;

  return (
    <View
      style={[
        styles.box,
        { width, backgroundColor: colorFor(movieId) },
        style,
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: resolveImageUrl(uri) }}
          style={styles.image}
          resizeMode="contain"
          onError={() => setFailedUri(uri)}
          accessibilityLabel={title ? `Постер фильма «${title}»` : undefined}
        />
      ) : (
        <Text style={styles.placeholder} numberOfLines={4}>
          {title || 'Постер недоступен'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    aspectRatio: 2 / 3,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    padding: 8,
  },
});
