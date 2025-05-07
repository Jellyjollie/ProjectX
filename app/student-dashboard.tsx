import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Modal, BackHandler } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Course, getCourses } from '../lib/api';

SplashScreen.preventAutoHideAsync();

export default function StudentDashboard() {
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
    fetchEnrolledCourses();
  }, []);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      setShowLogoutConfirm(true);
      return true; // Prevent default back behavior
    });

    return () => backHandler.remove();
  }, []);

  const fetchEnrolledCourses = async () => {
    try {
      setIsLoading(true);
      const allCourses = await getCourses();
      console.log('Current Student ID:', currentUserId);
      console.log('All Courses:', allCourses);
      
      const enrolledCourses = allCourses.filter((course: Course) => {
        console.log('Course Students:', course.students);
        return course.students && course.students.includes(currentUserId);
      });
      
      console.log('Enrolled Courses:', enrolledCourses);
      setCourses(enrolledCourses);
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
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
        <Text style={styles.welcomeText}>Student Dashboard</Text>
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
            <Text style={styles.emptyStateText}>No enrolled courses found</Text>
          </View>
        ) : (
          courses.map((course) => (
            <View key={course._id} style={styles.courseCard}>
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
                
                <View style={styles.courseInfo}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Instructor</Text>
                    <Text style={styles.infoValue}>
                      {course.lecturerId ? `${course.lecturerId.firstName} ${course.lecturerId.lastName}` : 'Not assigned'}
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
              </View>
            </View>
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
    marginBottom: 12,
  },
  courseInfo: {
    flex: 1,
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
}); 