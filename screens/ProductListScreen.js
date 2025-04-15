// screens/ProductListScreen.js
import React, { useState, useCallback, useLayoutEffect } from 'react';
import { FlatList, StyleSheet, View, Alert, RefreshControl, SafeAreaView, Keyboard } from 'react-native'; // <<<< Đảm bảo có StyleSheet
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { ActivityIndicator, Appbar, Checkbox, Divider, Searchbar, useTheme, FAB, Portal, Dialog, Paragraph, Button, Text } from 'react-native-paper';
import { getProducts, saveProducts, logActivity } from '../services/storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { ProductListItem } from '../components/ProductListItem';

const ESTIMATED_ITEM_HEIGHT = 95;
const getItemLayout = (data, index) => ({ length: ESTIMATED_ITEM_HEIGHT, offset: ESTIMATED_ITEM_HEIGHT * index, index });

export default function ProductListScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const route = useRoute();

  const initialSearch = route.params?.initialSearchQuery || '';
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [dialogVisible, setDialogVisible] = useState(false);
  const [bulkActionType, setBulkActionType] = useState('');
  const isSelectionMode = selectedIds.size > 0;

  const filterProducts = useCallback((query, data) => { const lowerCaseQuery = query.toLowerCase(); const dataToFilter = Array.isArray(data) ? data : []; if (!query.trim()) { setFilteredProducts(dataToFilter); } else { const filtered = dataToFilter.filter( p => (p.name && p.name.toLowerCase().includes(lowerCaseQuery)) || (p.id && p.id.toLowerCase().includes(lowerCaseQuery))); setFilteredProducts(filtered); } }, []);
  const loadData = useCallback(async (showLoading = true) => { if (showLoading && !isRefreshing) setIsLoading(true); try { let data = await getProducts(); const validData = Array.isArray(data) ? data : []; validData.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)); setProducts(validData); filterProducts(searchTerm, validData); } catch (e) { console.error('PL Load Data Err:', e); Alert.alert('Lỗi', 'Không thể tải danh sách sản phẩm.'); } finally { if (showLoading && !isRefreshing) setIsLoading(false); } }, [searchTerm, isRefreshing, filterProducts]);
  useFocusEffect(useCallback(() => { loadData(!isRefreshing); return () => {}; }, [loadData, isRefreshing]));
  const onRefresh = useCallback(async () => { setIsRefreshing(true); await loadData(false); setIsRefreshing(false); }, [loadData]);
  const handleSearchChange = (query) => { /* console.log('[ProductListScreen] handleSearchChange triggered! Query:', query); */ setSearchTerm(query); filterProducts(query, products); };
  const handleSelectItem = useCallback((id) => { setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }, []);
  const handleSelectAll = useCallback(() => { const ids = (filteredProducts || []).map((p) => p.id); if (selectedIds.size === ids.length && ids.length > 0) setSelectedIds(new Set()); else setSelectedIds(new Set(ids)); }, [filteredProducts, selectedIds.size]);
  const clearSelection = useCallback(() => { setSelectedIds(new Set()); }, []);
  const executeBulkAction = useCallback(async () => { if (selectedIds.size === 0 || !bulkActionType) return; const action = bulkActionType; const idsToProcess = Array.from(selectedIds); hideDialog(); setIsLoading(true); let successCount = 0, errorCount = 0, productsChanged = false; try { let currentProducts = await getProducts(); let productsToModify = [...currentProducts]; for (const id of idsToProcess) { const productIndex = productsToModify.findIndex(p => p.id === id); if (productIndex === -1) { errorCount++; continue; } const originalProduct = productsToModify[productIndex]; try { if (action === 'delete') { productsToModify.splice(productIndex, 1); await logActivity('delete', { id: originalProduct.id, name: originalProduct.name }, 'Xóa hàng loạt'); successCount++; productsChanged = true; } else if (action === 'mark_oos' || action === 'mark_is') { const newStockStatus = action === 'mark_oos'; if (originalProduct.isOutOfStock !== newStockStatus) { const updatedProduct = { ...originalProduct, isOutOfStock: newStockStatus }; productsToModify[productIndex] = updatedProduct; const logActionType = newStockStatus ? 'stock_change_out' : 'stock_change_in'; const logDetails = newStockStatus ? 'ĐH loạt' : 'CH loạt'; await logActivity(logActionType, updatedProduct, logDetails); successCount++; productsChanged = true; } else { errorCount++; } } } catch (e) { console.error(`Err proc ${id}:`, e); errorCount++; } } if (productsChanged) await saveProducts(productsToModify); setSelectedIds(new Set()); await loadData(false); Alert.alert("Hoàn tất",`OK: ${successCount}. Lỗi/Bỏ qua: ${errorCount}.`); } catch (e) { console.error(`Bulk ${action} err:`, e); Alert.alert("Lỗi","Lỗi thực hiện hàng loạt."); await loadData(false); } finally { setIsLoading(false); } }, [selectedIds, bulkActionType, loadData]);
  const showConfirmationDialog = useCallback((action) => { setBulkActionType(action); setDialogVisible(true); }, []);
  const hideDialog = useCallback(() => { setDialogVisible(false); }, []);
  useLayoutEffect(() => { navigation.setOptions({ header: () => { const selectionTitle = `${selectedIds.size} đã chọn`; const screenTitle = "Danh sách Sản phẩm"; if (isSelectionMode) { return ( <Appbar.Header statusBarHeight={0} elevated><Appbar.Action icon="close" onPress={clearSelection} /><Appbar.Content title={selectionTitle} /><Appbar.Action icon="delete-outline" onPress={() => showConfirmationDialog('delete')} disabled={isLoading} tooltip="Xóa mục đã chọn"/><Appbar.Action icon="trending-down-outline" onPress={() => showConfirmationDialog('mark_oos')} disabled={isLoading} tooltip="Đánh dấu hết hàng"/><Appbar.Action icon="trending-up-outline" onPress={() => showConfirmationDialog('mark_is')} disabled={isLoading} tooltip="Đánh dấu còn hàng"/></Appbar.Header> ); } else { return ( <Appbar.Header statusBarHeight={0} elevated>{navigation.canGoBack() && <Appbar.BackAction onPress={() => navigation.goBack()} />}<Appbar.Content title={screenTitle} /></Appbar.Header> ); } }, }); }, [navigation, isSelectionMode, selectedIds.size, isLoading, clearSelection, showConfirmationDialog]);
  const navigateToDetail = useCallback((productId) => { navigation.navigate('ProductDetail', { productId: productId }); }, [navigation]);

  const safeFilteredProducts = Array.isArray(filteredProducts) ? filteredProducts : [];
  // console.log(`[ProductListScreen] Rendering. isLoading=${isLoading}, isRefreshing=${isRefreshing}, products=${products.length}, filteredProducts=${safeFilteredProducts.length}`);

   try {
      return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <Searchbar placeholder="Tìm theo tên hoặc mã..." onChangeText={handleSearchChange} value={searchTerm} style={[ styles.searchbar, { backgroundColor: theme.dark ? theme.colors.elevation.level2 : theme.colors.surface, borderWidth: theme.dark ? StyleSheet.hairlineWidth : 0, borderColor: theme.dark ? theme.colors.outlineVariant : 'transparent', } ]} inputStyle={{ color: theme.colors.onSurface }} placeholderTextColor={theme.colors.placeholder} iconColor={theme.colors.placeholder} elevation={theme.dark ? 3 : 1} onSubmitEditing={Keyboard.dismiss} />
          <View style={[ styles.listHeader, { borderBottomColor: theme.colors.outlineVariant } ]}><Checkbox.Android status={ safeFilteredProducts.length > 0 && selectedIds.size === safeFilteredProducts.length ? 'checked' : selectedIds.size === 0 ? 'unchecked' : 'indeterminate' } onPress={handleSelectAll} disabled={safeFilteredProducts.length === 0 || isLoading} /><Text style={[styles.selectAllText, { color: theme.colors.onSurface }]} onPress={handleSelectAll} disabled={safeFilteredProducts.length === 0 || isLoading} >Chọn tất cả ({safeFilteredProducts.length})</Text></View>
          <Divider style={{ backgroundColor: theme.colors.outlineVariant }} />
          {isLoading && !isRefreshing ? ( <View style={styles.centered}><ActivityIndicator animating={true} size="large" color={theme.colors.primary}/></View> ) : (
            <FlatList
              data={safeFilteredProducts}
              keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
              renderItem={({ item }) => ( <ProductListItem item={item} theme={theme} selectedIds={selectedIds} handleSelectItem={handleSelectItem} navigateToDetail={navigateToDetail} /> )}
              ItemSeparatorComponent={() => <Divider style={{ backgroundColor: theme.colors.outlineVariant }} />}
              ListEmptyComponent={ !isLoading && !isRefreshing && ( <View style={styles.centered}><Ionicons name="file-tray-outline" size={50} color={theme.colors.onSurfaceDisabled} /><Text style={[styles.emptyText, { color: theme.colors.onSurfaceDisabled }]}>{searchTerm ? 'Không tìm thấy sản phẩm.' : 'Chưa có sản phẩm nào.'}</Text></View>) }
              contentContainerStyle={ safeFilteredProducts.length === 0 ? styles.centeredContent : styles.listPadding }
              refreshControl={ <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary}/> }
              initialNumToRender={10} maxToRenderPerBatch={5} windowSize={11} getItemLayout={getItemLayout} removeClippedSubviews={true} keyboardShouldPersistTaps="handled"
              extraData={selectedIds}
            />
          )}
          {!isSelectionMode && ( <FAB icon="plus" style={[styles.fab, { backgroundColor: theme.colors.primary }]} onPress={() => navigation.navigate('AddProduct')} color={theme.colors.onPrimary} mode="flat"/> )}
          <Portal><Dialog visible={dialogVisible} onDismiss={hideDialog}><Dialog.Icon icon={bulkActionType === 'delete' ? 'alert-circle' : 'information'} color={ bulkActionType === 'delete' ? theme.colors.error : theme.colors.primary } /><Dialog.Title style={styles.dialogTitle}>Xác nhận</Dialog.Title><Dialog.Content><Paragraph style={{ textAlign: 'center' }}>Bạn chắc chắn muốn{' '} {bulkActionType === 'delete' ? 'xóa' : bulkActionType === 'mark_oos' ? 'đánh dấu hết hàng' : 'đánh dấu còn hàng'}{' '} {selectedIds.size} sản phẩm đã chọn?{bulkActionType === 'delete' ? '\nHành động này không thể hoàn tác.' : ''}</Paragraph></Dialog.Content><Dialog.Actions><Button onPress={hideDialog} textColor={theme.colors.onSurfaceVariant}> Hủy </Button><Button onPress={executeBulkAction} buttonColor={ bulkActionType === 'delete' ? theme.colors.error : theme.colors.primary } textColor={ bulkActionType === 'delete' ? theme.colors.onError : theme.colors.onPrimary } style={{ marginLeft: 8 }} > {bulkActionType === 'delete' ? 'Xóa' : 'Xác nhận'} </Button></Dialog.Actions></Dialog></Portal>
        </SafeAreaView>
      );
   } catch (error) {
        console.error("[ProductListScreen] Render Error:", error);
        return ( <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}><Ionicons name="alert-circle-outline" size={60} color={theme.colors.error}/><Text style={{color: theme.colors.error, marginTop: 15, textAlign: 'center'}}>Lỗi hiển thị màn hình.</Text><Button mode="outlined" onPress={() => loadData(true)} style={{marginTop: 20}}>Thử lại</Button></SafeAreaView> );
   }
}

const styles = StyleSheet.create({ // <<<< Sử dụng StyleSheet
  container: { flex: 1 },
  searchbar: { marginHorizontal: 10, marginTop: 10, marginBottom: 5, borderRadius: 8, },
  listHeader:{ flexDirection:'row', alignItems:'center', paddingHorizontal:4, paddingVertical:4, borderBottomWidth:1 },
  selectAllText:{ marginLeft:4, fontSize:14, fontWeight:'500' },
  centered:{ flex:1, justifyContent:'center', alignItems:'center', padding:20 },
  emptyText:{ marginTop: 15, textAlign: 'center', fontSize: 16, },
  centeredContent:{ flexGrow:1, justifyContent:'center', alignItems:'center' },
  listPadding:{ paddingBottom:80 },
  fab:{ position:'absolute', margin:16, right:0, bottom:0 },
  dialogTitle:{ textAlign:'center', fontWeight:'bold' },
  // Style cho item đã chuyển
  listItem: { paddingLeft: 0 }, itemLeftContainer: { flexDirection: 'row', alignItems: 'center', paddingLeft: 8, paddingRight: 8 }, stockIcon: { marginLeft: 10 }, itemTitle: { fontSize: 16, fontWeight: '500' }, itemDesc: { fontSize: 13, lineHeight: 18 },
});