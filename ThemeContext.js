// ThemeContext.js
import React from 'react';

// Tạo Context với giá trị mặc định
export const ThemeContext = React.createContext({
  themeMode: 'dark', // Giá trị mặc định ban đầu (sẽ được ghi đè bởi Provider trong App.js)
  toggleTheme: () => { console.log("toggleTheme function not yet initialized"); }, // Hàm placeholder
});