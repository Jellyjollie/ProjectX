import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { User, Course, getUsers, updateCourse, getCourses } from '../lib/api';

export default function AssignStudents() {
  const params = useLocalSearchParams();
  const courseId = params.courseId as string;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage] = useState(50);
  const [filteredStudents, setFilteredStudents] = useState<User[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('enrolled'); // 'enrolled' or 'available'

  useEffect(() => {
    fetchStudents();
    fetchCourse();
  }, []);

  useEffect(() => {
    const filtered = students.filter(student => 
      (student.lastName.toLowerCase() + ', ' + student.firstName.toLowerCase())
        .includes(searchQuery.toLowerCase()) ||
      student.idNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort students alphabetically by last name
    const sortedStudents = filtered.sort((a, b) => {
      const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
      const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });

    setFilteredStudents(sortedStudents);
    setCurrentPage(1);
  }, [searchQuery, students]);

  // Separate assigned and unassigned students
  const assignedStudents = filteredStudents.filter(student => 
    selectedStudents.includes(student._id)
  );

  const unassignedStudents = filteredStudents.filter(student => 
    !selectedStudents.includes(student._id)
  );

  const displayedStudents = activeTab === 'enrolled' ? assignedStudents : unassignedStudents;

  const fetchStudents = async () => {
    try {
      const users = await getUsers();
      const studentUsers = users
        .filter(user => user.role === 'student')
        .sort((a, b) => {
          const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
          const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
          return nameA.localeCompare(nameB);
        });
      setStudents(studentUsers);
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('Failed to fetch students. Please try again.');
    }
  };

  const fetchCourse = async () => {
    try {
      const courses = await getCourses();
      const course = courses.find((c: Course) => c._id === courseId);
      if (course) {
        setCurrentCourse(course);
        setSelectedStudents(course.students || []);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      setError('Failed to fetch course details.');
    }
  };

  const indexOfLastStudent = currentPage * studentsPerPage;
  const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
  const currentStudents = filteredStudents.slice(indexOfFirstStudent, indexOfLastStudent);
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleSaveAssignments = async () => {
    if (!currentCourse) return;

    try {
      setIsLoading(true);
      await updateCourse(currentCourse._id, {
        ...currentCourse,
        students: selectedStudents
      });
      setSuccessMessage('Students assigned successfully!');
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      console.error('Error assigning students:', error);
      setError(error instanceof Error ? error.message : 'Failed to assign students');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1a73e8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assign Students</Text>
        <TouchableOpacity
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          onPress={handleSaveAssignments}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {currentCourse && (
        <Text style={styles.subtitle}>
          {currentCourse.courseName} ({currentCourse.courseCode})
        </Text>
      )}

      {successMessage && (
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={20} color="#4caf50" />
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      )}

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or ID number..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'enrolled' && styles.activeTabButton
          ]}
          onPress={() => setActiveTab('enrolled')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'enrolled' && styles.activeTabText
          ]}>
            Enrolled ({assignedStudents.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'available' && styles.activeTabButton
          ]}
          onPress={() => setActiveTab('available')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'available' && styles.activeTabText
          ]}>
            Students List ({unassignedStudents.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.studentList}>
        {displayedStudents.map((student) => (
          <TouchableOpacity
            key={student._id}
            style={[
              styles.studentItem,
              activeTab === 'enrolled' && styles.selectedStudent
            ]}
            onPress={() => {
              if (activeTab === 'enrolled') {
                setSelectedStudents(prev => prev.filter(id => id !== student._id));
              } else {
                setSelectedStudents(prev => [...prev, student._id]);
              }
            }}
          >
            <View style={styles.studentInfo}>
              <Text style={styles.studentId}>{student.idNumber}</Text>
              <Text style={[
                styles.studentName,
                activeTab === 'enrolled' && styles.selectedStudentText
              ]}>
                {student.lastName}, {student.firstName}
              </Text>
            </View>
            {activeTab === 'enrolled' ? (
              <Ionicons name="remove-circle" size={20} color="#dc3545" />
            ) : (
              <Ionicons name="add-circle" size={20} color="#4caf50" />
            )}
          </TouchableOpacity>
        ))}
        {displayedStudents.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {activeTab === 'enrolled' 
                ? 'No students enrolled in this course yet'
                : 'No available students found'}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.paginationContainer}>
        <TouchableOpacity
          style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
          onPress={handlePrevPage}
          disabled={currentPage === 1}
        >
          <Ionicons name="chevron-back" size={20} color={currentPage === 1 ? "#ccc" : "#666"} />
        </TouchableOpacity>
        <Text style={styles.paginationText}>
          Page {currentPage} of {totalPages}
        </Text>
        <TouchableOpacity
          style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
          onPress={handleNextPage}
          disabled={currentPage === totalPages}
        >
          <Ionicons name="chevron-forward" size={20} color={currentPage === totalPages ? "#ccc" : "#666"} />
        </TouchableOpacity>
      </View>

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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 6,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    margin: 6,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: '#1a73e8',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#1a73e8',
    fontWeight: '600',
  },
  studentList: {
    flex: 1,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginHorizontal: 16,
  },
  selectedStudent: {
    backgroundColor: '#e8f5e9',
  },
  studentInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  studentId: {
    fontSize: 14,
    color: '#666',
    minWidth: 80,
    fontFamily: 'monospace',
  },
  studentName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  selectedStudentText: {
    color: '#4caf50',
    fontWeight: '600',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  paginationButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#666',
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  successText: {
    color: '#4caf50',
    fontSize: 16,
    marginLeft: 8,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
}); 