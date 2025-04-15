// components/ImageViewerModal.js
import React from 'react';
import { Modal, StyleSheet, View, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import ImageViewer from 'react-native-image-zoom-viewer';
import { IconButton, useTheme } from 'react-native-paper';

const ImageViewerModal = ({ images = [], visible = false, initialIndex = 0, onClose }) => {
  const theme = useTheme();
  if (!visible || !Array.isArray(images) || images.length === 0) { return null; }
  const formattedImages = images.map(img => ({ url: typeof img === 'string' ? img : img?.url || img?.uri, })).filter(img => img.url);
  if (formattedImages.length === 0) { return null; }
  const validInitialIndex = Math.max(0, Math.min(initialIndex, formattedImages.length - 1));

  return (
    <Modal visible={visible} transparent={true} onRequestClose={onClose} statusBarTranslucent={true}>
       <SafeAreaView style={styles.safeArea}>
            <View style={styles.closeButtonContainer}>
                <IconButton icon="close" iconColor={'#FFFFFF'} size={28} onPress={onClose} style={[styles.closeButton, { backgroundColor: 'rgba(0,0,0,0.4)'}]} mode="contained"/>
            </View>
           <ImageViewer imageUrls={formattedImages} index={validInitialIndex} onCancel={onClose} enableSwipeDown={true} renderIndicator={() => null} backgroundColor={theme.dark ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.85)'} saveToLocalByLongPress={false} loadingRender={() => <ActivityIndicator size="large" color="#fff"/>} enablePreload={true} />
       </SafeAreaView>
    </Modal>
  );
};
const styles = StyleSheet.create({ safeArea:{flex:1,backgroundColor:'transparent'}, closeButtonContainer:{position:'absolute',top:(StatusBar.currentHeight||10)+10,right:15,zIndex:10}, closeButton:{borderRadius:20,margin:0} });
export default ImageViewerModal;