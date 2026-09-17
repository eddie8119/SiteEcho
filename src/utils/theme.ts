export const Theme_COLOR = {
  LIGHT: 'light',
  DARK: 'dark',
} as const;

export type Theme = (typeof Theme_COLOR)[keyof typeof Theme_COLOR];

export function initTheme() {
  const savedTheme = localStorage.getItem('theme') as Theme | null;
  if (savedTheme === Theme_COLOR.DARK) {
    document.documentElement.classList.add(Theme_COLOR.DARK);
  } else {
    document.documentElement.classList.remove(Theme_COLOR.DARK);
  }
  return savedTheme === Theme_COLOR.DARK;
}

export function setTheme(isDark: boolean) {
  const theme = isDark ? Theme_COLOR.DARK : Theme_COLOR.LIGHT;
  localStorage.setItem('theme', theme);

  if (isDark) {
    document.documentElement.classList.add(Theme_COLOR.DARK);
  } else {
    document.documentElement.classList.remove(Theme_COLOR.DARK);
  }
}
