// Показывает подтверждение действия в браузере.
export async function confirmAction(title, details) {
  return window.confirm(`${title}\n${details}`);
}
