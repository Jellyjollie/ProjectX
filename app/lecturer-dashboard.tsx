import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Modal, BackHandler, Alert, TextInput, RefreshControl } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Course, getCourses } from '../lib/api';
import QRCode from 'react-native-qrcode-svg';
import * as MediaLibrary from 'expo-media-library';
import ViewShot from 'react-native-view-shot';
import { API_CONFIG } from '../config';

SplashScreen.preventAutoHideAsync();

export default function LecturerDashboard() {
  const params = useLocalSearchParams();
  const currentUserId = params.id as string;
  
  const [fontsLoaded, fontError] = useFonts({
    'THEDISPLAYFONT': require('../assets/fonts/THEDISPLAYFONT-DEMOVERSION.ttf'),
  });

  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Add polling for real-time updates
  useEffect(() => {
    const pollInterval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchAssignedCourses();
    }
  }, [currentUserId, refreshTrigger]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      setShowLogoutConfirm(true);
      return true; // Prevent default back behavior
    });

    return () => backHandler.remove();
  }, []);

  const fetchAssignedCourses = async () => {
    try {
      setIsLoading(true);
      const allCourses = await getCourses();
      console.log('Current Lecturer ID:', currentUserId);
      console.log('All Courses:', allCourses);
      
      const assignedCourses = allCourses.filter((course: Course) => {
        console.log('Course Lecturer ID:', course.lecturerId?._id);
        return course.lecturerId?._id === currentUserId;
      });
      
      console.log('Assigned Courses:', assignedCourses);
      setCourses(assignedCourses);
      setError(null);
    } catch (error) {
      console.error('Error fetching assigned courses:', error);
      setError('Failed to fetch courses. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    router.replace('/');
  };

  // Add refresh function
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const generateQRData = (course: Course) => {
    const now = new Date();
    const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // Convert to PH time (UTC+8)
    const expiryTime = new Date(phTime.getTime() + (60 * 60 * 1000)); // 1 hour from now
    
    return JSON.stringify({
      courseId: course._id,
      courseCode: course.courseCode,
      courseName: course.courseName,
      generatedAt: phTime.toISOString(),
      expiresAt: expiryTime.toISOString()
    });
  };

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Image
              source={require('../assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitle, styles.headerTitleChe]}>CHE</Text>
              <Text style={[styles.headerTitle, styles.headerTitleQr]}>QR</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
              <Ionicons name="refresh" size={24} color="#002147" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Ionicons name="log-out-outline" size={32} color="#002147" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.welcomeText}>Lecturer Dashboard</Text>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            colors={['#002147']}
            tintColor="#002147"
          />
        }
      >
        {isLoading ? (
          <ActivityIndicator size="large" color="#1a73e8" style={styles.loader} />
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : courses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No assigned courses found</Text>
          </View>
        ) : (
          courses.map((course) => (
            <CourseCard key={course._id} course={course} />
          ))
        )}
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.confirmModal]}>
            <View style={styles.confirmHeader}>
              <Ionicons name="log-out-outline" size={48} color="#002147" />
              <Text style={styles.confirmTitle}>Confirm Logout</Text>
            </View>
            
            <Text style={styles.confirmText}>
              Are you sure you want to logout?
            </Text>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelConfirmButton]}
                onPress={() => setShowLogoutConfirm(false)}
              >
                <Text style={styles.cancelConfirmText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.logoutConfirmButton]}
                onPress={handleConfirmLogout}
              >
                <Text style={styles.logoutConfirmText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const CourseCard = ({ course }: { course: Course }) => {
  const [showQRModal, setShowQRModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [qrData, setQRData] = useState<{ data: string; expiresAt: string } | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [remainingTime, setRemainingTime] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const qrRef = useRef<any>(null);
  const countdownInterval = useRef<NodeJS.Timeout>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Check for existing valid QR code
  const checkExistingQRCode = async () => {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/attendance/course/${course._id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch attendance records');
      }
      const records = await response.json();
      
      // Find the most recent valid QR code
      const now = new Date();
      const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // Current PH time
      const validRecord = records.find((record: any) => new Date(record.expiresAt) > phTime);

      if (validRecord) {
        setQRData({
          data: validRecord.qrCodeData,
          expiresAt: validRecord.expiresAt
        });
        setShowQRModal(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking existing QR code:', error);
      return false;
    }
  };

  useEffect(() => {
    if (qrData) {
      // Start countdown timer
      countdownInterval.current = setInterval(() => {
        const now = new Date();
        const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // Current PH time
        const expiryTime = new Date(qrData.expiresAt);
        const diffInMinutes = Math.floor((expiryTime.getTime() - phTime.getTime()) / (1000 * 60));
        
        if (diffInMinutes <= 0) {
          setRemainingTime('expired');
          clearInterval(countdownInterval.current);
          setShowQRModal(false);
          setQRData(null);
        } else {
          setRemainingTime(`${diffInMinutes} minutes`);
        }
      }, 1000);
    }

    return () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
    };
  }, [qrData]);

  const generateQRData = async () => {
    try {
      setIsLoading(true);
      if (!course.lecturerId?._id) {
        throw new Error('Lecturer ID not found');
      }

      const response = await fetch(`${API_CONFIG.baseURL}/attendance/generate-qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId: course._id,
          lecturerId: course.lecturerId._id
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate QR code');
      }

      const data = await response.json();
      return {
        data: data.qrData,
        expiresAt: data.expiresAt
      };
    } catch (error) {
      console.error('Error generating QR code:', error);
      Alert.alert('Error', 'Failed to generate QR code. Please try again.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateQR = async () => {
    const hasValidQR = await checkExistingQRCode();
    if (!hasValidQR) {
      setShowConfirmModal(true);
    }
  };

  const handleConfirmGenerateQR = async () => {
    setShowConfirmModal(false);
    const newQRData = await generateQRData();
    if (newQRData) {
      setQRData(newQRData);
      setShowQRModal(true);
    }
  };

  const handleViewAttendance = async () => {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/attendance/course/${course._id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch attendance records');
      }
      const records = await response.json();
      
      // Sort records by generation time (most recent first)
      const sortedRecords = records.sort((a: any, b: any) => 
        new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
      );
      
      setAttendanceRecords(sortedRecords);
      setShowAttendanceModal(true);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      Alert.alert('Error', 'Failed to fetch attendance records. Please try again.');
    }
  };

  const handleSaveQRCode = async () => {
    try {
      // Request permission to access media library
      const { status } = await MediaLibrary.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant permission to save QR code to your gallery.');
        return;
      }

      if (qrRef.current) {
        const uri = await qrRef.current.capture();
        const asset = await MediaLibrary.createAssetAsync(uri);
        await MediaLibrary.createAlbumAsync('CHEQR', asset, false);
        
        Alert.alert('Success', 'QR code saved to gallery successfully!');
      }
    } catch (error) {
      console.error('Error saving QR code:', error);
      Alert.alert('Error', 'Failed to save QR code to gallery.');
    }
  };

  const filteredRecords = attendanceRecords.map(record => {
    const filteredScans = record.scannedBy.filter((scan: any) => {
      const fullName = `${scan.studentId.firstName} ${scan.studentId.lastName}`.toLowerCase();
      const idNumber = scan.studentId.idNumber.toLowerCase();
      const query = searchQuery.toLowerCase();
      return fullName.includes(query) || idNumber.includes(query);
    });
    return { ...record, scannedBy: filteredScans };
  }).filter(record => record.scannedBy.length > 0);

  const handleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  return (
    <View style={styles.courseCard}>
      <View style={styles.courseImageContainer}>
        <Image
          source={require('../assets/images/c_image.jpg')}
          style={styles.courseImage}
        />
        <View style={styles.courseOverlay}>
          <View style={styles.courseActions}>
            <TouchableOpacity 
              style={styles.courseActionButton}
              onPress={handleGenerateQR}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFD700" />
              ) : (
                <Ionicons name="qr-code-outline" size={24} color="#FFD700" />
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.courseActionButton}
              onPress={handleViewAttendance}
            >
              <Ionicons name="people-outline" size={24} color="#FFD700" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <View style={styles.courseContent}>
        <View style={styles.courseHeader}>
          <View style={styles.courseTitleContainer}>
            <Text style={styles.courseCode}>{course.courseCode}</Text>
            <Text style={styles.courseTitle} numberOfLines={1}>{course.courseName}</Text>
          </View>
          <View style={styles.studentCount}>
            <Ionicons name="people" size={16} color="#666" />
            <Text style={styles.studentCountText}>{course.students?.length || 0}</Text>
          </View>
        </View>
        
        <View style={styles.schedulesContainer}>
          {course.schedules.map((schedule, index) => (
            <View key={index} style={styles.scheduleCard}>
              <View style={styles.scheduleHeader}>
                <Ionicons name="calendar" size={16} color="#002147" />
                <Text style={styles.scheduleDays}>{schedule.days.join(', ')}</Text>
              </View>
              <View style={styles.scheduleTime}>
                <Ionicons name="time" size={16} color="#002147" />
                <Text style={styles.timeText}>{schedule.startTime} - {schedule.endTime}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* QR Code Generation Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.confirmModal]}>
            <View style={styles.confirmHeader}>
              <Ionicons name="qr-code-outline" size={48} color="#002147" />
              <Text style={styles.confirmTitle}>Generate QR Code</Text>
            </View>
            
            <Text style={styles.confirmText}>
              This will generate a QR code for attendance that will expire in 1 hour. Are you sure you want to proceed?
            </Text>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelConfirmButton]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.cancelConfirmText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmGenerateButton]}
                onPress={handleConfirmGenerateQR}
              >
                <Text style={styles.confirmGenerateText}>Generate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        visible={showQRModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Course QR Code</Text>
              <TouchableOpacity onPress={() => setShowQRModal(false)}>
                <Ionicons name="close" size={24} color="#002147" />
              </TouchableOpacity>
            </View>
            <ViewShot ref={qrRef} style={styles.qrContainer}>
              {qrData && (
                <QRCode
                  value={qrData.data}
                  size={200}
                  color="#002147"
                  backgroundColor="white"
                />
              )}
            </ViewShot>
            <Text style={styles.qrInfo}>
              This QR code will expire in {remainingTime}
            </Text>
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSaveQRCode}
            >
              <Ionicons name="save-outline" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save to Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Attendance Modal */}
      <Modal
        visible={showAttendanceModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAttendanceModal(false)}
      >
        <View style={[styles.modalOverlay, isFullScreen && styles.fullScreenModal]}>
          <View style={[styles.modalContent, isFullScreen && styles.fullScreenContent]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>Attendance Records</Text>
                <Text style={styles.courseSubtitle}>{course.courseName}</Text>
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={handleFullScreen} style={styles.fullScreenButton}>
                  <Ionicons 
                    name={isFullScreen ? "contract-outline" : "expand-outline"} 
                    size={24} 
                    color="#002147" 
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowAttendanceModal(false)}>
                  <Ionicons name="close" size={24} color="#002147" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or ID..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#999"
              />
              {searchQuery ? (
                <TouchableOpacity 
                  onPress={() => setSearchQuery('')}
                  style={styles.clearSearchButton}
                >
                  <Ionicons name="close-circle" size={20} color="#666" />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.sessionTabs}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.sessionTab, !selectedSession && styles.selectedSessionTab]}
                  onPress={() => setSelectedSession(null)}
                >
                  <Text style={[styles.sessionTabText, !selectedSession && styles.selectedSessionTabText]}>
                    All Sessions
                  </Text>
                </TouchableOpacity>
                {attendanceRecords.map((record, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.sessionTab, selectedSession === record._id && styles.selectedSessionTab]}
                    onPress={() => setSelectedSession(record._id)}
                  >
                    <Text style={[styles.sessionTabText, selectedSession === record._id && styles.selectedSessionTabText]}>
                      {new Date(record.generatedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <ScrollView style={styles.attendanceList}>
              {filteredRecords.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={48} color="#ccc" />
                  <Text style={styles.noAttendanceText}>
                    {searchQuery ? 'No matching students found' : 'No attendance records found'}
                  </Text>
                </View>
              ) : (
                filteredRecords
                  .filter(record => !selectedSession || record._id === selectedSession)
                  .map((record, index) => (
                    <View key={index} style={styles.attendanceSession}>
                      <View style={styles.sessionHeader}>
                        <Text style={styles.sessionDate}>
                          {new Date(record.generatedAt).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </Text>
                        <Text style={styles.sessionTime}>
                          {new Date(record.generatedAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      </View>
                      <View style={styles.studentsList}>
                        {record.scannedBy.map((scan: any, scanIndex: number) => (
                          <View key={scanIndex} style={styles.studentItem}>
                            <View style={styles.studentInfo}>
                              <Text style={styles.studentName}>
                                {scan.studentId.firstName} {scan.studentId.lastName}
                              </Text>
                              <Text style={styles.studentId}>
                                ID: {scan.studentId.idNumber}
                              </Text>
                            </View>
                            <Text style={styles.scanTime}>
                              {new Date(scan.scannedAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: 'transparent',
    padding: 20,
    paddingTop: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 50,
    height: 50,
    marginRight: 10,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 75,
    marginTop: 10,
    lineHeight: 75,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  headerTitleChe: {
    color: '#002147',
    fontFamily: 'THEDISPLAYFONT',
  },
  headerTitleQr: {
    color: '#FFD700',
    fontFamily: 'THEDISPLAYFONT',
  },
  welcomeText: {
    fontSize: 18,
    color: '#002147',
    opacity: 0.9,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 8,
    marginLeft: 10,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loader: {
    marginTop: 20,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  courseCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  courseImageContainer: {
    height: 80,
    position: 'relative',
  },
  courseImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
  },
  courseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 33, 71, 0.7)',
    justifyContent: 'flex-end',
    padding: 12,
  },
  courseActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  courseActionButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  courseContent: {
    padding: 12,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  courseTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  courseCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#002147',
    marginBottom: 2,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a73e8',
    lineHeight: 20,
  },
  studentCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  studentCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  schedulesContainer: {
    gap: 8,
  },
  scheduleCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 10,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  scheduleDays: {
    fontSize: 14,
    fontWeight: '600',
    color: '#002147',
  },
  scheduleTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxWidth: 400,
  },
  confirmModal: {
    width: '90%',
    maxWidth: 400,
    padding: 24,
  },
  confirmHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#002147',
    marginTop: 8,
  },
  confirmText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelConfirmButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  logoutConfirmButton: {
    backgroundColor: '#002147',
  },
  cancelConfirmText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  qrContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrInfo: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  modalTitleContainer: {
    flex: 1,
  },
  courseSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  fullScreenButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },
  clearSearchButton: {
    padding: 4,
  },
  sessionTabs: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  sessionTab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
  },
  selectedSessionTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#002147',
  },
  sessionTabText: {
    fontSize: 14,
    color: '#666',
  },
  selectedSessionTabText: {
    color: '#002147',
    fontWeight: '600',
  },
  attendanceList: {
    flex: 1,
    padding: 16,
  },
  noAttendanceText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  attendanceSession: {
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sessionDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#002147',
  },
  sessionTime: {
    fontSize: 14,
    color: '#666',
  },
  studentsList: {
    marginTop: 5,
  },
  studentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#002147',
  },
  studentId: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  scanTime: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  fullScreenModal: {
    backgroundColor: '#fff',
  },
  fullScreenContent: {
    width: '100%',
    height: '100%',
    maxWidth: '100%',
    borderRadius: 0,
    padding: 0,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#002147',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#002147',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmGenerateButton: {
    backgroundColor: '#002147',
  },
  confirmGenerateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshButton: {
    padding: 8,
  },
}); 