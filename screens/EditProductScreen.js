// screens/EditProductScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Image, Alert, ScrollView, TouchableOpacity, Platform, ActivityIndicator, KeyboardAvoidingView, Modal as RNModal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getProductById, updateProduct } from '../services/storage';
import { useRoute, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from 'react-native-paper';
import ImageViewerModal from '../components/ImageViewerModal';

export default function EditProductScreen() {
  const route = useRoute(); const navigation = useNavigation(); const productId = route.params?.productId;
  const [product, setProduct] = useState(null); const [name, setName] = useState(''); const [price, setPrice] = useState(''); const [specification, setSpecification] = useState(''); const [imageUri, setImageUri] = useState(null); const [isSaving, setIsSaving] = useState(false); const [isImageViewerVisible, setImageViewerVisible] = useState(false); const [isLoading, setIsLoading] = useState(true);
  const theme = useTheme();

  useEffect(() => { const load=async()=>{if(!productId){Alert.alert("Lỗi","Mã SP lỗi.",[{text:"OK",onPress:navigation.goBack}]);setIsLoading(false);return;}setIsLoading(true);try{const d=await getProductById(productId);if(d){setProduct(d);setName(d.name);setPrice(String(d.price??''));setSpecification(d.specification);setImageUri(d.imageUri);navigation.setOptions({title:`Sửa: ${d.name}`});}else{Alert.alert("Lỗi","Không tìm thấy SP.",[{text:"OK",onPress:navigation.goBack}]);}}catch(e){Alert.alert("Lỗi","Không thể tải SP.");}finally{setIsLoading(false);}};load(); },[productId,navigation]);
  const pickImage = async () => { const {status}=await ImagePicker.requestMediaLibraryPermissionsAsync(); if(status!=='granted'){Alert.alert('Cần quyền','Truy cập ảnh.');return;} try{let r=await ImagePicker.launchImageLibraryAsync({mediaTypes:ImagePicker.MediaTypeOptions.Images,allowsEditing:true,aspect:[1,1],quality:0.8}); if(!r.canceled&&r.assets?.length>0){setImageUri(r.assets[0].uri);}else if(!r.cancelled&&r.uri){setImageUri(r.uri);}} catch(e){console.error("PickImgErr:",e);Alert.alert("Lỗi",`Chọn ảnh thất bại:${e.message}`);}};
  const openImageViewer = () => { if(imageUri){setImageViewerVisible(true);}};
  const handlePriceInputChange = (t)=>{setPrice(t.replace(/[^0-9]/g,''));};
  const formatCurrency = (v)=>{if(!v||isNaN(Number(v))||Number(v)<=0)return null;try{return Number(v).toLocaleString('vi-VN')+' VNĐ';}catch{return null;}};
  const handleUpdateProduct=async()=>{if(!product)return; if(!name.trim()){Alert.alert('','Nhập tên.');return;} if(price.trim()===''||isNaN(Number(price))||Number(price)<0){Alert.alert('','Giá lỗi.');return;} if(!specification.trim()){Alert.alert('','Nhập QC.');return;} setIsSaving(true); const updatedData={...product,name:name.trim(),price:Number(price),specification:specification.trim(),imageUri:imageUri,}; try{await updateProduct(updatedData);navigation.goBack();} catch(e){setIsSaving(false);Alert.alert('Lỗi',`Lưu thất bại. ${e.message}`);}};
  const formattedDisplayPrice = formatCurrency(price);

  if(isLoading){return(<View style={[styles.centered,{backgroundColor: theme.colors.background}]}><ActivityIndicator size="large" color={theme.colors.primary}/></View>);}
  if(!product&&!isLoading){return(<View style={[styles.centered,{backgroundColor: theme.colors.background}]}><Text style={{color: theme.colors.error}}>Không tải được sản phẩm.</Text></View>);}

  return (
    <KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":"height"} style={{flex:1}}>
        <ScrollView contentContainerStyle={[styles.container,{backgroundColor: theme.colors.background}]} keyboardShouldPersistTaps="handled">
             <Text style={[styles.label,{color: theme.colors.onSurface}]}>Tên SP <Text style={styles.required}>*</Text></Text><TextInput style={[styles.input,{backgroundColor: theme.colors.surfaceVariant, color: theme.colors.onSurface, borderColor: theme.colors.outline}]} value={name} onChangeText={setName} placeholder="Nhập tên" autoCapitalize="words" placeholderTextColor={theme.colors.onSurfaceVariant}/>
             <View style={[styles.priceDisplayContainer,{backgroundColor: theme.colors.surfaceVariant}]}><Text style={[formattedDisplayPrice?styles.formattedPriceText:styles.formattedPricePlaceholder, {color: formattedDisplayPrice ? styles.formattedPriceText.color : theme.colors.onSurfaceVariant }]}>{formattedDisplayPrice??'Giá trị'}</Text></View>
             <Text style={[styles.label,{color: theme.colors.onSurface}]}>Giá (VNĐ) <Text style={styles.required}>*</Text></Text><TextInput style={[styles.input,{backgroundColor: theme.colors.surfaceVariant, color: theme.colors.onSurface, borderColor: theme.colors.outline}]} value={price} onChangeText={handlePriceInputChange} placeholder="Chỉ nhập số" keyboardType="numeric" placeholderTextColor={theme.colors.onSurfaceVariant}/>
             <Text style={[styles.label,{color: theme.colors.onSurface}]}>Quy cách <Text style={styles.required}>*</Text></Text><TextInput style={[styles.input,{backgroundColor: theme.colors.surfaceVariant, color: theme.colors.onSurface, borderColor: theme.colors.outline}]} value={specification} onChangeText={setSpecification} placeholder="Ví dụ: Thùng, Cái..." placeholderTextColor={theme.colors.onSurfaceVariant}/>
             <Text style={[styles.label,{color: theme.colors.onSurface}]}>Hình ảnh</Text>
             {/* Đã sửa lỗi whitespace */}
             <View style={styles.imagePickerContainer}>
                 <TouchableOpacity style={[styles.imagePickerButton,{backgroundColor:theme.colors.secondaryContainer}]} onPress={pickImage}>
                     <Ionicons name="image-outline" size={20} color={theme.colors.onSecondaryContainer}/>
                     <Text style={[styles.imagePickerButtonText,{color: theme.colors.onSecondaryContainer}]}>Đổi ảnh...</Text>
                  </TouchableOpacity>
                 {imageUri&&(<TouchableOpacity onPress={openImageViewer}><Image source={{uri:imageUri}} style={[styles.imagePreview,{borderColor:theme.colors.outline}]}/></TouchableOpacity>)}
             </View>
             <TouchableOpacity style={[styles.saveButton, isSaving&&styles.saveButtonDisabled]} onPress={handleUpdateProduct} disabled={isSaving}>{isSaving?<ActivityIndicator size="small" color="#fff"/>:<Text style={styles.saveButtonText}>Lưu Thay Đổi</Text>}</TouchableOpacity>
        </ScrollView>
         <ImageViewerModal images={imageUri?[{url:imageUri}]:[]} visible={isImageViewerVisible} onClose={()=>setImageViewerVisible(false)}/>
    </KeyboardAvoidingView>
  );
}
// Styles
const styles = StyleSheet.create({ container:{flexGrow:1,padding:20,paddingBottom:40},centered:{flex:1,justifyContent:'center',alignItems:'center'},label:{fontSize:16,marginBottom:5,fontWeight:'500'},required:{color:'red'},input:{height:45,borderWidth:1,borderRadius:8,marginBottom:18,paddingHorizontal:12,fontSize:16},priceDisplayContainer:{marginBottom:5,paddingVertical:8,paddingHorizontal:12,borderRadius:5,minHeight:35,justifyContent:'center'},formattedPriceText:{fontSize:17,fontWeight:'bold',color:'#198754'},formattedPricePlaceholder:{fontSize:14,fontStyle:'italic'},imagePickerContainer:{flexDirection:'row',alignItems:'center',marginBottom:25,marginTop:5},imagePickerButton:{flexDirection:'row',alignItems:'center',paddingVertical:10,paddingHorizontal:15,borderRadius:5},imagePickerButtonText:{marginLeft:5},imagePreview:{width:80,height:80,borderRadius:8,marginLeft:20,borderWidth:1},saveButton:{backgroundColor:'#007AFF',paddingVertical:15,borderRadius:8,alignItems:'center',marginTop:10},saveButtonDisabled:{backgroundColor:'#a0a0a0'},saveButtonText:{color:'#fff',fontSize:18,fontWeight:'bold'},modalContainer:{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'rgba(0,0,0,0.85)'},modalImage:{width:'90%',height:'75%',marginBottom:20,borderRadius:5},modalCloseButton:{position:'absolute',top:50,right:20,padding:8,borderRadius:20}});