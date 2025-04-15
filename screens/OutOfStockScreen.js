// screens/OutOfStockScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, SafeAreaView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getProducts } from '../services/storage';
import { useTheme, List, Divider } from 'react-native-paper';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function OutOfStockScreen() {
  const [oosProds, setOosProds] = useState([]); const [loading, setLoading] = useState(false); const [refreshing, setRefreshing] = useState(false); const nav = useNavigation();
  const theme = useTheme();

  const load = useCallback(async(sl=true)=>{ if(sl&&!refreshing)setLoading(true); try{let d=await getProducts(); d=d.filter(p=>p.isOutOfStock===true).sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0)); setOosProds(d);} catch(e){alert('Lỗi tải DS.');} finally{if(sl&&!refreshing)setLoading(false);}},[refreshing]);
  useFocusEffect(useCallback(()=>{let a=true;async function f(){if(a)setLoading(true);try{let d=await getProducts(); d=d.filter(p=>p.isOutOfStock===true).sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0)); if(a)setOosProds(d);}catch(e){if(a)alert('Lỗi tải.');}finally{if(a)setLoading(false);}} f(); return()=>{a=false;};},[]));
  const onRefresh = useCallback(async()=>{setRefreshing(true);await load(false);setRefreshing(false);},[load]);

  if(loading&&(oosProds||[]).length===0&&!refreshing){return(<SafeAreaView style={[styles.cont, styles.center, {backgroundColor: theme.colors.background}]}><ActivityIndicator size="large" color={theme.colors.primary}/></SafeAreaView>);}

  const renderOosItem = ({ item }) => { const fp=item.price||item.price===0?`${Number(item.price).toLocaleString('vi-VN')} VNĐ`:'Chưa có'; return (<List.Item title={item.name||'Chưa tên'} description={`ID: ${item.id} | Giá: ${fp}\nQC: ${item.specification||'N/A'}`} titleNumberOfLines={2} descriptionNumberOfLines={2} right={p=>(<View{...p}style={{justifyContent:'center',marginLeft:8}}><Ionicons name="alert-circle" size={24} color={theme.colors.error}/></View>)} onPress={()=>{nav.navigate('ProductDetail',{productId:item.id})}} style={[styles.listItem,{backgroundColor:theme.colors.surface}]} titleStyle={[styles.itemTitle,{color:theme.colors.onSurface}]} descriptionStyle={[styles.itemDesc,{color:theme.colors.onSurfaceVariant}]}/>); };

  return (
    <SafeAreaView style={[styles.cont, {backgroundColor: theme.colors.background}]}>
      <FlatList data={oosProds||[]} keyExtractor={(item)=>item.id.toString()} renderItem={renderOosItem} ItemSeparatorComponent={() => <Divider style={{backgroundColor: theme.colors.outlineVariant}} />} ListEmptyComponent={!loading&&!refreshing&&(<View style={styles.center}><Text style={[styles.empty, {color: theme.colors.onSurfaceDisabled}]}>Không có SP hết hàng.</Text></View>)} contentContainerStyle={(oosProds||[]).length===0?styles.centerCont:styles.listPad} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary}/>} initialNumToRender={10} maxToRenderPerBatch={5} windowSize={11}/>
    </SafeAreaView>
  );
}
// Styles
const styles = StyleSheet.create({ cont:{flex:1}, center:{flex:1,justifyContent:'center',alignItems:'center',padding:20}, centerCont:{flexGrow:1,justifyContent:'center',alignItems:'center'}, listPad:{paddingBottom:20, paddingTop: 0}, empty:{textAlign:'center',fontSize:16,lineHeight:24}, listItem:{paddingLeft: 15}, itemTitle:{fontSize:16,fontWeight:'500'}, itemDesc:{fontSize:13,lineHeight:18} });