import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, ActivityIndicator, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { User, getUsers, createUser, updateUser, deleteUser } from '../lib/api';
import { API_CONFIG } from '../config';
import Alert from './components/Alert';

SplashScreen.preventAutoHideAsync();

// Role card component
interface RoleCardProps {
  role: string;
  count: number;
  onPress: () => void;
  iconName: keyof typeof Ionicons.glyphMap;
}

const RoleCard: React.FC<RoleCardProps> = ({ role, count, onPress, iconName }) => (
  <TouchableOpacity style={styles.roleCard} onPress={onPress}>
    <View style={styles.roleCardContent}>
      <View style={styles.roleIconContainer}>
        <Ionicons name={iconName} size={32} color="#1a73e8" />
      </View>
      <Text style={styles.roleTitle}>{role.charAt(0).toUpperCase() + role.slice(1)}s</Text>
      <Text style={styles.roleCount}>{count} {count === 1 ? 'user' : 'users'}</Text>
    </View>
  </TouchableOpacity>
);

// User list modal component
interface UserListModalProps {
  visible: boolean;
  onClose: () => void;
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
  role: string;
}

const UserListModal: React.FC<UserListModalProps> = ({ visible, onClose, users, onEdit, onDelete, role }) => {
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(50);

  // Filter users based on search
  const filteredUsers = users.filter(user =>
    `${user.idNumber} ${user.firstName} ${user.lastName} ${user.email}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  // Get current users for pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

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

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      setIsDeleting(userToDelete._id);
      setError(null);
      await onDelete(userToDelete._id);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Delete error:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete user');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setUserToDelete(null);
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.userListModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{role} Users</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by ID, name, or email..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#666" />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.userStats}>
              <Text style={styles.statsText}>
                Showing {indexOfFirstUser + 1}-{Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length} users
              </Text>
            </View>
            
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <ScrollView style={styles.userList}>
              {currentUsers.map((user, index) => (
                <View key={`${role}-${user._id || `temp-${index}`}`} style={styles.userCard}>
                  <View style={styles.userInfo}>
                    <Text style={styles.userId}>{user.idNumber}</Text>
                    <Text style={styles.userName}>{user.lastName}, {user.firstName}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                  </View>
                  <View style={styles.userActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => onEdit(user)}
                    >
                      <Ionicons name="pencil" size={20} color="#4CAF50" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, isDeleting === user._id && styles.disabledButton]}
                      onPress={() => handleDeleteClick(user)}
                      disabled={isDeleting === user._id}
                    >
                      {isDeleting === user._id ? (
                        <ActivityIndicator size="small" color="#F44336" />
                      ) : (
                        <Ionicons name="trash" size={20} color="#F44336" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
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
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={handleDeleteCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.confirmModalTitle}>Confirm Delete</Text>
            <Text style={styles.confirmModalText}>
              Are you sure you want to delete {userToDelete?.firstName} {userToDelete?.lastName}?
            </Text>
            <Text style={styles.confirmModalWarning}>
              This action cannot be undone.
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.cancelButton]}
                onPress={handleDeleteCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.deleteButton]}
                onPress={handleDeleteConfirm}
                disabled={isDeleting === userToDelete?._id}
              >
                {isDeleting === userToDelete?._id ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.deleteButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default function ManageUsers() {
  const [fontsLoaded] = useFonts({
    'THEDISPLAYFONT': require('../assets/fonts/THEDISPLAYFONT-DEMOVERSION.ttf'),
  });

  React.useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showUserListModal, setShowUserListModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    idNumber: '',
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    role: 'student',
  });
  const [alert, setAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'error' | 'warning' | 'success';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'error'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = () => {
    setSelectedUser(null);
    setError(null);
    setFormData({
      idNumber: '',
      firstName: '',
      lastName: '',
      email: '',
      username: '',
      role: 'student',
    });
    setShowModal(true);
  };

  const handleEditUser = async (user: User) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Set up the form data with the user's current information
      setFormData({
        idNumber: user.idNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        role: user.role,
      });
      
      // Set the selected user and show the modal
      setSelectedUser(user);
      setShowModal(true);
    } catch (error) {
      console.error('Error preparing user edit:', error);
      setError(error instanceof Error ? error.message : 'Failed to prepare user edit');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await deleteUser(userId);
      setUsers(users.filter(user => user._id !== userId));
      setShowUserListModal(false);
    } catch (error) {
      console.error('Error deleting user:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Debug log to check form data
      console.log('Form Data:', formData);

      // Validate required fields
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.username || !formData.role) {
        console.log('Validation failed:', {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          username: formData.username,
          role: formData.role
        });
        setAlert({
          visible: true,
          title: 'Missing Information',
          message: 'Please fill in all required fields',
          type: 'warning'
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setAlert({
          visible: true,
          title: 'Invalid Email',
          message: 'Please enter a valid email address',
          type: 'warning'
        });
        return;
      }

      // Check if email already exists
      const existingUser = users.find(user => 
        user.email.toLowerCase() === formData.email.toLowerCase() && 
        user._id !== selectedUser?._id
      );
      if (existingUser) {
        setAlert({
          visible: true,
          title: 'Email Exists',
          message: 'This email address is already registered',
          type: 'error'
        });
        return;
      }

      // Check if username already exists
      const existingUsername = users.find(user => 
        user.username.toLowerCase() === formData.username.toLowerCase() && 
        user._id !== selectedUser?._id
      );
      if (existingUsername) {
        setAlert({
          visible: true,
          title: 'Username Exists',
          message: 'This username is already taken',
          type: 'error'
        });
        return;
      }

      // Generate a random password
      const generatedPassword = Math.random().toString(36).slice(-8);

      if (selectedUser) {
        // Update existing user
        const updatedUser = await updateUser(selectedUser._id, {
          idNumber: formData.idNumber,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          username: formData.username,
          role: formData.role,
        });
        
        setUsers(users.map(u => u._id === updatedUser._id ? updatedUser : u));
        setAlert({
          visible: true,
          title: 'Success',
          message: 'User updated successfully',
          type: 'success'
        });
      } else {
        // Create new user with generated password
        const newUser = await createUser({
          ...formData,
          password: generatedPassword,
        });
        setUsers([...users, newUser]);

        // Send email with credentials
        try {
          await fetch(`${API_CONFIG.baseURL}/auth/send-credentials`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: formData.email,
              username: formData.username,
              password: generatedPassword,
              role: formData.role,
              firstName: formData.firstName,
            }),
          });
        } catch (emailError) {
          console.error('Error sending credentials email:', emailError);
          // Don't fail the user creation if email fails
        }

        setAlert({
          visible: true,
          title: 'Success',
          message: 'User created successfully',
          type: 'success'
        });
      }

      // Refresh the user list
      await fetchUsers();

      // Reset form and close modal
      setShowModal(false);
      setSelectedUser(null);
      setFormData({
        idNumber: '',
        firstName: '',
        lastName: '',
        email: '',
        username: '',
        role: 'student',
      });
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setAlert({
        visible: true,
        title: 'Error',
        message: error instanceof Error ? error.message : 'An error occurred',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleRoleCardPress = (role: string) => {
    setSelectedRole(role);
    setShowUserListModal(true);
  };

  const getUsersByRole = (role: string) => {
    return users.filter(user => user.role === role);
  };

  if (!fontsLoaded) {
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
        <Text style={styles.welcomeText}>Manage Users</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={styles.addButton} onPress={handleAddUser}>
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Add User</Text>
        </TouchableOpacity>

        <ScrollView style={styles.roleCardsContainer}>
          <View style={styles.roleCardsRow}>
            <RoleCard
              role="admin"
              count={getUsersByRole('admin').length}
              onPress={() => handleRoleCardPress('admin')}
              iconName="shield-checkmark"
            />
            <RoleCard
              role="lecturer"
              count={getUsersByRole('lecturer').length}
              onPress={() => handleRoleCardPress('lecturer')}
              iconName="school"
            />
          </View>
          <View style={styles.roleCardsRow}>
            <RoleCard
              role="student"
              count={getUsersByRole('student').length}
              onPress={() => handleRoleCardPress('student')}
              iconName="people"
            />
          </View>
        </ScrollView>
      </View>

      <UserListModal
        visible={showUserListModal}
        onClose={() => setShowUserListModal(false)}
        users={selectedRole ? getUsersByRole(selectedRole) : []}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
        role={selectedRole || ''}
      />

      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <ScrollView 
              style={styles.modalScrollContent}
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalTitle}>
                {selectedUser ? 'Edit User' : 'Add New User'}
              </Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>ID Number</Text>
                <TextInput
                  style={styles.input}
                  value={formData.idNumber}
                  onChangeText={(text) => setFormData({ ...formData, idNumber: text })}
                  placeholder="Enter ID number"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>First Name</Text>
                <TextInput
                  style={styles.input}
                  value={formData.firstName}
                  onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                  placeholder="Enter first name"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  value={formData.lastName}
                  onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                  placeholder="Enter last name"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  placeholder="Enter email"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                  style={styles.input}
                  value={formData.username}
                  onChangeText={(text) => setFormData({ ...formData, username: text })}
                  placeholder="Enter username"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Role</Text>
                <View style={styles.roleContainer}>
                  {['student', 'lecturer', 'admin'].map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleButton,
                        formData.role === role && styles.roleButtonSelected,
                      ]}
                      onPress={() => setFormData({ ...formData, role })}
                    >
                      <Text
                        style={[
                          styles.roleButtonText,
                          formData.role === role && styles.roleButtonTextSelected,
                        ]}
                      >
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

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
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Alert Modal */}
      <Alert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ ...alert, visible: false })}
      />
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
  roleCardsContainer: {
    flex: 1,
  },
  roleCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  roleCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  roleCardContent: {
    alignItems: 'center',
  },
  roleIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a73e8',
    marginBottom: 5,
  },
  roleCount: {
    fontSize: 14,
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
    maxHeight: '90%',
    position: 'absolute',
    top: '5%',
    left: '5%',
    right: '5%',
    bottom: 'auto',
  },
  modalScrollContent: {
    flexGrow: 1,
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
    color: '#1a73e8',
  },
  closeButton: {
    padding: 5,
  },
  userList: {
    maxHeight: '80%',
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a73e8',
    marginBottom: 4,
  },
  userDetails: {
    fontSize: 14,
    color: '#666',
  },
  userActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 10,
    borderRadius: 8,
  },
  editButton: {
    backgroundColor: '#1a73e8',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
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
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  roleButtonSelected: {
    backgroundColor: '#1a73e8',
  },
  roleButtonText: {
    color: '#666',
    fontSize: 14,
  },
  roleButtonTextSelected: {
    color: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    position: 'relative',
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
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  userId: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  userListModalContent: {
    height: '90%', // Set modal height to 90% of screen height
    maxHeight: '90%',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
  },
  userStats: {
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  statsText: {
    fontSize: 14,
    color: '#666',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 5,
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
  confirmModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 16,
  },
  confirmModalText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmModalWarning: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  confirmModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    marginRight: 10,
  },
}); 