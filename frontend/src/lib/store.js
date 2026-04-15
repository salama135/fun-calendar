import { writable } from 'svelte/store';
import { FEATURES } from '../features';

export const appMode = writable('journal');
export const theme = writable(localStorage.getItem('theme-preference') || (window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light'));

// Persistence for theme
theme.subscribe(value => {
  document.documentElement.setAttribute('data-theme', value);
  localStorage.setItem('theme-preference', value);
});

export function switchMode(mode) {
  if (FEATURES.tabs[mode]) {
    appMode.set(mode);
  }
}

export function toggleTheme() {
  theme.update(current => current === 'dark' ? 'light' : 'dark');
}
