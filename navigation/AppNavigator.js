// navigation/AppNavigator.js (Đã xóa định nghĩa AddTaskScreen thừa)
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from 'react-native-paper';

// --- Import các màn hình ---
// Đảm bảo tất cả các màn hình bạn dùng đều được import đúng đường dẫn
import DashboardScreen from '../screens/DashboardScreen';
import AddProductScreen from '../screens/AddProductScreen';
import OutOfStockScreen from '../screens/OutOfStockScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import EditProductScreen from '../screens/EditProductScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProductListScreen from '../screens/ProductListScreen';
import TaskListScreen from '../screens/TaskListScreen';
import AddTaskScreen from '../screens/AddTaskScreen'; // <<< ĐẢM BẢO IMPORT NÀY ĐÚNG
// import ReceiveGoodsScreen from '../screens/ReceiveGoodsScreen'; // Đã xóa theo yêu cầu
// --- Kết thúc Import ---

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// --- Tab Navigator Chính ---
// Hàm này định nghĩa các tab ở dưới cùng màn hình
function MainTabs() {
  const theme = useTheme();
  return (
    <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'Dashboard') { iconName = focused ? 'speedometer' : 'speedometer-outline'; }
            else if (route.name === 'Lịch Sử') { iconName = focused ? 'time' : 'time-outline'; }
            else if (route.name === 'Hết Hàng') { iconName = focused ? 'alert-circle' : 'alert-circle-outline'; }
            else if (route.name === 'Cài Đặt') { iconName = focused ? 'settings' : 'settings-outline'; }
            return <Ionicons name={iconName ?? 'help-circle'} size={size} color={color} />;
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
          tabBarStyle: { backgroundColor: theme.colors.elevation.level2 },
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.primary,
          headerTitleStyle: { fontWeight: 'bold', color: theme.colors.onSurface },
        })}
      >
      {/* Khai báo các màn hình trong Tab */}
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'ShinoVN App!' }} />
      <Tab.Screen name="Lịch Sử" component={HistoryScreen} options={{ title: 'Lịch Sử' }} />
      <Tab.Screen name="Hết Hàng" component={OutOfStockScreen} options={{ title: 'Hết Hàng' }} />
      <Tab.Screen name="Cài Đặt" component={SettingsScreen} options={{ title: 'Cài Đặt' }}/>
    </Tab.Navigator>
  );
}

// --- Stack Navigator Chính ---
// Component này quản lý tất cả các màn hình và luồng điều hướng chính
export default function AppNavigator() {
  const theme = useTheme();
  return (
    <NavigationContainer>
      <Stack.Navigator
         initialRouteName="MainTabs" // Màn hình đầu tiên là cụm Tab
         screenOptions={{
           headerBackTitleVisible: false,
           headerTintColor: theme.colors.primary,
           headerTitleStyle: { fontWeight: 'bold' },
         }}
       >
        {/* Đăng ký màn hình chứa các Tab */}
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />

        {/* Đăng ký các màn hình riêng lẻ khác */}
        <Stack.Screen name="AddProduct" component={AddProductScreen} options={{ title: 'Thêm Sản Phẩm Mới' }} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Chi tiết Sản phẩm' }} />
        <Stack.Screen name="EditProduct" component={EditProductScreen} options={{ title: 'Chỉnh sửa Sản phẩm' }} />
        <Stack.Screen name="ProductList" component={ProductListScreen} options={{ title: 'Danh sách Sản phẩm' }} />

        {/* Đăng ký các màn hình Công việc */}
        <Stack.Screen
            name="TaskList" // Tên route để điều hướng đến
            component={TaskListScreen} // Component tương ứng
            options={{ title: 'Quản lý Công việc' }} // Title hiển thị trên header
        />
        <Stack.Screen
            name="AddTask" // Tên route để điều hướng đến
            component={AddTaskScreen} // Component tương ứng
            options={{ title: 'Thêm Công Việc Mới' }} // Title hiển thị trên header
        />

        {/* KHÔNG CÓ ĐỊNH NGHĨA function AddTaskScreen() ở đây nữa */}

      </Stack.Navigator>
    </NavigationContainer>
  );
} // Kết thúc AppNavigator

// KHÔNG CÓ ĐỊNH NGHĨA function AddTaskScreen() ở đây nữa