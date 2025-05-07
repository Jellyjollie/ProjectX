import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, ActivityIndicator, Image, ImageBackground } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { User, getUsers, createCourse, Course, getCourses, deleteCourse, updateCourse } from '../lib/api';

SplashScreen.preventAutoHideAsync();

interface ScheduleEntry {
  days: string[];
  startTime: string;
  endTime: string;
}

export default function ManageCourses() {
  const [fontsLoaded, fontError] = useFonts({
    'THEDISPLAYFONT': require('../assets/fonts/THEDISPLAYFONT-DEMOVERSION.ttf'),
  });

  React.useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lecturers, setLecturers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    courseCode: '',
    courseName: '',
    description: '',
    lecturerId: '',
    schedules: [] as ScheduleEntry[],
  });
  const [showLecturerModal, setShowLecturerModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newSchedule, setNewSchedule] = useState<ScheduleEntry>({
    days: [],
    startTime: '',
    endTime: '',
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [newCourseId, setNewCourseId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const scrollViewRef = React.useRef<ScrollView>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchLecturers();
    fetchCourses();
  }, []);

  const fetchLecturers = async () => {
    try {
      setIsLoading(true);
      const users = await getUsers();
      const lecturerUsers = users.filter(user => user.role === 'lecturer');
      setLecturers(lecturerUsers);
    } catch (error) {
      console.error('Error fetching lecturers:', error);
      setError('Failed to fetch lecturers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      const coursesData = await getCourses();
      setCourses(coursesData);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError('Failed to fetch courses. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleAddCourse = () => {
    setError(null);
    setFormData({
      courseCode: '',
      courseName: '',
      description: '',
      lecturerId: '',
      schedules: [],
    });
    setShowModal(true);
  };

  const handleEditCourse = (course: Course) => {
    setSelectedCourse(course);
    setFormData({
      courseCode: course.courseCode,
      courseName: course.courseName,
      description: course.description,
      lecturerId: course.lecturerId?._id || '',
      schedules: course.schedules,
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDeletePress = (course: Course) => {
    setCourseToDelete(course);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!courseToDelete) return;

    try {
      setIsDeleting(true);
      await deleteCourse(courseToDelete._id);
      setSuccessMessage('Course deleted successfully!');
      await fetchCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete course');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setCourseToDelete(null);
    }
  };

  const handleSubmit = async () => {
    if (selectedCourse) {
      setShowEditConfirm(true);
    } else {
      await saveCourse();
    }
  };

  const handleConfirmEdit = async () => {
    setShowEditConfirm(false);
    await saveCourse();
  };

  const saveCourse = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // Validate required fields
      if (!formData.courseCode || !formData.courseName || !formData.lecturerId || formData.schedules.length === 0) {
        setError('Course code, name, lecturer, and at least one schedule are required');
        return;
      }

      let updatedCourse;
      if (selectedCourse) {
        // Update existing course
        updatedCourse = await updateCourse(selectedCourse._id, formData);
        setSuccessMessage('Course updated successfully!');
      } else {
        // Create new course
        updatedCourse = await createCourse(formData);
        setSuccessMessage('Course added successfully!');
      }

      // Refresh the course list
      await fetchCourses();

      // Set new course ID for highlighting
      setNewCourseId(updatedCourse._id);

      // Reset form and close modal
      setShowModal(false);
      setSelectedCourse(null);
      setFormData({
        courseCode: '',
        courseName: '',
        description: '',
        lecturerId: '',
        schedules: [],
      });

      // Scroll to the course after a short delay
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error saving course:', error);
      setError(error instanceof Error ? error.message : 'Failed to save course');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSchedule = () => {
    if (newSchedule.days.length === 0 || !newSchedule.startTime || !newSchedule.endTime) {
      setError('Please fill in all schedule details');
      return;
    }
    setFormData({
      ...formData,
      schedules: [...formData.schedules, newSchedule],
    });
    setNewSchedule({
      days: [],
      startTime: '',
      endTime: '',
    });
    setShowScheduleModal(false);
  };

  const handleRemoveSchedule = (index: number) => {
    const updatedSchedules = [...formData.schedules];
    updatedSchedules.splice(index, 1);
    setFormData({
      ...formData,
      schedules: updatedSchedules,
    });
  };

  const handleAssignStudents = (course: Course) => {
    router.push(`/assign-students?courseId=${course._id}`);
  };

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Clear highlight after 2 seconds
  useEffect(() => {
    if (newCourseId) {
      const timer = setTimeout(() => {
        setNewCourseId(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [newCourseId]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
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
        <Text style={styles.welcomeText}>Manage Courses</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={styles.addButton} onPress={handleAddCourse}>
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Add Course</Text>
        </TouchableOpacity>

        {successMessage && (
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={20} color="#4caf50" />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        )}

        <ScrollView 
          ref={scrollViewRef}
          style={styles.courseList}
        >
          {isLoading ? (
            <ActivityIndicator size="large" color="#1a73e8" style={styles.loader} />
          ) : courses.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="book-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>No courses found</Text>
            </View>
          ) : (
            courses.map((course) => (
              <View 
                key={course._id} 
                style={[
                  styles.courseCard,
                  newCourseId === course._id && styles.highlightedCard
                ]}
              >
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

                  <View style={styles.cardActions}>
                    <View style={styles.actionButtonGroup}>
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.editButton]}
                        onPress={() => handleEditCourse(course)}
                      >
                        <Ionicons name="create-outline" size={20} color="#1a73e8" />
                        <Text style={styles.editButtonText}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.actionButton, styles.assignButton]}
                        onPress={() => handleAssignStudents(course)}
                      >
                        <Ionicons name="people-outline" size={20} color="#4caf50" />
                        <Text style={styles.assignButtonText}>Students</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.actionButton, styles.deleteButton, isDeleting && styles.actionButtonDisabled]}
                        onPress={() => handleDeletePress(course)}
                        disabled={isDeleting}
                      >
                        <Ionicons name="trash-outline" size={20} color="#dc3545" />
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowModal(false);
          setSelectedCourse(null);
          setFormData({
            courseCode: '',
            courseName: '',
            description: '',
            lecturerId: '',
            schedules: [],
          });
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedCourse ? 'Edit Course' : 'Add New Course'}
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Course Code</Text>
              <TextInput
                style={styles.input}
                value={formData.courseCode}
                onChangeText={(text) => setFormData({ ...formData, courseCode: text })}
                placeholder="Enter course code"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Course Name</Text>
              <TextInput
                style={styles.input}
                value={formData.courseName}
                onChangeText={(text) => setFormData({ ...formData, courseName: text })}
                placeholder="Enter course name"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Enter course description"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Lecturer</Text>
              <View style={styles.selectContainer}>
                <TouchableOpacity
                  style={styles.select}
                  onPress={() => {
                    setShowLecturerModal(true);
                  }}
                >
                  <Text style={styles.selectText}>
                    {formData.lecturerId
                      ? lecturers.find(l => l._id === formData.lecturerId)?.firstName + ' ' + lecturers.find(l => l._id === formData.lecturerId)?.lastName
                      : 'Select lecturer'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Schedule</Text>
              <View style={styles.scheduleContainer}>
                {formData.schedules.map((schedule, index) => (
                  <View key={index} style={styles.scheduleItem}>
                    <Text style={styles.scheduleText}>
                      {schedule.days.join(', ')} {schedule.startTime}-{schedule.endTime}
                    </Text>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveSchedule(index)}
                    >
                      <Ionicons name="close-circle" size={20} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.addScheduleButton}
                  onPress={() => setShowScheduleModal(true)}
                >
                  <Text style={styles.addScheduleButtonText}>Add Schedule</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSubmit}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showLecturerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLecturerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Lecturer</Text>
              <TouchableOpacity onPress={() => setShowLecturerModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalList}>
              {lecturers.map((lecturer) => (
                <TouchableOpacity
                  key={lecturer._id}
                  style={styles.modalItem}
                  onPress={() => {
                    setFormData({ ...formData, lecturerId: lecturer._id });
                    setShowLecturerModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>
                    {lecturer.firstName} {lecturer.lastName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showScheduleModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowScheduleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Schedule</Text>
              <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Days</Text>
              <View style={styles.daysContainer}>
                {['M', 'T', 'W', 'Th', 'F'].map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayButton,
                      newSchedule.days.includes(day) && styles.selectedDay,
                    ]}
                    onPress={() => {
                      const updatedDays = newSchedule.days.includes(day)
                        ? newSchedule.days.filter(d => d !== day)
                        : [...newSchedule.days, day];
                      setNewSchedule({ ...newSchedule, days: updatedDays });
                    }}
                  >
                    <Text style={[
                      styles.dayButtonText,
                      newSchedule.days.includes(day) && styles.selectedDayText,
                    ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Start Time</Text>
              <TextInput
                style={styles.input}
                value={newSchedule.startTime}
                onChangeText={(text) => setNewSchedule({ ...newSchedule, startTime: text })}
                placeholder="HH:MM AM/PM"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>End Time</Text>
              <TextInput
                style={styles.input}
                value={newSchedule.endTime}
                onChangeText={(text) => setNewSchedule({ ...newSchedule, endTime: text })}
                placeholder="HH:MM AM/PM"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowScheduleModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddSchedule}
              >
                <Text style={styles.saveButtonText}>Add Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.confirmModal]}>
            <View style={styles.confirmHeader}>
              <Ionicons name="warning" size={48} color="#dc3545" />
              <Text style={styles.confirmTitle}>Delete Course</Text>
            </View>
            
            <Text style={styles.confirmText}>
              Are you sure you want to delete{'\n'}
              <Text style={styles.confirmHighlight}>
                {courseToDelete?.courseName} ({courseToDelete?.courseCode})
              </Text>?
              {'\n'}This action cannot be undone.
            </Text>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelConfirmButton]}
                onPress={() => {
                  setShowDeleteConfirm(false);
                  setCourseToDelete(null);
                }}
                disabled={isDeleting}
              >
                <Text style={styles.cancelConfirmText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.deleteConfirmButton]}
                onPress={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.deleteConfirmText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Confirmation Modal */}
      <Modal
        visible={showEditConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.confirmModal]}>
            <View style={styles.confirmHeader}>
              <Ionicons name="warning" size={48} color="#1a73e8" />
              <Text style={styles.confirmTitle}>Confirm Edit</Text>
            </View>
            
            <Text style={styles.confirmText}>
              Are you sure you want to update{'\n'}
              <Text style={styles.confirmHighlight}>
                {selectedCourse?.courseName} ({selectedCourse?.courseCode})
              </Text>?
            </Text>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelConfirmButton]}
                onPress={() => {
                  setShowEditConfirm(false);
                }}
                disabled={isSaving}
              >
                <Text style={styles.cancelConfirmText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.saveConfirmButton]}
                onPress={handleConfirmEdit}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveConfirmText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
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
    padding: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a73e8',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  courseList: {
    flex: 1,
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a73e8',
    flex: 1,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
  },
  saveButton: {
    backgroundColor: '#1a73e8',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  selectContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  selectText: {
    fontSize: 16,
    color: '#333',
  },
  modalList: {
    maxHeight: 300,
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalItemText: {
    fontSize: 16,
    color: '#333',
  },
  scheduleContainer: {
    marginTop: 8,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  scheduleText: {
    fontSize: 14,
    color: '#333',
  },
  removeButton: {
    padding: 4,
  },
  addScheduleButton: {
    backgroundColor: '#1a73e8',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addScheduleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedDay: {
    backgroundColor: '#1a73e8',
    borderColor: '#1a73e8',
  },
  dayButtonText: {
    fontSize: 14,
    color: '#333',
  },
  selectedDayText: {
    color: '#fff',
  },
  loader: {
    marginTop: 20,
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
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: {
    color: '#4caf50',
    fontSize: 16,
    marginLeft: 8,
  },
  highlightedCard: {
    backgroundColor: '#e3f2fd',
    borderColor: '#1a73e8',
    borderWidth: 1,
    transform: [{ scale: 1.02 }],
  },
  cardActions: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButtonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  editButton: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#1a73e8',
  },
  assignButton: {
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  deleteButton: {
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  editButtonText: {
    color: '#1a73e8',
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '600',
  },
  assignButtonText: {
    color: '#4caf50',
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: '#dc3545',
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '600',
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
    color: '#dc3545',
    marginTop: 8,
  },
  confirmText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  confirmHighlight: {
    fontWeight: 'bold',
    color: '#333',
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
  deleteConfirmButton: {
    backgroundColor: '#dc3545',
  },
  cancelConfirmText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveConfirmButton: {
    backgroundColor: '#1a73e8',
  },
  saveConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 