import React, { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal } from "react-native"
import { CameraView, useCameraPermissions } from "expo-camera"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import api from "../services/api"
import { useTheme } from "../contexts/ThemeContext"

export default function QrScanScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [qrSessionId, setQrSessionId] = useState<string | null>(null)
  const [scanMode, setScanMode] = useState<"login" | "group" | null>(null)
  const [groupInviteCode, setGroupInviteCode] = useState<string | null>(null)
  
  const { isDarkMode: darkMode } = useTheme()
  const navigation = useNavigation<any>()

  useEffect(() => {
    if (!permission) {
      requestPermission()
    }
  }, [permission])

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: darkMode ? "#111827" : "white", justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: darkMode ? "white" : "black" }}>Đang yêu cầu quyền truy cập camera...</Text>
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: darkMode ? "#111827" : "white", justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ textAlign: 'center', color: darkMode ? "white" : "black", paddingHorizontal: 20, marginBottom: 20 }}>
          Ứng dụng cần quyền truy cập camera để quét mã QR.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Cấp quyền</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned) return
    setScanned(true)
    
    // UUID regex format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    let scannedQrContent: string | null = null
    let inviteCode: string | null = null

    const trimmedData = data.trim()

    // 1. Check if it is a group join URL
    if (trimmedData.includes("/join/")) {
      const parts = trimmedData.split("/join/")
      if (parts.length > 1) {
        inviteCode = parts[1].split("?")[0].split("#")[0].trim().toUpperCase()
      }
    } 
    // 2. Check if it is a raw 8-character group invite code
    else if (/^[A-Z0-9]{8}$/i.test(trimmedData)) {
      inviteCode = trimmedData.toUpperCase()
    } 
    // 3. Check if it is a login UUID
    else if (uuidRegex.test(trimmedData)) {
      scannedQrContent = trimmedData
    } else if (trimmedData.includes("qr-login?session=")) {
      try {
        const url = new URL(trimmedData)
        scannedQrContent = url.searchParams.get("session")
      } catch (err) {
        const match = trimmedData.match(/session=([^&]+)/)
        if (match) {
          scannedQrContent = match[1]
        }
      }
    }

    try {
      if (scannedQrContent) {
        setScanMode("login")
        setGroupInviteCode(null)
        setLoading(true)
        
        // Call API to scan
        const response = await api.post("/api/v1/qr-login/scan", { qrContent: scannedQrContent })
        
        const sessionId = response.data?.data?.sessionId
        if (sessionId) {
          setQrSessionId(sessionId)
          setLoading(false)
          setShowConfirm(true)
        } else {
          Alert.alert("Lỗi", "Không nhận được phiên đăng nhập hợp lệ từ hệ thống")
          setLoading(false)
          setScanned(false)
        }
      } else if (inviteCode) {
        setScanMode("group")
        setQrSessionId(null)
        setGroupInviteCode(inviteCode)
        setShowConfirm(true)
      } else {
        Alert.alert("Lỗi", "Mã QR không hợp lệ hoặc không thuộc hệ thống")
        setScanned(false)
      }
    } catch (e: any) {
      console.log("QR Scan Error:", e.response?.data || e.message)
      Alert.alert("Lỗi", "Không thể xác nhận mã QR")
      setLoading(false)
      setScanned(false)
    }
  }

  const handleConfirm = async () => {
    if (scanMode === "login") {
      if (!qrSessionId) return
      
      try {
        setLoading(true)
        await api.post("/api/v1/qr-login/confirm", { sessionId: qrSessionId })
        setShowConfirm(false)
        Alert.alert("Thành công", "Đăng nhập trên Web thành công!", [
          { text: "OK", onPress: () => navigation.goBack() }
        ])
      } catch (e: any) {
        console.log("QR Confirm Error:", e.response?.data || e.message)
        Alert.alert("Lỗi", "Đã xảy ra lỗi khi xác nhận đăng nhập")
      } finally {
        setLoading(false)
      }
    } else if (scanMode === "group") {
      if (!groupInviteCode) return

      try {
        setLoading(true)
        const response = await api.post("/api/v1/conversations/join", { code: groupInviteCode })
        const payloadData = response.data?.data
        setShowConfirm(false)
        
        if (payloadData?.status === 'pending') {
          Alert.alert("Chờ phê duyệt", payloadData.message || "Yêu cầu tham gia của bạn đang chờ phê duyệt từ quản trị viên.", [
            { text: "Đóng", onPress: () => navigation.goBack() }
          ])
        } else {
          const conv = payloadData?.conversation
          if (conv) {
            Alert.alert("Thành công", "Tham gia nhóm thành công!", [
              {
                text: "Trò chuyện ngay",
                onPress: () => {
                  navigation.replace("Chat", {
                    conversationId: conv.id,
                    user: {
                      id: conv.id,
                      name: conv.name,
                      avatar: conv.avatarUrl,
                      isGroup: true,
                    },
                  })
                }
              },
              {
                text: "Để sau",
                onPress: () => navigation.goBack()
              }
            ])
          } else {
            Alert.alert("Thành công", "Tham gia nhóm thành công!", [
              { text: "OK", onPress: () => navigation.goBack() }
            ])
          }
        }
      } catch (e: any) {
        console.log("Group Join Error:", e.response?.data || e.message)
        Alert.alert("Lỗi", e.response?.data?.message || "Không thể tham gia nhóm")
      } finally {
        setLoading(false)
        setScanned(false)
      }
    }
  }

  const handleReject = async () => {
    if (scanMode === "login" && qrSessionId) {
      try {
        await api.post("/api/v1/qr-login/reject", { sessionId: qrSessionId })
      } catch (e) {
        // Ignore
      }
    }
    
    setShowConfirm(false)
    setScanned(false)
    setQrSessionId(null)
    setGroupInviteCode(null)
    setScanMode(null)
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: darkMode ? "#1F2937" : "white", borderBottomColor: darkMode ? "#374151" : "#E5E7EB" }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={darkMode ? "white" : "black"} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: darkMode ? "white" : "black" }]}>
          {scanMode === "group" ? "Quét mã QR Vào nhóm" : "Quét mã QR"}
        </Text>
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
            Di chuyển camera đến mã QR đăng nhập máy tính hoặc QR liên kết vào nhóm
          </Text>
        </View>
      </View>

      {/* Confirmation Modal */}
      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: darkMode ? "#1F2937" : "white" }]}>
            <Ionicons 
              name={scanMode === "login" ? "laptop-outline" : "people-outline"} 
              size={60} 
              color="#0068FF" 
            />
            <Text style={[styles.modalTitle, { color: darkMode ? "white" : "black" }]}>
              {scanMode === "login" ? "Xác nhận đăng nhập" : "Xác nhận tham gia nhóm"}
            </Text>
            <Text style={[styles.modalText, { color: darkMode ? "#9CA3AF" : "#555" }]}>
              {scanMode === "login" 
                ? "Bạn có muốn đăng nhập tài khoản này trên trình duyệt web không?" 
                : `Bạn có muốn tham gia nhóm trò chuyện với mã mời "${groupInviteCode}" không?`}
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.rejectBtn, { backgroundColor: darkMode ? "#374151" : "#F3F4F6" }]} onPress={handleReject} disabled={loading}>
                <Text style={[styles.rejectBtnText, { color: darkMode ? "#F9FAFB" : "#333" }]}>
                  {scanMode === "login" ? "Từ chối" : "Hủy"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.confirmBtn]} onPress={handleConfirm} disabled={loading}>
                <Text style={styles.confirmBtnText}>
                  {scanMode === "login" 
                    ? (loading ? "Đang xử lý..." : "Đăng nhập") 
                    : (loading ? "Đang tham gia..." : "Tham gia")}
                </Text>
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
    backgroundColor: "white",
    borderBottomWidth: 1,
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
  
  btn: { backgroundColor: "#0068FF", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
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
