// Показывает системное подтверждение действия в мобильном приложении.
import { Alert } from 'react-native';

export function confirmAction(title, details) {
  return new Promise((resolve) => {
    Alert.alert(title, details, [
      { text: 'Отмена', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Удалить', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
