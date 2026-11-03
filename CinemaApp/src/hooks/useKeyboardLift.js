import { useEffect, useRef, useState } from 'react';
import { Keyboard } from 'react-native';

// Когда открывается клавиатура, дополнительно прокручивает ScrollView вверх
// на `extra` пикселей и даёт запас внизу, чтобы поле ввода оказывалось
// заметно выше клавиатуры, а не прижатым к её краю.
export function useKeyboardLift(scrollRef, extra = 140) {
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const offsetY = useRef(0);

  useEffect(() => {
    let timer;
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardOpen(true);
      clearTimeout(timer);
      // Ждём, пока система сама подвинет поле и появится запас внизу.
      timer = setTimeout(() => {
        scrollRef.current?.scrollTo({
          y: offsetY.current + extra,
          animated: true,
        });
      }, 250);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      clearTimeout(timer);
      setKeyboardOpen(false);
    });
    return () => {
      clearTimeout(timer);
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollRef, extra]);

  const onScroll = (event) => {
    offsetY.current = event.nativeEvent.contentOffset.y;
  };

  return { keyboardOpen, onScroll };
}
