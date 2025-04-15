// screens/ProductDetailScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Alert, ActivityIndicator, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { getProductById, deleteProduct } from '../services/storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme, Button } from 'react-native-paper';
import ImageViewerModal from '../components/ImageViewerModal';

export default function ProductDetailScreen() {
  const route = useRoute(); const navigation = useNavigation(); const productId = route.params?.productId;
  const [product, setProduct] = useState(null); const [isLoading, setIsLoading] = useState(true); const [isDeleting, setIsDeleting] = useState(false);
  const theme = useTheme();
  const [isImageViewerVisible, setImageViewerVisible] = useState(false);

  // --- useFocusEffect ĐÃ SỬA LỖI CÚ PHÁP ---
  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      async function loadProductDetails() {
        if (!productId) { if (isActive) { setIsLoading(false); Alert.alert("Lỗi", "Mã SP lỗi.", [{ text: "OK", onPress: navigation.goBack }]); } return; }
        if (isActive) setIsLoading(true);
        try { const d = await getProductById(productId); if (isActive) { setProduct(d); navigation.setOptions({ title: d?.name || (d === null ? 'Không thấy SP' : 'Chi tiết') }); } }
        catch (e) { if (isActive) { alert('Lỗi tải chi tiết.'); navigation.setOptions({ title: 'Lỗi' }); } }
        finally { if (isActive) setIsLoading(false); } }
      loadProductDetails();
      return () => { isActive = false; };
    }, [productId, navigation])
  );

  const handleEdit=()=>{if(!product)return;navigation.navigate('EditProduct',{productId:product.id});};
  const handleDelete=()=>{if(!product)return;Alert.alert("Xác nhận",`Xóa "${product.name}"?`,[{text:"Hủy",style:"cancel"},{text:"Xóa",onPress:async()=>{setIsDeleting(true);try{await deleteProduct(product.id);navigation.goBack();}catch(e){Alert.alert("Lỗi",`${e.message}`);setIsDeleting(false);}},style:"destructive"}],{cancelable:true});};
  const openImageViewer = () => { if (product && product.imageUri) { setImageViewerVisible(true); } };

  if(isLoading){return(<SafeAreaView style={[styles.container,styles.centered,{backgroundColor:theme.colors.background}]}><ActivityIndicator size="large" color={theme.colors.primary}/><Text style={[styles.loadingText,{color:theme.colors.onSurfaceVariant}]}>Đang tải...</Text></SafeAreaView>);}
  if(!product){return(<SafeAreaView style={[styles.container,styles.centered,{backgroundColor:theme.colors.background}]}><Ionicons name="alert-circle-outline" size={60} color={theme.colors.error}/><Text style={[styles.errorText,{color:theme.colors.error}]}>Không tìm thấy!</Text><TouchableOpacity onPress={()=>navigation.goBack()} style={styles.backButton}><Text style={styles.backButtonText}>Quay lại</Text></TouchableOpacity></SafeAreaView>);}

  const formattedPrice=product.price||product.price===0?`${Number(product.price).toLocaleString('vi-VN')} VNĐ`:'Chưa cập nhật';

  return (
    <SafeAreaView style={[styles.container,{backgroundColor:theme.colors.background}]}>
        <ScrollView>
            <TouchableOpacity onPress={openImageViewer} disabled={!product.imageUri}>
                {product.imageUri?(<Image source={{uri:product.imageUri}} style={styles.productImage} resizeMode="contain"/>):(<View style={[styles.productImage,styles.imagePlaceholder,{backgroundColor:theme.colors.surfaceVariant, borderBottomColor: theme.colors.outlineVariant}]}><Ionicons name="camera-reverse-outline" size={60} color={theme.colors.onSurfaceVariant}/><Text style={[styles.imagePlaceholderText,{color:theme.colors.onSurfaceVariant}]}>Chưa có ảnh</Text></View>)}
            </TouchableOpacity>
            <View style={styles.detailsContainer}>
                <View style={[styles.infoRow,{borderBottomColor:theme.colors.outlineVariant}]}><Text style={[styles.label,{color:theme.colors.onSurfaceVariant}]}>Mã SP:</Text><Text style={[styles.value,styles.codeValue,{color:theme.colors.onSurfaceVariant}]}>{product.id}</Text></View>
                <View style={[styles.infoRow,{borderBottomColor:theme.colors.outlineVariant}]}><Text style={[styles.label,{color:theme.colors.onSurfaceVariant}]}>Giá bán:</Text><Text style={[styles.value,styles.priceValue]}>{formattedPrice}</Text></View>
                <View style={[styles.infoRow,{borderBottomColor:theme.colors.outlineVariant}]}><Text style={[styles.label,{color:theme.colors.onSurfaceVariant}]}>Quy cách:</Text><Text style={[styles.value,{color:theme.colors.onSurface}]}>{product.specification||'N/A'}</Text></View>
                <View style={[styles.infoRow,{borderBottomColor:theme.colors.outlineVariant}]}><Text style={[styles.label,{color:theme.colors.onSurfaceVariant}]}>Trạng thái:</Text><Text style={[styles.value,{color:product.isOutOfStock?theme.colors.error:styles.priceValue.color,fontWeight:'bold'}]}>{product.isOutOfStock?'Hết hàng':'Còn hàng'}</Text></View>
                {product.createdAt&&(<View style={[styles.infoRow,{borderBottomColor:theme.colors.outlineVariant}]}><Text style={[styles.label,{color:theme.colors.onSurfaceVariant}]}>Ngày tạo:</Text><Text style={[styles.value,styles.dateValue,{color:theme.colors.onSurfaceVariant}]}>{new Date(product.createdAt).toLocaleString('vi-VN')}</Text></View>)}
            </View>
            <View style={[styles.buttonContainer,{borderTopColor: theme.colors.outlineVariant}]}>
                {/* Đã sửa lỗi whitespace */}
                <TouchableOpacity style={[styles.button,styles.editButton]} onPress={handleEdit} disabled={isDeleting} activeOpacity={0.7}>
                    <View style={styles.buttonContent}>
                        <Ionicons name="pencil-outline" size={20} color="#333"/>
                        <Text style={[styles.buttonText,{color: '#333'}]}>Chỉnh sửa</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button,styles.deleteButton,isDeleting&&styles.buttonDisabled]} onPress={handleDelete} disabled={isDeleting} activeOpacity={0.7}>
                    {isDeleting?<ActivityIndicator size="small" color="#fff"/>:
                        <View style={styles.buttonContent}>
                            <Ionicons name="trash-outline" size={20} color="#fff"/>
                            <Text style={styles.buttonText}>Xóa</Text>
                        </View>
                    }
                </TouchableOpacity>
            </View>
        </ScrollView>
        <ImageViewerModal images={product&&product.imageUri?[{url:product.imageUri}]:[]} visible={isImageViewerVisible} onClose={()=>setImageViewerVisible(false)}/>
    </SafeAreaView>
  );
}
// Styles
const styles = StyleSheet.create({ container:{flex:1},centered:{flex:1,justifyContent:'center',alignItems:'center',padding:20},loadingText:{marginTop:10,fontSize:16},errorText:{fontSize:18,marginBottom:20,textAlign:'center',fontWeight:'500'},backButton:{marginTop:15, backgroundColor:'#007AFF',paddingHorizontal:20,paddingVertical:10,borderRadius:5},backButtonText:{color:'#fff',fontSize:16,fontWeight:'bold'},productImage:{width:'100%',height:300,marginBottom:20,borderBottomWidth:1},imagePlaceholder:{justifyContent:'center',alignItems:'center'},imagePlaceholderText:{fontSize:14,marginTop:8},detailsContainer:{paddingHorizontal:15,paddingBottom:15},infoRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:10,borderBottomWidth:1},label:{fontSize:15.5,fontWeight:'500',marginRight:10},value:{fontSize:16,textAlign:'right',flexShrink:1,marginLeft:'auto'},codeValue:{fontFamily:Platform.OS==='ios'?'Courier New':'monospace',fontSize:15},priceValue:{fontWeight:'bold',color:'#198754'},dateValue:{fontSize:15},buttonContainer:{flexDirection:'row',justifyContent:'space-around',paddingVertical:15,paddingHorizontal:15,marginTop:15,marginBottom:25,borderTopWidth:1},button:{flex:1, paddingVertical:12,borderRadius:8,marginHorizontal:8,elevation:2,shadowOffset:{width:0,height:2},shadowOpacity:0.2,shadowRadius:2},buttonContent:{flexDirection:'row',alignItems:'center',justifyContent:'center'},editButton:{backgroundColor:'#ffc107',shadowColor:'#ffc107'},deleteButton:{backgroundColor:'#dc3545',shadowColor:'#dc3545'},buttonDisabled:{backgroundColor:'#adb5bd',elevation:0,shadowOpacity:0},buttonText:{fontSize:16,fontWeight:'bold',marginLeft:8,textShadowColor:'rgba(0,0,0,0.2)',textShadowOffset:{width:0,height:1},textShadowRadius:1, color: '#fff'} });