export const COLS = ['#2c2416', '#ff6b35', '#ffd93d', '#2ecc71', '#4ecdc4', '#3aa89f', '#5ba3d0', '#7c5cef', '#ff9f43', '#e74c3c', '#9a8f87'];
export const WS = [1, 3, 6, 12, 22];
export const MNS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DNS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function dkey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function getLocalDateStr(date) {
  const d = date || new Date();
  return dkey(d.getFullYear(), d.getMonth(), d.getDate());
}

export function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}
