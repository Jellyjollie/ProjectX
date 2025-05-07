import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Modal, BackHandler } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Course, getCourses } from '../lib/api';
import QRCode from 'react-native-qrcode-svg';

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

  useEffect(() => {
    if (currentUserId) {
      fetchAssignedCourses();
    }
  }, [currentUserId]);

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
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={32} color="#002147" />
          </TouchableOpacity>
        </View>
        <Text style={styles.welcomeText}>Lecturer Dashboard</Text>
      </View>

      <ScrollView style={styles.content}>
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
  const [qrData, setQRData] = useState<{ data: string; expiresAt: string } | null>(null);

  const generateQRData = () => {
    const now = new Date();
    const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // Convert to PH time (UTC+8)
    const expiryTime = new Date(phTime.getTime() + (60 * 60 * 1000)); // 1 hour from now
    
    return {
      data: JSON.stringify({
        courseId: course._id,
        courseCode: course.courseCode,
        courseName: course.courseName,
        generatedAt: phTime.toISOString(),
        expiresAt: expiryTime.toISOString()
      }),
      expiresAt: expiryTime.toISOString()
    };
  };

  const handleGenerateQR = () => {
    const now = new Date();
    const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // Current PH time

    // If no QR data exists or current QR has expired, generate new one
    if (!qrData || new Date(qrData.expiresAt) <= phTime) {
      const newQRData = generateQRData();
      setQRData(newQRData);
    }
    setShowQRModal(true);
  };

  const getRemainingTime = () => {
    if (!qrData) return '0 minutes';
    
    const now = new Date();
    const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // Current PH time
    const expiryTime = new Date(qrData.expiresAt);
    const diffInMinutes = Math.floor((expiryTime.getTime() - phTime.getTime()) / (1000 * 60));
    
    return diffInMinutes > 0 ? `${diffInMinutes} minutes` : 'expired';
  };

  return (
    <View style={styles.courseCard}>
      <View style={styles.courseImageContainer}>
        <Image
          source={require('../assets/images/c_image.jpg')}
          style={styles.courseImage}
        />
      </View>
      <View style={styles.courseContent}>
        <Text style={styles.courseTitle}>
          {course.courseName} | {course.courseCode}
        </Text>
        
        <View style={styles.courseInfoContainer}>
          <View style={styles.courseInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Students</Text>
              <Text style={styles.infoValue}>
                {course.students?.length || 0} enrolled
              </Text>
            </View>

            {course.schedules.map((schedule, index) => (
              <View key={index}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Day</Text>
                  <Text style={styles.infoValue}>{schedule.days.join(', ')}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Time</Text>
                  <Text style={styles.infoValue}>{schedule.startTime} - {schedule.endTime}</Text>
                </View>
              </View>
            ))}
          </View>
          <TouchableOpacity 
            style={styles.qrButton}
            onPress={handleGenerateQR}
          >
            <Ionicons name="qr-code-outline" size={40} color="#FFD700" />
          </TouchableOpacity>
        </View>
      </View>

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
            <View style={styles.qrContainer}>
              {qrData && (
                <QRCode
                  value={qrData.data}
                  size={200}
                  color="#002147"
                  backgroundColor="white"
                />
              )}
            </View>
            <Text style={styles.qrInfo}>
              This QR code will expire in {getRemainingTime()}
            </Text>
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
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  courseImageContainer: {
    height: 80,
    overflow: 'hidden',
  },
  courseImage: {
    width: '100%',
    height: '280%',
    position: 'absolute',
    top: 0,
    opacity: 0.5
  },
  courseContent: {
    padding: 20,
    backgroundColor: '#fff',
  },
  courseTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a73e8',
  },
  courseInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  courseInfo: {
    flex: 1,
    marginRight: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  infoLabel: {
    width: 80,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  infoValue: {
    flex: 1,
    fontSize: 16,
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
  qrButton: {
    width: 60,
    height: 60,
    backgroundColor: '#002147',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginTop: -10,
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
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#002147',
  },
}); 