import type { Config } from "tailwindcss";

const config: Config = {
  // Tailwind පාවිච්චි කරන හැම file එකක්ම මෙතන සඳහන් කරන්න ඕනේ 
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ඔයාගේ Next.js project එකේ කලින් තිබ්බ colors 
        'rose-brand': {
          light: '#fff1f2',
          soft: '#fda4af',
          DEFAULT: '#fb7185',
          dark: '#be185d',
        },
        'ls-gold': '#f59e0b',
        'ls-bg': '#fffafb',

        // index.html එකේ තිබ්බ "Pink Store" colors [cite: 140]
        'mudalali-green': {
          light: '#fbcfe8',       /* Light Pink */
          DEFAULT: '#db2777',     /* Hot Pink */
          dark: '#be185d',        /* Dark Pink */
        },
        'mudalali-gold': '#fce7f3',
        'mudalali-red': '#be123c',
        'mudalali-bg': '#ffffff',
        'mm-gray': { 
          light: '#fff1f2',
          DEFAULT: '#f3f4f6',
        }
      },
      // Font එක Poppins වලට set කරමු (index.html එකේ විදියට) [cite: 140]
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;