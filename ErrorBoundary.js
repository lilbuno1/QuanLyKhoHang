// ErrorBoundary.js
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, useTheme } from 'react-native-paper';
import Ionicons from 'react-native-vector-icons/Ionicons';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error: error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo: errorInfo });
    // Gửi lỗi lên Sentry nếu dùng: Sentry.captureException(error);
  }

  render() {
    if (this.state.hasError) {
      const fallbackBackgroundColor = this.props.theme?.colors?.background ?? '#ffffff';
      const fallbackTextColor = this.props.theme?.colors?.onBackground ?? '#000000';
      const errorColor = this.props.theme?.colors?.error ?? '#B00020';
      return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: fallbackBackgroundColor }]}>
          <View style={styles.content}>
            <Ionicons name="alert-circle-outline" size={60} color={errorColor}/>
            <Text variant="headlineSmall" style={[styles.title, { color: errorColor }]}>Oops! Đã xảy ra lỗi.</Text>
            <Text variant="bodyLarge" style={[styles.subtitle, { color: fallbackTextColor }]}>Ứng dụng đã gặp sự cố không mong muốn. Vui lòng thử khởi động lại.</Text>
            {!__DEV__ ? null : (
               <ScrollView style={styles.errorDetails}>
                  <Text selectable style={{ fontSize: 10, color: '#333' }}>{this.state.error && this.state.error.toString()}{"\n\n"}{this.state.errorInfo && this.state.errorInfo.componentStack}</Text>
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, }, container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, }, content: { justifyContent: 'center', alignItems: 'center', width: '100%', }, title: { marginTop: 15, marginBottom: 10, textAlign: 'center', }, subtitle: { marginBottom: 20, textAlign: 'center', }, errorDetails: { maxHeight: 150, width: '100%', backgroundColor: '#f0f0f0', padding: 10, marginVertical: 10, borderRadius: 5, borderWidth: 1, borderColor: '#ddd', }
});

export default ErrorBoundary;