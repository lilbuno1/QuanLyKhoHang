// screens/HomeScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, SafeAreaView, Keyboard } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getProducts } from '../services/storage';
import ProductItem from '../components/ProductItem';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function HomeScreen() {
  const [products, setProducts] = useState([]); const [filteredProducts, setFilteredProducts] = useState([]); const [searchTerm, setSearchTerm] = useState(''); const [isLoading, setIsLoading] = useState(false); const [isRefreshing, setIsRefreshing] = useState(false); const navigation = useNavigation();
  const filterProducts = useCallback((t, d)=>{ const lt=t.toLowerCase(); if(!t){setFilteredProducts(d);}else{const f=d.filter(p=>(p.name&&p.name.toLowerCase().includes(lt))||(p.id&&p.id.toLowerCase().includes(lt)));setFilteredProducts(f);} },[]);
  const loadData = useCallback(async(sl=true)=>{ if(sl&&!isRefreshing)setIsLoading(true); try{let d=await getProducts();d.sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));setProducts(d);filterProducts(searchTerm,d);}catch(e){console.error("HS Load Err:",e);alert('Lỗi tải DS.');}finally{if(sl&&!isRefreshing)setIsLoading(false);}},[searchTerm,isRefreshing,filterProducts]);
  const handleSearchChange = (t)=>{setSearchTerm(t);filterProducts(t,products);};
  useFocusEffect(useCallback(()=>{let a=true;async function f(){if(a)setIsLoading(true);try{let d=await getProducts();d.sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));if(a){setProducts(d);filterProducts(searchTerm,d);}}catch(e){if(a)alert('Lỗi tải data.');}finally{if(a)setIsLoading(false);}}f();return()=>{a=false;};},[searchTerm,filterProducts]));
  const onRefresh = useCallback(async()=>{setIsRefreshing(true);await loadData(false);setIsRefreshing(false);},[loadData]);

  if(isLoading&&products.length===0&&!isRefreshing){return(<SafeAreaView style={[styles.container,styles.centered]}><ActivityIndicator size="large" color="#007AFF"/><Text>Đang tải...</Text></SafeAreaView>);}

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}><View style={styles.searchWrapper}><Ionicons name="search" size={20} color="#888" style={styles.searchIcon}/><TextInput style={styles.searchInput} placeholder="Tìm sản phẩm..." placeholderTextColor="#888" value={searchTerm} onChangeText={handleSearchChange} clearButtonMode="while-editing" returnKeyType="search" onSubmitEditing={Keyboard.dismiss}/></View></View>
      <FlatList
        data={filteredProducts} keyExtractor={(item)=>item.id.toString()}
        renderItem={({item})=>(<ProductItem product={item} onPress={()=>navigation.navigate('ProductDetail',{productId:item.id})}/>)}
        ListEmptyComponent={!isLoading&&!isRefreshing&&(<View style={styles.emptyContainer}><Text style={styles.emptyText}>{searchTerm?`Không thấy "${searchTerm}".`:"Kho trống."}</Text>{!searchTerm&&(<TouchableOpacity onPress={()=>navigation.navigate('AddProduct')} style={styles.addPromptButton}><Ionicons name="add-circle-outline" size={20} color="#007AFF"/><Text style={styles.addPromptText}> Thêm SP mới</Text></TouchableOpacity>)}</View>)}
        contentContainerStyle={(filteredProducts||[]).length===0?styles.emptyContainerPadding:styles.listPadding} // Defensive check
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={["#007AFF"]} tintColor={"#007AFF"}/>}
        initialNumToRender={10} maxToRenderPerBatch={5} windowSize={11} keyboardShouldPersistTaps='handled'
      />
      <TouchableOpacity style={styles.addButton} onPress={()=>navigation.navigate('AddProduct')} activeOpacity={0.8}><Ionicons name="add" size={32} color="white"/></TouchableOpacity>
    </SafeAreaView>
  );
}
// Styles
const styles = StyleSheet.create({ container:{flex:1,backgroundColor:'#f5f5f5'},centered:{flex:1,justifyContent:'center',alignItems:'center',padding:20},searchContainer:{backgroundColor:'#f5f5f5',paddingHorizontal:10,paddingVertical:8,borderBottomWidth:1,borderBottomColor:'#eee'},searchWrapper:{flexDirection:'row',alignItems:'center',backgroundColor:'#fff',borderRadius:25,borderColor:'#ddd',borderWidth:1},searchIcon:{paddingLeft:15,paddingRight:5},searchInput:{flex:1,height:45,paddingRight:15,fontSize:16},emptyContainer:{flexGrow:1,justifyContent:'center',alignItems:'center',padding:20},emptyContainerPadding:{flexGrow:1},listPadding:{paddingBottom:80},emptyText:{textAlign:'center',fontSize:16,color:'gray',lineHeight:24,marginBottom:15},addPromptButton:{flexDirection:'row',alignItems:'center',padding:10},addPromptText:{color:'#007AFF',fontSize:16,fontWeight:'500'},addButton:{position:'absolute',right:25,bottom:25,backgroundColor:'#007AFF',width:60,height:60,borderRadius:30,justifyContent:'center',alignItems:'center',elevation:8,shadowColor:'#000',shadowOffset:{width:0,height:4},shadowOpacity:0.3,shadowRadius:4}});