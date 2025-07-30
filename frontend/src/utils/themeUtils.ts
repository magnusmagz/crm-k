export const getThemeClasses = (primaryColor: string) => {
  // For dynamic styling, we'll use inline styles for backgrounds and borders
  // This is because Tailwind doesn't support dynamic class generation
  return {
    primaryBg: { backgroundColor: primaryColor },
    primaryText: { color: primaryColor },
    primaryBorder: { borderColor: primaryColor },
    primaryRing: { 
      boxShadow: `0 0 0 2px ${primaryColor}`,
      outline: 'none' 
    },
    primaryButton: {
      backgroundColor: primaryColor,
      color: 'white',
    },
    primaryButtonHover: {
      backgroundColor: adjustColor(primaryColor, -20), // Darken by 20%
      color: 'white',
    }
  };
};

// Helper function to darken/lighten a color
function adjustColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (
    0x1000000 +
    (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)
  ).toString(16).slice(1);
}