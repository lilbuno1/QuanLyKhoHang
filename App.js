// App.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Appearance, LogBox, View, StyleSheet } from 'react-native'; // Thêm StyleSheet
import AppNavigator from './navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider, MD3LightTheme, MD3DarkTheme, Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ErrorBoundary from './ErrorBoundary';
import { ThemeContext } from './ThemeContext';

LogBox.ignoreLogs(['VirtualizedLists should never be nested']);

const BACKGROUND_THEME_KEY = '@QuanLyKhoHang:backgroundTheme';

const customColors = { success: '#198754', onSuccess: '#ffffff', info: '#0dcaf0', onInfo: '#ffffff', warning: '#ffc107', onWarning: '#333333',};
const LightAppTheme = { ...MD3LightTheme, roundness: 8, colors: { ...MD3LightTheme.colors, ...customColors, }, };
const DarkAppTheme = { ...MD3DarkTheme, roundness: 8, colors: { ...MD3DarkTheme.colors, ...customColors, }, };

export default function App() {
  const [themeMode, setThemeMode] = useState('dark'); // Mặc định tối
  // console.log(`[App.js] Initializing state themeMode = ${themeMode}`);

  useEffect(() => {
    let isMounted = true;
    // console.log("[App.js] useEffect: Mounting. Attempting to load theme...");
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(BACKGROUND_THEME_KEY);
        // console.log(`[App.js] useEffect: Loaded savedTheme = ${savedTheme}`);
        if (isMounted) {
          if (savedTheme === 'light') { setThemeMode('light'); }
          else { setThemeMode('dark'); }
        }
      } catch (error) { console.error("[App.js] Failed to load theme preference:", error); if (isMounted) { setThemeMode('dark'); } }
    };
    loadTheme();
    return () => { isMounted = false; /* console.log("[App.js] useEffect: Unmounting."); */ };
  }, []);

  const toggleTheme = useCallback(async () => {
    // console.log(`[App.js] toggleTheme: Called. Current themeMode = ${themeMode}`);
    const newThemeMode = themeMode === 'dark' ? 'light' : 'dark';
    // console.log(`[App.js] toggleTheme: New themeMode will be = ${newThemeMode}`);
    // console.log(`[App.js] toggleTheme: Calling setThemeMode(${newThemeMode})...`);
    setThemeMode(newThemeMode);
    try {
      // console.log(`[App.js] toggleTheme: Saving '${newThemeMode}' to AsyncStorage...`);
      await AsyncStorage.setItem(BACKGROUND_THEME_KEY, newThemeMode);
      // console.log(`[App.js] toggleTheme: Successfully saved '${newThemeMode}'`);
    } catch (error) { console.error("[App.js] toggleTheme: Failed to save theme preference:", error); }
  }, [themeMode]);

  const paperTheme = useMemo(() => {
    // console.log(`[App.js] useMemo: Calculating paperTheme. Current themeMode state = ${themeMode}`);
    const baseTheme = themeMode === 'dark' ? DarkAppTheme : LightAppTheme;
    if (!baseTheme || !baseTheme.colors) { console.error("[App.js] useMemo: CRITICAL FALLBACK! baseTheme invalid. Returning Dark."); return DarkAppTheme; }
    // console.log(`[App.js] useMemo: Calculated baseTheme is ${themeMode === 'dark' ? 'DarkAppTheme' : 'LightAppTheme'}`);
    return baseTheme;
  }, [themeMode]);

  const contextValue = useMemo(() => {
    // console.log(`[App.js] useMemo: Creating contextValue with themeMode = ${themeMode}`);
    return { themeMode, toggleTheme };
  }, [themeMode, toggleTheme]);

  // console.log(`[App.js] RENDERING. Current themeMode state = ${themeMode}`);
  // console.log("[App.js] Final theme passed to PaperProvider:", paperTheme ? 'OK' : 'UNDEFINED!');
  // if(paperTheme) { console.log("[App.js] Theme colors available:", !!paperTheme.colors); }

  if (!paperTheme || !paperTheme.colors) {
      console.error("[App.js] CRITICAL RENDER BLOCK: paperTheme invalid!", paperTheme);
      return ( <SafeAreaProvider><View style={styles.fallbackContainer}><Text style={styles.fallbackText}>Lỗi nghiêm trọng: Không thể tải giao diện.</Text></View></SafeAreaProvider> );
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      <SafeAreaProvider>
        <PaperProvider theme={paperTheme}>
          {/* Truyền theme xuống ErrorBoundary để Fallback UI dùng được theme */}
          <ErrorBoundary theme={paperTheme}>
            <AppNavigator />
          </ErrorBoundary>
        </PaperProvider>
      </SafeAreaProvider>
    </ThemeContext.Provider>
  );
}

const styles = StyleSheet.create({
    fallbackContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#1c1b1f' },
    fallbackText: { fontSize: 18, color: '#f2b8b5', textAlign: 'center' }
});