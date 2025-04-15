// screens/DashboardScreen.js (Dọn dẹp Log, bỏ nestedScrollEnabled)
import React, { useState, useCallback, useEffect, useRef, useContext } from 'react';
import { ScrollView, StyleSheet, RefreshControl, View, Image, Platform, Alert, Keyboard } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  ActivityIndicator,
  Card,
  Text,
  Button,
  List,
  useTheme,
  Divider,
  Searchbar,
  IconButton,
  Portal,
  Modal as PaperModal,
  Switch
} from 'react-native-paper';
import { getProducts, getActivityLog } from '../services/storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext } from '../ThemeContext';

// --- Hàm tiện ích ---
const formatTimestamp = (iso) => { if (!iso) return ''; try { const d = new Date(iso); return isNaN(d.getTime()) ? 'T/g lỗi' : d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'medium', hour12: false }); } catch (e) { return 'Lỗi TG'; } };
const getActivityIcon = (action) => { switch (action) { case 'add': return 'plus-circle-outline'; case 'edit': return 'pencil-circle-outline'; case 'delete': return 'minus-circle-outline'; case 'stock_change_out': return 'trending-down'; case 'stock_change_in': return 'trending-up'; default: return 'help-circle-outline'; } };
const getActivityColor = (action, theme) => { switch (action) { case 'add': return theme.colors.success; case 'edit': return theme.colors.warning; case 'delete': return theme.colors.error; case 'stock_change_out': return theme.colors.error; case 'stock_change_in': return theme.colors.info; default: return theme.colors.onSurfaceDisabled; } };
const formatCurrencyDisplay = (value) => { if (value === null || value === undefined || isNaN(Number(value))) return 'N/A'; try { return Number(value).toLocaleString('vi-VN') + ' VNĐ'; } catch (e) { return 'Lỗi giá'; } };
// --- Kết thúc hàm tiện ích ---

export default function DashboardScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const { themeMode, toggleTheme } = useContext(ThemeContext);
  const isDarkMode = themeMode === 'dark';

  // --- State ---
  const [summary, setSummary] = useState({ totalProducts: 0, totalValue: 0 });
  const [recentLogs, setRecentLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allProducts, setAllProducts] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef(null);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [selectedProductForPreview, setSelectedProductForPreview] = useState(null);
  // --- Kết thúc State ---

  // --- Logic tải dữ liệu ---
  const loadDashboardData = useCallback(async (showLoading = true) => {
      if (showLoading && !isRefreshing) setIsLoading(true);
      try {
          const [productsData, logsData] = await Promise.all([ getProducts(), getActivityLog() ]);
          const validProducts = Array.isArray(productsData) ? productsData : [];
          const validLogs = Array.isArray(logsData) ? logsData : [];
          validProducts.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          setAllProducts(validProducts);
          const totalProductsCount = validProducts.length;
          const totalValueSum = validProducts.reduce( (sum, product) => sum + (Number(product?.price) || 0), 0 );
          setSummary({ totalProducts: totalProductsCount, totalValue: totalValueSum });
          setRecentLogs(validLogs.slice(0, 5));
      } catch (e) { console.error('Dashboard Load Data Error:', e); Alert.alert('Lỗi', 'Không thể tải dữ liệu Dashboard.'); }
      finally { if (showLoading && !isRefreshing) setIsLoading(false); }
  }, [isRefreshing]);

  useFocusEffect(useCallback(() => { loadDashboardData(!isRefreshing); return () => {}; }, [loadDashboardData, isRefreshing]));
  const onRefresh = useCallback(async () => { setIsRefreshing(true); await loadDashboardData(false); setIsRefreshing(false); }, [loadDashboardData]);
  // --- Kết thúc logic tải dữ liệu ---


  // --- Logic tìm kiếm & modal ---
  const handleSearchChange = (query) => {
    // console.log('[DashboardScreen] handleSearchChange triggered! Query:', query); // Giữ lại nếu cần debug search
    setSearchQuery(query); setSearchResults([]); setIsSearching(true); if (searchTimeout.current) clearTimeout(searchTimeout.current); if (!query.trim()) { setIsSearching(false); return; } searchTimeout.current = setTimeout(() => { const lowerCaseQuery = query.toLowerCase(); const results = (Array.isArray(allProducts) ? allProducts : []).filter( p => (p.name && p.name.toLowerCase().includes(lowerCaseQuery)) || (p.id && p.id.toLowerCase().includes(lowerCaseQuery))); setSearchResults(results); setIsSearching(false); }, 300);
  };
  const handleResultPress = (product) => { if (!product || !product.id) return; setSelectedProductForPreview(product); setIsPreviewModalVisible(true); setSearchQuery(''); setSearchResults([]); Keyboard.dismiss(); };
  const hidePreviewModal = () => setIsPreviewModalVisible(false);
  // --- Kết thúc logic tìm kiếm & modal ---


  // --- Render Loading State ban đầu ---
  if (isLoading && allProducts.length === 0 && !isRefreshing) {
    return ( <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}><ActivityIndicator animating={true} size="large" color={theme.colors.primary} /></SafeAreaView> );
  }
  // --- Kết thúc Loading State ---

  // --- Render chính (Đã bỏ try...catch bao ngoài) ---
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        refreshControl={ <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} /> }
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled" >

        {/* Tiêu đề */}
        <Text style={[ styles.mainAppTitle, { color: theme.dark ? '#FF3131' : theme.colors.primary } ]}>
            Tổng Quan Kho Hàng
        </Text>
        {/* Nút bật/tắt Giao diện tối */}
        <View style={styles.themeSwitchContainer}><Text style={{color: theme.colors.onSurface, marginRight: 8}}>Giao diện tối</Text><Switch value={isDarkMode} onValueChange={toggleTheme} color={theme.colors.primary} /></View>
        {/* Searchbar */}
        <Searchbar placeholder="Tìm SP xem nhanh (Tên hoặc Mã)" onChangeText={handleSearchChange} value={searchQuery} style={[ styles.searchbar, { backgroundColor: theme.dark ? theme.colors.elevation.level2 : theme.colors.surface, borderWidth: theme.dark ? StyleSheet.hairlineWidth : 0, borderColor: theme.dark ? theme.colors.outlineVariant : 'transparent', } ]} inputStyle={{ color: theme.colors.onSurface }} placeholderTextColor={theme.colors.placeholder} iconColor={theme.colors.placeholder} elevation={theme.dark ? 4 : 2} />

        {/* Hiển thị kết quả tìm kiếm */}
        {(isSearching || searchResults.length > 0 || (searchQuery.length > 0 && !isSearching && searchResults.length === 0)) && (
            <Card style={[styles.searchResultsContainer, {backgroundColor:theme.colors.elevation.level1, borderColor: theme.colors.outline}]} elevation={3}>
                {isSearching ? (<View style={styles.searchActivityContainer}><ActivityIndicator animating={true} color={theme.colors.primary}/></View>
                ) : searchResults.length === 0 ? (<View style={styles.searchActivityContainer}><Text style={[styles.noResultsText, {color: theme.colors.onSurfaceVariant}]}>Không tìm thấy.</Text></View>
                ) : (
                    // Bỏ nestedScrollEnabled
                    <ScrollView>
                        {(Array.isArray(searchResults) ? searchResults : []).slice(0, 5).map((item, index, arr) => (
                            <React.Fragment key={item.id}>
                                <List.Item title={item.name || 'Chưa có tên'} description={`ID: ${item.id || 'N/A'} | Giá: ${formatCurrencyDisplay(item.price)}`} titleNumberOfLines={1} descriptionNumberOfLines={1} left={props => <List.Icon {...props} icon="cube-scan" />} onPress={() => handleResultPress(item)} style={styles.searchResultItem} titleStyle={[styles.searchResultTitle, {color: theme.colors.onSurface}]} descriptionStyle={{color: theme.colors.onSurfaceVariant}} />
                                {index < arr.length - 1 && ( <Divider style={{backgroundColor: theme.colors.outlineVariant}} /> )}
                            </React.Fragment>
                        ))}
                    </ScrollView>
                )}
            </Card>
        )}

        {/* Các nút hành động chính */}
        <View style={styles.actionButtons}>
            <Button icon="format-list-bulleted" mode="contained" onPress={() => navigation.navigate('ProductList')} style={styles.button} labelStyle={styles.buttonLabel} contentStyle={styles.buttonContent}> DS SP </Button>
            <Button icon="plus-circle-outline" mode="contained-tonal" onPress={() => navigation.navigate('AddProduct')} style={styles.button} labelStyle={styles.buttonLabel} contentStyle={styles.buttonContent}> Thêm SP </Button>
            <Button icon="clipboard-list-outline" mode="outlined" onPress={()=>navigation.navigate('TaskList')} style={styles.button} labelStyle={styles.buttonLabel} contentStyle={styles.buttonContent}> Công việc </Button>
        </View>

        {/* Card Hoạt động gần đây */}
        <Card style={styles.card} elevation={1}>
          <Card.Title title="Hoạt động gần đây" titleStyle={[styles.cardTitle, { color: theme.colors.onSurface }]} right={(props) => (<Button {...props} onPress={() => navigation.navigate('Lịch Sử')} compact style={{ marginRight: 8 }}> Xem tất cả </Button>)}/>
          <Card.Content>{(Array.isArray(recentLogs) && recentLogs.length > 0) ? (recentLogs.map((log, idx) => (<View key={log.id || `log-${idx}`}><List.Item title={log.productName || 'N/A'} description={`${log.action || 'N/A'} - ${formatTimestamp(log.timestamp)}`} titleStyle={[styles.logTitle, { color: theme.colors.onSurface }]} descriptionStyle={[styles.logTimestamp, { color: theme.colors.onSurfaceVariant }]} left={(props) => (<List.Icon {...props} icon={getActivityIcon(log.action)} color={getActivityColor(log.action, theme)}/>)}/>{log.details && (<Text style={[styles.logDetailsText, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>{log.details}</Text>)}{idx < recentLogs.length - 1 && (<Divider style={{ backgroundColor: theme.colors.outlineVariant, marginLeft: 58 }} />)}</View>))) : (<Text style={[styles.emptyText, { color: theme.colors.onSurfaceDisabled }]}>Chưa có hoạt động nào.</Text>)}</Card.Content>
        </Card>

        {/* Card Số liệu chính */}
        <Card style={styles.card} elevation={1}>
          <Card.Title title="Số liệu kho hàng" titleStyle={[styles.cardTitle, { color: theme.colors.onSurface }]}/>
          <Card.Content><List.Item title="Tổng số loại sản phẩm" description={summary?.totalProducts?.toLocaleString('vi-VN') ?? '0'} left={(props) => <List.Icon {...props} icon="package-variant-closed" color={theme.colors.primary} />} titleStyle={[styles.listItemTitle, { color: theme.colors.onSurface }]} descriptionStyle={[styles.listItemDesc, { color: theme.colors.primary }]} /><Divider style={{ backgroundColor: theme.colors.outlineVariant }} /><List.Item title="Tổng giá trị (ước tính)" description={formatCurrencyDisplay(summary?.totalValue ?? 0)} left={(props) => <List.Icon {...props} icon="cash-multiple" color={theme.colors.tertiary || theme.colors.secondary} />} titleStyle={[styles.listItemTitle, { color: theme.colors.onSurface }]} descriptionStyle={[styles.listItemDesc, { color: theme.colors.tertiary || theme.colors.secondary }]} /></Card.Content>
        </Card>

        {/* Footer Text */}
        <Text style={[ styles.footerText, { color: theme.dark ? '#39FF14' : theme.colors.onSurfaceDisabled } ]}> Made By ShinoVn! </Text>

      </ScrollView>

      {/* Modal Xem nhanh Sản phẩm */}
      <Portal><PaperModal visible={isPreviewModalVisible} onDismiss={hidePreviewModal} contentContainerStyle={[ styles.modalContainerStyle, { backgroundColor: theme.colors.elevation.level3 }, ]} >{selectedProductForPreview && ( <View style={styles.modalSurface}><IconButton icon="close" size={24} onPress={hidePreviewModal} style={styles.previewModalCloseButton} iconColor={theme.colors.onSurfaceVariant}/><Text style={[styles.previewModalTitle, { color: theme.colors.onSurface }]}> {selectedProductForPreview.name} </Text>{selectedProductForPreview.imageUri ? ( <Image source={{ uri: selectedProductForPreview.imageUri }} style={styles.previewModalImage} resizeMode="contain" /> ) : ( <View style={[ styles.previewModalImage, styles.imagePlaceholder, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline }, ]}><Ionicons name="camera-reverse-outline" size={40} color={theme.colors.onSurfaceVariant}/></View> )}<Text style={[styles.previewModalPrice, { color: theme.colors.primary }]}> Giá: {formatCurrencyDisplay(selectedProductForPreview.price)} </Text><Text style={[styles.previewModalSpec, { color: theme.colors.onSurfaceVariant }]}> Quy cách: {selectedProductForPreview.specification || 'N/A'} </Text><Divider style={{ marginVertical: 10, backgroundColor: theme.colors.outlineVariant }}/><Button mode="contained" icon="information-outline" onPress={() => { hidePreviewModal(); navigation.navigate('ProductDetail', { productId: selectedProductForPreview.id, }); }} style={{ marginTop: 10 }} > Xem chi tiết </Button></View> )}</PaperModal></Portal>
    </View>
  );
}

// --- StyleSheet ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: 15, paddingBottom: 30 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mainAppTitle: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 5, },
  themeSwitchContainer: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 5, marginBottom: 15, marginTop: -15 },
  searchbar: { marginBottom: 20, borderRadius: 8, },
  searchResultsContainer:{ borderRadius: 8, marginTop: -15, marginBottom: 20, maxHeight: 250, elevation: 3, borderWidth: 1, },
  searchActivityContainer: { paddingVertical: 20, alignItems: 'center', justifyContent: 'center', minHeight: 60, },
  searchResultItem:{ paddingVertical: 10, },
  searchResultTitle:{ fontSize: 15, fontWeight: '500' },
  noResultsText:{ textAlign:'center', fontStyle:'italic' },
  actionButtons:{ flexDirection:'row', justifyContent:'space-around', alignItems: 'center', marginBottom:25, flexWrap: 'wrap' },
  button:{ marginHorizontal: 5, marginVertical: 5, },
  buttonLabel:{ fontSize:13, },
  buttonContent:{ paddingVertical: 6, paddingHorizontal: 8},
  card:{ marginBottom:20, },
  cardTitle:{ fontWeight:'bold', fontSize:18, },
  logTitle:{ fontSize:15, },
  logTimestamp:{ fontSize:12, },
  logDetailsText:{ paddingLeft:58, paddingBottom:8, fontSize:13, fontStyle:'italic', },
  emptyText:{ textAlign:'center', marginVertical:15, fontStyle:'italic', },
  listItemTitle:{ fontSize:16, },
  listItemDesc:{ fontSize:17, fontWeight:'bold', },
  modalContainerStyle: { margin: 20, borderRadius: 10, padding: 0, overflow: 'hidden', maxHeight: '90%', },
  modalSurface: { padding: 20, paddingTop: 45, borderRadius: 10, position: 'relative', alignItems:'center'},
  previewModalCloseButton: { position: 'absolute', top: 5, right: 5, zIndex: 1, },
  previewModalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 15, },
  previewModalImage: { width: '90%', height: 180, borderRadius: 5, marginBottom: 15, alignSelf: 'center', },
  imagePlaceholder: { justifyContent:'center', alignItems:'center', borderStyle:'dashed', borderWidth: 1},
  previewModalPrice: { fontSize: 17, fontWeight: 'bold', marginBottom: 8, textAlign: 'center', },
  previewModalSpec: { fontSize: 14, textAlign: 'center', marginBottom: 10, },
  footerText: { textAlign: 'center', marginTop: 30, marginBottom: 10, fontSize: 12, },
});
// --- Kết thúc StyleSheet ---