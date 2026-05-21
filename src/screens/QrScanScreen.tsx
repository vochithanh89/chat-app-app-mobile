import React, { useState, useEffect, useRef } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal } from "react-native"
import { CameraView, CameraType, useCameraPermissions } from "expo-camera"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import api from "../services/api"
import { ZALO_BLUE } from "../theme" // Assuming standard styling

export default function QrScanScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [qrSessionId, setQrSessionId] = useState<string | null>(null)
  
  const navigation = useNavigation<any>()

  useEffect(() => {
    if (!permission) {
      requestPermission()
    }
  }, [permission])

  if (!permission) {
    return <View style={styles.container}><Text>Đang yêu cầu quyền truy cập camera...</Text></View>
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center' }}>Ứng dụng cần quyền truy cập camera để quét mã QR đăng nhập.</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Cấp quyền</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned) return
    setScanned(true)
    
    // Parse the QR code data: mychat://qr-login?session=abcxyz123
    try {
      if (data.includes('qr-login?session=')) {
        const url = new URL(data)
        const sessionId = url.searchParams.get('session')
        
        if (sessionId) {
          setQrSessionId(sessionId)
          setLoading(true)
          
          // Call API to scan
          await api.post('/api/v1/qr-login/scan', { qrSessionId: sessionId })
          
          setLoading(false)
          setShowConfirm(true)
        } else {
          Alert.alert("Lỗi", "Mã QR không hợp lệ")
          setScanned(false)
        }
      } else {
        Alert.alert("Lỗi", "Mã QR không thuộc hệ thống đăng nhập")
        setScanned(false)
      }
    } catch (e: any) {
      console.log('QR Scan Error:', e.response?.data || e.message)
      Alert.alert("Lỗi", "Không thể xác nhận mã QR")
      setLoading(false)
      setScanned(false)
    }
  }

  const handleConfirm = async () => {
    if (!qrSessionId) return
    
    try {
      setLoading(true)
      await api.post('/api/v1/qr-login/confirm', { qrSessionId })
      setShowConfirm(false)
      Alert.alert("Thành công", "Đăng nhập trên Web thành công!", [
        { text: "OK", onPress: () => navigation.goBack() }
      ])
    } catch (e: any) {
      console.log('QR Confirm Error:', e.response?.data || e.message)
      Alert.alert("Lỗi", "Đã xảy ra lỗi khi xác nhận đăng nhập")
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!qrSessionId) return
    
    try {
      await api.post('/api/v1/qr-login/reject', { qrSessionId })
    } catch (e) {
      // Ignore
    }
    
    setShowConfirm(false)
    setScanned(false)
    setQrSessionId(null)
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quét mã QR Đăng nhập</Text>
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
        />
        <View style={styles.overlay}>
          <View style={styles.scanBox} />
          <Text style={styles.scanText}>
            Di chuyển camera đến mã QR trên màn hình máy tính để đăng nhập
          </Text>
        </View>
      </View>

      {/* Confirmation Modal */}
      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Ionicons name="laptop-outline" size={60} color="#0068FF" />
            <Text style={styles.modalTitle}>Xác nhận đăng nhập</Text>
            <Text style={styles.modalText}>
              Bạn có muốn đăng nhập tài khoản này trên trình duyệt web không?
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.rejectBtn]} onPress={handleReject} disabled={loading}>
                <Text style={styles.rejectBtnText}>Từ chối</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.confirmBtn]} onPress={handleConfirm} disabled={loading}>
                <Text style={styles.confirmBtnText}>{loading ? 'Đang xử lý...' : 'Đăng nhập'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: "white"
  },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 18, fontWeight: "600" },
  
  cameraContainer: { flex: 1 },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center"
  },
  scanBox: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "#0068FF",
    backgroundColor: "transparent",
    marginBottom: 20
  },
  scanText: { color: "white", textAlign: "center", paddingHorizontal: 40 },
  
  btn: { backgroundColor: "#0068FF", padding: 12, borderRadius: 8, margin: 20 },
  btnText: { color: "white", textAlign: "center", fontWeight: "bold" },

  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  modalContent: {
    backgroundColor: "white",
    width: "100%",
    borderRadius: 16,
    padding: 24,
    alignItems: "center"
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginTop: 15, marginBottom: 10 },
  modalText: { fontSize: 15, color: "#555", textAlign: "center", marginBottom: 25, lineHeight: 22 },
  modalActions: { flexDirection: "row", width: "100%", justifyContent: "space-between" },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  rejectBtn: { backgroundColor: "#F3F4F6", marginRight: 10 },
  rejectBtnText: { color: "#333", fontWeight: "600", fontSize: 16 },
  confirmBtn: { backgroundColor: "#0068FF", marginLeft: 10 },
  confirmBtnText: { color: "white", fontWeight: "600", fontSize: 16 }
})
