/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          dark: 'rgb(var(--color-primary-dark) / <alpha-value>)',
          light: 'rgb(var(--color-primary-light) / <alpha-value>)',
        }
      },
      backgroundColor: {
        primary: 'rgb(var(--color-primary))',
        'primary-dark': 'rgb(var(--color-primary-dark))',
        'primary-light': 'rgb(var(--color-primary-light))',
      },
      textColor: {
        primary: 'rgb(var(--color-primary))',
        'primary-dark': 'rgb(var(--color-primary-dark))',
      },
      borderColor: {
        primary: 'rgb(var(--color-primary))',
        'primary-dark': 'rgb(var(--color-primary-dark))',
      },
      ringColor: {
        primary: 'rgb(var(--color-primary))',
      },
    },
    fontSize: {
      // Override Tailwind's default font sizes to ensure minimum 16px
      'xs': ['16px', '20px'],    // was 12px - now 16px for accessibility
      'sm': ['16px', '20px'],    // was 14px - now 16px for accessibility  
      'base': ['16px', '24px'],  // stays 16px
      'lg': ['18px', '28px'],    // stays 18px
      'xl': ['20px', '28px'],    // stays 20px
      '2xl': ['24px', '32px'],   // stays 24px
      '3xl': ['30px', '36px'],   // stays 30px
      '4xl': ['36px', '40px'],   // stays 36px
      '5xl': ['48px', '1'],      // stays 48px
      '6xl': ['60px', '1'],      // stays 60px
      '7xl': ['72px', '1'],      // stays 72px
      '8xl': ['96px', '1'],      // stays 96px
      '9xl': ['128px', '1'],     // stays 128px
    },
  },
  plugins: [],
}