import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, FlatList, Modal, Platform, Alert, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Course, User, getCourses, getUsers } from '../lib/api';
import { API_CONFIG } from '../config';

SplashScreen.preventAutoHideAsync();

export default function AttendanceReports() {
  const [fontsLoaded, fontError] = useFonts({
    'THEDISPLAYFONT': require('../assets/fonts/THEDISPLAYFONT-DEMOVERSION.ttf'),
  });

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCourseModal, setShowCourseModal] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      const data = await getCourses();
      setCourses(data);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError('Failed to fetch courses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    setShowCourseModal(false);
  };

  const handleOpenCourseModal = () => {
    setShowCourseModal(true);
  };

  const fetchAttendanceData = async (courseId: string) => {
    try {
      // Fetch students enrolled in the course
      const response = await fetch(`${API_CONFIG.baseURL}/courses/${courseId}/students`);
      if (!response.ok) {
        throw new Error('Failed to fetch students');
      }
      
      const students: User[] = await response.json();
      
      // Sort students alphabetically by last name
      const sortedStudents = students.sort((a, b) => {
        const nameA = `${a.lastName}, ${a.firstName}`.toLowerCase();
        const nameB = `${b.lastName}, ${b.firstName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      // Fetch attendance records for the course
      const attendanceResponse = await fetch(`${API_CONFIG.baseURL}/attendance/course/${courseId}`);
      if (!attendanceResponse.ok) {
        throw new Error('Failed to fetch attendance records');
      }
      
      const attendanceRecords = await attendanceResponse.json();
      
      // Sort attendance dates chronologically
      const sortedAttendance = attendanceRecords.sort((a: any, b: any) => 
        new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime()
      );
      
      return {
        students: sortedStudents,
        attendance: sortedAttendance
      };
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      throw error;
    }
  };

  const generateCSV = (courseName: string, students: User[], attendanceRecords: any[]) => {
    // Create the CSV header row with dates - format to keep date and time in one cell
    const dates = attendanceRecords.map(record => {
      // Direct string parsing to avoid any timezone conversion
      const rawDateTime = record.generatedAt; // Should be ISO format: "2023-04-15T06:48:23.456Z"
      let dateTimeStr = '';
      
      try {
        // Parse the ISO string directly to extract components
        const isoRegex = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/;
        const match = isoRegex.exec(rawDateTime);
        
        if (match) {
          const [_, year, monthNum, day, hours24, minutes] = match;
          
          // Convert month number to name
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const month = monthNames[parseInt(monthNum) - 1]; // Month is 1-indexed in ISO
          
          // Convert to 12-hour format
          const hours12 = parseInt(hours24) % 12 || 12;
          const ampm = parseInt(hours24) >= 12 ? 'PM' : 'AM';
          
          // Build the formatted string with original hours (not UTC converted)
          dateTimeStr = `${month} ${parseInt(day)}, ${year} at ${hours12}:${minutes} ${ampm}`;
        } else {
          // Fallback if regex doesn't match
          dateTimeStr = rawDateTime;
        }
      } catch (error) {
        console.error('Error parsing date string:', error);
        dateTimeStr = rawDateTime || 'Unknown Date';
      }
      
      return dateTimeStr;
    });
    
    // Start with header row - use quotes to ensure values stay in one cell
    let csv = `"Course: ${courseName}"\n`;
    
    // Add header row with ID number, student name, and dates
    csv += `"ID Number","Student Name",${dates.map(date => `"${date}"`).join(',')}\n`;
    
    // Add rows for each student
    students.forEach(student => {
      // Add ID number and full name with quotes
      const idNumber = `"${student.idNumber || ''}"`;
      const fullName = `"${student.lastName}, ${student.firstName}"`;
      
      // For each date, check if student was present
      const attendanceStatus = attendanceRecords.map(record => {
        const isPresent = record.scannedBy.some((scan: any) => 
          scan.studentId._id === student._id || scan.studentId === student._id
        );
        return `"${isPresent ? 'Present' : 'Absent'}"`;
      });
      
      csv += `${idNumber},${fullName},${attendanceStatus.join(',')}\n`;
    });
    
    return csv;
  };

  const handleGenerateReport = async () => {
    if (!selectedCourse) {
      Alert.alert('Error', 'Please select a course first');
      return;
    }
    
    try {
      setIsGenerating(true);
      
      const data = await fetchAttendanceData(selectedCourse._id);
      
      if (!data.attendance.length) {
        Alert.alert('No Data', 'No attendance records found for this course');
        setIsGenerating(false);
        return;
      }
      
      const csv = generateCSV(selectedCourse.courseName, data.students, data.attendance);
      
      // Generate a filename with course code and date
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${selectedCourse.courseCode}_Attendance_${timestamp}.csv`;
      
      // Save the CSV file
      const filePath = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(filePath, csv);
      
      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath);
      } else {
        Alert.alert(
          'Sharing not available',
          'Sharing is not available on your device'
        );
      }
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', 'Failed to generate attendance report');
    } finally {
      setIsGenerating(false);
    }
  };

  React.useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={32} color="#002147" />
            </TouchableOpacity>
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
        </View>
        <Text style={styles.welcomeText}>Attendance Reports</Text>
      </View>

      <View style={styles.content}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.reportCardContainer}>
            <View style={styles.reportCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconContainer, styles.reportIconContainer]}>
                  <Ionicons name="document-text" size={28} color="#1a73e8" />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Attendance Report</Text>
                  <Text style={styles.cardDescription}>
                    Generate CSV attendance reports for your courses
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.courseSelector} 
                onPress={handleOpenCourseModal}
              >
                <View style={styles.courseInfo}>
                  <Text style={styles.courseSelectorLabel}>Course</Text>
                  <Text style={styles.courseSelectorText}>
                    {selectedCourse ? selectedCourse.courseName : 'Select a course'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={24} color="#1a73e8" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.generateButton, 
                  (!selectedCourse || isGenerating) && styles.generateButtonDisabled
                ]} 
                onPress={handleGenerateReport}
                disabled={!selectedCourse || isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.generateButtonText}>Generate Report</Text>
                )}
              </TouchableOpacity>

              {isGenerating && (
                <Text style={styles.generatingText}>
                  Processing attendance data...
                </Text>
              )}
            </View>

            <View style={styles.instructionsCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconContainer, styles.instructionsIconContainer]}>
                  <Ionicons name="information-circle" size={32} color="#4CAF50" />
                </View>
                <View style={styles.cardContent}>
                  <Text style={[styles.cardTitle, styles.instructionsTitle]}>How It Works</Text>
                </View>
              </View>
              
              <View style={styles.instructionsContainer}>
                <View style={styles.instructionItem}>
                  <View style={styles.instructionIcon}>
                    <Ionicons name="list-outline" size={24} color="#1a73e8" />
                  </View>
                  <View style={styles.instructionContent}>
                    <Text style={styles.instructionText}>
                      Reports include all students enrolled in the course sorted alphabetically
                    </Text>
                  </View>
                </View>
                <View style={styles.instructionItem}>
                  <View style={styles.instructionIcon}>
                    <Ionicons name="calendar-outline" size={24} color="#1a73e8" />
                  </View>
                  <View style={styles.instructionContent}>
                    <Text style={styles.instructionText}>
                      Attendance dates are sorted chronologically from earliest to latest
                    </Text>
                  </View>
                </View>
                <View style={styles.instructionItem}>
                  <View style={styles.instructionIcon}>
                    <Ionicons name="checkmark-circle-outline" size={24} color="#4CAF50" />
                  </View>
                  <View style={styles.instructionContent}>
                    <Text style={styles.instructionText}>
                      Students who scanned QR codes are marked as "Present", otherwise "Absent"
                    </Text>
                  </View>
                </View>
                <View style={styles.instructionItem}>
                  <View style={styles.instructionIcon}>
                    <Ionicons name="document-outline" size={24} color="#FF9800" />
                  </View>
                  <View style={styles.instructionContent}>
                    <Text style={styles.instructionText}>
                      Reports are generated in CSV format and can be opened in Excel or Google Sheets
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Course Selection Modal */}
      <Modal
        visible={showCourseModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCourseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select a Course</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowCourseModal(false)}
              >
                <Ionicons name="close" size={24} color="#002147" />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1a73e8" />
                <Text style={styles.loadingText}>Loading courses...</Text>
              </View>
            ) : courses.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="book-outline" size={48} color="#ccc" />
                <Text style={styles.emptyStateText}>No courses found</Text>
              </View>
            ) : (
              <FlatList
                data={courses}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.courseList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.courseItem}
                    onPress={() => handleSelectCourse(item)}
                  >
                    <View style={styles.courseItemContent}>
                      <View style={styles.courseIconContainer}>
                        <Ionicons name="book" size={24} color="#1a73e8" />
                      </View>
                      <View style={styles.courseItemInfo}>
                        <Text style={styles.courseItemName}>{item.courseName}</Text>
                        <Text style={styles.courseItemCode}>{item.courseCode}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#1a73e8" />
                  </TouchableOpacity>
                )}
              />
            )}
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
  backButton: {
    marginRight: 10,
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
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  reportCardContainer: {
    gap: 20,
  },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  instructionsCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  reportIconContainer: {
    backgroundColor: 'rgba(26, 115, 232, 0.1)',
  },
  instructionsIconContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  instructionsTitle: {
    color: '#4CAF50',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  courseSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: '#eaeaea',
    borderRadius: 12,
    marginBottom: 24,
    backgroundColor: '#f9f9f9',
  },
  courseInfo: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  courseSelectorLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  courseSelectorText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  generateButton: {
    backgroundColor: '#1a73e8',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#1a73e8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  generateButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  generatingText: {
    textAlign: 'center',
    marginTop: 16,
    color: '#666',
    fontSize: 14,
  },
  instructionsContainer: {
    gap: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  instructionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 115, 232, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  instructionContent: {
    flex: 1,
  },
  instructionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#002147',
    flex: 1,
    textAlign: 'center',
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 33, 71, 0.05)',
  },
  courseList: {
    padding: 16,
  },
  courseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  courseItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  courseIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 115, 232, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  courseItemInfo: {
    flex: 1,
  },
  courseItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  courseItemCode: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
}); 