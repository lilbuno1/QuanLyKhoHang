// screens/HistoryScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getActivityLog, clearActivityLog } from '../services/storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme, Divider } from 'react-native-paper';

const formatTimestamp = (iso) => { if (!iso) return ''; try { const d=new Date(iso); return isNaN(d.getTime())?'T/g lỗi':d.toLocaleString('vi-VN',{dateStyle:'short',timeStyle:'medium',hour12:false}); } catch(e){return 'Lỗi TG';} };
const getActivityPresentation = (log, theme) => { let i='alert-circle-outline', d=`Act: ${log.action}`, n=log.productName||'(?)', c=theme.colors.disabled, m='', t=log.details||''; switch(log.action){ case 'add':i='add-circle-outline';m=`Thêm: "${n}"`;c='#198754';break; case 'edit':i='pencil-outline';m=`Sửa: "${n}"`;c=theme.dark?'#FFD700':'#FFA000';if(!t)t='Đã cập nhật.';break; case 'delete':i='trash-outline';m=`Xóa: "${n}"`;c=theme.colors.error;break; case 'stock_change_out':i='trending-down-outline';m=`"${n}" -> Hết hàng`;c='#fd7e14';t='';break; case 'stock_change_in':i='trending-up-outline';m=`"${n}" -> Còn hàng`;c='#0dcaf0';t='';break; default:m=d;break; } return {iconName:i,mainActionText:m,detailText:t,color:c,timestamp:formatTimestamp(log.timestamp)}; };

export default function HistoryScreen() {
  const [logs, setLogs] = useState([]); const [isLoading, setIsLoading] = useState(false); const [isRefreshing, setIsRefreshing] = useState(false);
  const theme = useTheme();
  const loadHistory = useCallback(async (l=true) => { if(l&&!isRefreshing)setIsLoading(true); try { const d=await getActivityLog(); setLogs(d); } catch(e){alert('Lỗi tải log.');} finally {if(l&&!isRefreshing)setIsLoading(false);} }, [isRefreshing]);
  useFocusEffect(useCallback(() => { let a=true; async function f(){if(a)setIsLoading(true);try{const d=await getActivityLog();if(a)setLogs(d);}catch(e){if(a)alert('Lỗi tải log.');}finally{if(a)setIsLoading(false);}} f(); return()=>{a=false;}; }, []));
  const onRefresh = useCallback(async () => { setIsRefreshing(true); await loadHistory(false); setIsRefreshing(false); }, [loadHistory]);
  const handleClearHistory = () => { Alert.alert("Xác nhận", "Xóa toàn bộ lịch sử?", [{text:"Hủy",style:"cancel"},{text:"Xóa",onPress:async()=>{try{await clearActivityLog();setLogs([]);Alert.alert("Đã xóa");}catch(e){Alert.alert("Lỗi", "Không xóa được.");}},style:"destructive"}]); };

  const renderLogItem = ({ item }) => { const { iconName, mainActionText, detailText, color, timestamp } = getActivityPresentation(item, theme); return ( <View style={[styles.logItem, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.surfaceVariant }]}><Ionicons name={iconName} size={24} color={color} style={styles.logIcon}/><View style={styles.logContent}><Text style={[styles.logDescription, { color: theme.colors.onSurface }]}>{mainActionText}</Text>{detailText ? (<Text style={[styles.logDetails, { color: theme.colors.onSurfaceVariant }]}>{detailText}</Text>) : null}<Text style={[styles.logTimestamp, { color: theme.colors.onSurfaceDisabled }]}>{timestamp}</Text></View></View> ); };
  const safeLogs = logs || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
       {safeLogs.length > 0 && !isLoading && !isRefreshing && (<View style={[styles.headerContainer, {backgroundColor: theme.colors.surfaceVariant || '#f8f8f8', borderBottomColor: theme.colors.outlineVariant ||'#ddd'}]}><Text style={[styles.headerTitle, {color: theme.colors.onSurfaceVariant}]}>Lịch sử Hoạt động</Text><TouchableOpacity style={styles.clearButton} onPress={handleClearHistory}><Ionicons name="trash-bin-outline" size={18} color="#fff" /><Text style={styles.clearButtonText}> Xóa Log</Text></TouchableOpacity></View> )}
      <FlatList
        data={safeLogs} keyExtractor={(item) => item.id} renderItem={renderLogItem}
        ListEmptyComponent={ !isLoading && !isRefreshing && ( <View style={styles.centered}><Text style={[styles.emptyText, {color: theme.colors.onSurfaceDisabled}]}>Chưa có hoạt động nào.</Text></View> )}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />}
        contentContainerStyle={safeLogs.length === 0 ? styles.centeredContent : styles.listPadding}
        ItemSeparatorComponent={() => <Divider style={{backgroundColor: theme.colors.surfaceVariant || '#f0f0f0'}} />}
        initialNumToRender={15} maxToRenderPerBatch={10} windowSize={21}
      />
    </SafeAreaView>
  );
}
// Styles
const styles = StyleSheet.create({ container: { flex: 1, }, centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }, centeredContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' }, listPadding: { paddingBottom: 20, paddingTop: 0 }, emptyText: { fontSize: 16, textAlign: 'center' }, headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, }, headerTitle: { fontSize: 18, fontWeight: '600' }, clearButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dc3545', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 5, }, clearButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 13, marginLeft: 3 }, logItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 0, }, logIcon: { marginRight: 15, width: 25, textAlign: 'center', marginTop: 3, }, logContent: { flex: 1, }, logDescription: { fontSize: 14.5, marginBottom: 5, lineHeight: 20, fontWeight: '500'}, logDetails: { fontSize: 13.5, marginBottom: 5, lineHeight: 18, fontStyle: 'italic', }, logTimestamp: { fontSize: 12, }, });