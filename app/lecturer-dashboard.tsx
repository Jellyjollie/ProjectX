import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Modal, BackHandler, Alert, TextInput, RefreshControl, Platform, Vibration } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Course, getCourses, logoutUser } from '../lib/api';
import QRCode from 'react-native-qrcode-svg';
import * as MediaLibrary from 'expo-media-library';
import ViewShot from 'react-native-view-shot';
import { API_CONFIG } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Function to get current Philippine time
const getPhilippineTime = () => {
  console.log('[getPhilippineTime] Getting current Philippine time');
  
  const now = new Date();
  console.log(`[getPhilippineTime] Current local time: ${now.toString()}`);
  console.log(`[getPhilippineTime] Current UTC time: ${now.toUTCString()}`);
  
  // Get current UTC time in milliseconds
  const utcTimeMs = now.getTime();
  
  // Convert to Philippine time (UTC+8)
  const phTime = new Date(utcTimeMs + (8 * 60 * 60 * 1000));
  console.log(`[getPhilippineTime] Calculated PH time: ${phTime.toString()}`);
  
  return phTime;
};

// Function to format time in Philippine timezone
const formatPhilippineTime = (timestamp: string) => {
  try {
    console.log(`[formatPhilippineTime] Input timestamp: ${timestamp}`);
    
    // Parse the ISO string timestamp directly
    const date = new Date(timestamp);
    console.log(`[formatPhilippineTime] Parsed date: ${date.toString()}`);
    
    // Extract time directly from the timestamp without adding 8 hours
    // For database timestamps like 2025-05-18T14:21:17.727+00:00
    const match = timestamp.match(/T(\d{2}):(\d{2})/);
    if (match) {
      const hours24 = parseInt(match[1], 10);
      const minutes = match[2];
      
      // Convert to 12-hour format
      const ampm = hours24 >= 12 ? 'PM' : 'AM';
      const hours12 = hours24 % 12 || 12; // Convert 0 to 12
      
      // Return formatted string - display the database time directly
      const result = `${hours12}:${minutes} ${ampm}`;
      console.log(`[formatPhilippineTime] Result: ${result}`);
      return result;
    }
    
    // Fallback if regex fails
    const hours = date.getUTCHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    
    const result = `${hours12}:${minutes} ${ampm}`;
    console.log(`[formatPhilippineTime] Result: ${result}`);
    return result;
  } catch (error) {
    console.error('Error formatting time:', error);
    return timestamp; // Return original timestamp as fallback
  }
};

// Function to format date from database timestamp
const formatPhilippineDate = (timestamp: string) => {
  try {
    console.log(`[formatPhilippineDate] Input timestamp: ${timestamp}`);
    
    // Parse the ISO string timestamp directly
    const date = new Date(timestamp);
    console.log(`[formatPhilippineDate] Parsed date: ${date.toString()}`);
    
    // Extract date directly from the timestamp without timezone adjustment
    const match = timestamp.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // Months are 0-based in JS
      const day = parseInt(match[3], 10);
      
      // Create a Date object with these values to get day of week
      const dateObj = new Date(year, month, day);
      const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dateObj.getDay()];
      
      // Get month name
      const monthName = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][month];
      
      // Return formatted string
      const result = `${dayOfWeek}, ${monthName} ${day}, ${year}`;
      console.log(`[formatPhilippineDate] Result: ${result}`);
      return result;
    }
    
    // Fallback if regex fails
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getUTCDay()];
    const monthName = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][date.getUTCMonth()];
    const day = date.getUTCDate();
    const year = date.getUTCFullYear();
    
    const result = `${dayOfWeek}, ${monthName} ${day}, ${year}`;
    console.log(`[formatPhilippineDate] Result: ${result}`);
    return result;
  } catch (error) {
    console.error('Error formatting date:', error);
    return timestamp; // Return original timestamp as fallback
  }
};

// Function to format date and time for session tabs
const formatSessionTabTime = (timestamp: string) => {
  try {
    console.log(`[formatSessionTabTime] Input timestamp: ${timestamp}`);
    
    // Extract date and time directly from the timestamp without timezone adjustment
    const dateMatch = timestamp.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const timeMatch = timestamp.match(/T(\d{2}):(\d{2})/);
    
    if (dateMatch && timeMatch) {
      // Parse date components
      const year = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10) - 1; // Months are 0-based in JS
      const day = parseInt(dateMatch[3], 10);
      
      // Parse time components
      const hours24 = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2];
      
      // Convert to 12-hour format
      const ampm = hours24 >= 12 ? 'PM' : 'AM';
      const hours12 = hours24 % 12 || 12; // Convert 0 to 12
      
      // Get abbreviated month name
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Return formatted string - display the database time directly
      const result = `${months[month]} ${day}, ${hours12}:${minutes} ${ampm}`;
      console.log(`[formatSessionTabTime] Result: ${result}`);
      return result;
    }
    
    // Fallback if regex fails - use direct UTC methods
    const date = new Date(timestamp);
    console.log(`[formatSessionTabTime] Parsed date: ${date.toString()}`);
    
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const hours = date.getUTCHours();
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    
    // Format time for display
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    
    // Get abbreviated month name
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const result = `${months[month]} ${day}, ${hours12}:${minutes} ${ampm}`;
    console.log(`[formatSessionTabTime] Result: ${result}`);
    return result;
  } catch (error) {
    console.error('Error formatting session tab time:', error);
    return timestamp; // Return original timestamp as fallback
  }
};

// WebSocket connection setup
const setupWebSocket = (courseId: string, onNewScan: () => void) => {
  const wsUrl = API_CONFIG.baseURL.replace('http', 'ws');
  const ws = new WebSocket(`${wsUrl}/attendance/${courseId}`);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'new_scan') {
      onNewScan();
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  return ws;
};

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

  const handleConfirmLogout = async () => {
    try {
      // Get the current user data from AsyncStorage
      const userData = await AsyncStorage.getItem('user');
      
      console.log('Logging out lecturer, stored data:', userData);
      
      if (userData) {
        const user = JSON.parse(userData);
        console.log('Parsed user data:', user);
        
        // For better troubleshooting
        if (user.loginAuditId) {
          console.log('Found loginAuditId:', user.loginAuditId);
          const response = await logoutUser(undefined, user.loginAuditId);
          console.log('Logout response:', response);
        } else if (user._id) {
          console.log('Using user._id for logout:', user._id);
          const response = await logoutUser(user._id);
          console.log('Logout response:', response);
        } else {
          console.log('No user ID available for logout');
        }
      } else {
        console.log('No user data in AsyncStorage');
      }
      
      // Remove user data from storage
      await AsyncStorage.removeItem('user');
      console.log('Cleared user data from AsyncStorage');
      
      // Navigate to login screen
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Still proceed with logout even if logging the logout time fails
      router.replace('/');
    }
  };

  const handleRefresh = () => {
    fetchAssignedCourses();
  };

  const generateQRData = (course: Course) => {
    const phTime = getPhilippineTime();
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
  const [newScans, setNewScans] = useState(0);
  const qrRef = useRef<any>(null);
  const countdownInterval = useRef<NodeJS.Timeout>();
  const wsRef = useRef<WebSocket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const lastCheckTime = useRef<Date>(new Date());

  // Setup WebSocket connection
  useEffect(() => {
    const handleNewScan = async () => {
      try {
        const response = await fetch(`${API_CONFIG.baseURL}/attendance/course/${course._id}`);
        if (!response.ok) return;

        const records = await response.json();
        const phTime = getPhilippineTime();

        // Count scans in the last 5 minutes
        const recentScans = records.reduce((count: number, record: any) => {
          const recordTime = new Date(record.generatedAt);
          const timeDiff = phTime.getTime() - recordTime.getTime();
          if (timeDiff <= 5 * 60 * 1000) { // 5 minutes
            return count + record.scannedBy.length;
          }
          return count;
        }, 0);

        setNewScans(recentScans);
      } catch (error) {
        console.error('Error checking new scans:', error);
      }
    };

    // Initialize WebSocket connection
    wsRef.current = setupWebSocket(course._id, handleNewScan);

    // Cleanup WebSocket connection
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [course._id]);

  // Check for existing valid QR code
  const checkExistingQRCode = async () => {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/attendance/course/${course._id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch attendance records');
      }
      const records = await response.json();

      // Find the most recent valid QR code
      const phTime = getPhilippineTime();
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

  // Check countdown timer
  useEffect(() => {
    if (qrData) {
      // Start countdown timer
      countdownInterval.current = setInterval(() => {
        const phTime = getPhilippineTime();
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

  // Check for new scans
  useEffect(() => {
    const checkNewScans = async () => {
      try {
        const response = await fetch(`${API_CONFIG.baseURL}/attendance/course/${course._id}`);
        if (!response.ok) return;

        const records = await response.json();
        const phTime = getPhilippineTime();

        // Get the most recent record
        const mostRecentRecord = records.sort((a: any, b: any) =>
          new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
        )[0];

        if (mostRecentRecord) {
          const recordTime = new Date(mostRecentRecord.generatedAt);
          const timeDiff = phTime.getTime() - recordTime.getTime();

          // If the record is from the last 5 minutes
          if (timeDiff <= 5 * 60 * 1000) {
            const scanCount = mostRecentRecord.scannedBy.length;
            if (scanCount > newScans) {
              setNewScans(scanCount);
              // Vibrate or play sound to notify
              if (Platform.OS === 'android') {
                Vibration.vibrate(500);
              }
            }
          } else {
            setNewScans(0);
          }
        }

        lastCheckTime.current = new Date();
      } catch (error) {
        console.error('Error checking new scans:', error);
      }
    };

    // Check every 3 seconds
    const interval = setInterval(checkNewScans, 3000);
    return () => clearInterval(interval);
  }, [course._id]);

  // Reset new scans count when viewing attendance
  const handleViewAttendance = async () => {
    setNewScans(0);
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
              <View>
                <Ionicons name="people-outline" size={24} color="#FFD700" />
                {newScans > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationText}>{newScans}</Text>
                  </View>
                )}
              </View>
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
            
            <View style={styles.courseQRInfo}>
              <Text style={styles.qrCourseCode}>{course.courseCode}</Text>
              <Text style={styles.qrCourseName}>{course.courseName}</Text>
            </View>
            
            <ViewShot ref={qrRef} style={styles.qrContainer}>
              {qrData && (
                <>
                  <QRCode
                    value={qrData.data}
                    size={200}
                    color="#002147"
                    backgroundColor="white"
                  />
                  <View style={styles.qrWatermark}>
                    <Text style={styles.qrWatermarkText}>{course.courseCode}</Text>
                  </View>
                </>
              )}
            </ViewShot>
            <Text style={styles.qrInfo}>
              This QR code will expire in {remainingTime} (Philippine time)
            </Text>
            <Text style={styles.qrWarning}>
              Important: This QR code is valid ONLY for {course.courseCode}
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
                      {formatSessionTabTime(record.generatedAt)}
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
                          {formatPhilippineDate(record.generatedAt)}
                        </Text>
                        <Text style={styles.sessionTime}>
                          {formatPhilippineTime(record.generatedAt)}
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
                            <View style={styles.scanTimeContainer}>
                              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" style={styles.checkmarkIcon} />
                              <Text style={styles.scanTime}>
                                {formatPhilippineTime(scan.scannedAt)}
                              </Text>
                            </View>
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
    padding: 32,
    marginTop: 24,
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
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 48,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 12,
    color: '#666',
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#333',
  },
  clearSearchButton: {
    padding: 8,
  },
  sessionTabs: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sessionTab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 20,
  },
  selectedSessionTab: {
    backgroundColor: '#002147',
  },
  sessionTabText: {
    fontSize: 14,
    color: '#666',
  },
  selectedSessionTabText: {
    color: '#fff',
    fontWeight: '600',
  },
  attendanceList: {
    flex: 1,
    padding: 16,
  },
  noAttendanceText: {
    fontSize: 16,
    color: '#666',
    marginTop: 24,
    textAlign: 'center',
  },
  attendanceSession: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 0,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
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
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  studentsList: {
    padding: 16,
  },
  studentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  studentInfo: {
    flex: 1,
    marginRight: 12,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#002147',
    marginBottom: 4,
  },
  studentId: {
    fontSize: 14,
    color: '#666',
  },
  scanTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  checkmarkIcon: {
    marginRight: 2,
  },
  scanTime: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
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
  notificationBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  courseQRInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  qrCourseCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#002147',
  },
  qrCourseName: {
    fontSize: 16,
    color: '#666',
  },
  qrWatermark: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.1,
  },
  qrWatermarkText: {
    fontSize: 24,
    color: '#002147',
    fontWeight: 'bold',
  },
  qrWarning: {
    fontSize: 12,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 10,
    fontWeight: 'bold',
  },
}); 