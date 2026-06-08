import { Alert as NativeAlert, Platform } from 'react-native';

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

// WHY: react-native-web ships Alert.alert as a hard no-op (`static alert() {}`),
// so confirmation dialogs and success/error messages silently do nothing on web.
// This wrapper reimplements the same call signature using window.confirm/alert there.
const Alert = {
  alert(title?: string, message?: string, buttons?: AlertButton[]) {
    if (Platform.OS !== 'web') {
      NativeAlert.alert(title, message, buttons);
      return;
    }

    const text = [title, message].filter(Boolean).join('\n\n');

    if (!buttons || buttons.length <= 1) {
      window.alert(text);
      buttons?.[0]?.onPress?.();
      return;
    }

    const cancelButton = buttons.find((b) => b.style === 'cancel');
    const confirmButton = buttons.find((b) => b !== cancelButton);

    if (window.confirm(text)) {
      confirmButton?.onPress?.();
    } else {
      cancelButton?.onPress?.();
    }
  },
};

export default Alert;
