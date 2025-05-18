import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal, BackHandler, Animated, TextInput, KeyboardAvoidingView, Platform, PanResponder, Dimensions, ActivityIndicator, Keyboard } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { User, getUsers, deleteUser, createUser, logoutUser, updateUser } from '../lib/api';
import { UserListModal } from './components/UserListModal';
import { API_CONFIG } from '../config';
import Alert from './components/Alert';
import AsyncStorage from '@react-native-async-storage/async-storage';

SplashScreen.preventAutoHideAsync();

// Role options (used for typechecking)
type UserRole = 'admin' | 'lecturer' | 'student';

// User form data interface
interface UserFormData {
  idNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  roles: UserRole[];
}

// Add at the top with other constants
const SCREEN_HEIGHT = Dimensions.get('window').height;
const DRAG_THRESHOLD = 50;

// Role card component for Manage Users
interface RoleCardProps {
  role: string;
  count: number;
  onPress: () => void;
  iconName: keyof typeof Ionicons.glyphMap;
}

const RoleCard: React.FC<RoleCardProps> = ({ role, count, onPress, iconName }) => (
  <TouchableOpacity 
    style={styles.roleCard} 
    onPress={onPress}
    activeOpacity={0.9}
  >
    <View style={styles.roleCardContent}>
      <View style={[styles.roleIconContainer, role === 'admin' ? styles.adminIconContainer : role === 'lecturer' ? styles.lecturerIconContainer : styles.studentIconContainer]}>
        <Ionicons name={iconName} size={28} color="#1a73e8" />
      </View>
      <View style={styles.roleInfo}>
        <Text style={styles.roleTitle}>{role.charAt(0).toUpperCase() + role.slice(1)}s</Text>
        <Text style={styles.roleCount}>{count} {count === 1 ? 'user' : 'users'}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#1a73e8" style={styles.roleArrow} />
    </View>
  </TouchableOpacity>
);



export default function AdminDashboard() {
  const [fontsLoaded, fontError] = useFonts({
    'THEDISPLAYFONT': require('../assets/fonts/THEDISPLAYFONT-DEMOVERSION.ttf'),
  });

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [cardScale] = useState(new Animated.Value(1));
  const [users, setUsers] = useState<User[]>([]);
  const [showUserListModal, setShowUserListModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [translateY] = useState(new Animated.Value(Dimensions.get('window').height));
  const [showRoleCards, setShowRoleCards] = useState(true);
  const screenHeight = Dimensions.get('window').height;
  const [formData, setFormData] = useState<UserFormData>({
    idNumber: '',
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    roles: ['student'],
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
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      setShowLogoutConfirm(true);
      return true;
    });

    return () => backHandler.remove();
  }, []);

  React.useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  const handleUserLogout = async () => {
    try {
      // Get the current user data from AsyncStorage
      const userData = await AsyncStorage.getItem('user');
      
      console.log('Logging out user, stored data:', userData);
      
      if (!userData) {
        console.log('No user data in AsyncStorage');
        router.replace('/');
        return;
      }
      
      try {
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
      } catch (parseError) {
        console.error('Error parsing user data:', parseError);
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

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    handleUserLogout(); // Call our updated logout function
  };

  const handleManageCourses = () => {
    router.push('/manage-courses');
  };

  const handleGenerateReports = () => {
    router.push('/attendance-reports');
  };

  const handlePressIn = () => {
    Animated.spring(cardScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(cardScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setFormData({
      idNumber: '',
      firstName: '',
      lastName: '',
      email: '',
      username: '',
      roles: ['student' as UserRole],
    });
    openDrawer();
  };

  const openDrawer = () => {
    setIsDrawerOpen(true);
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  };

  const closeDrawer = () => {
    Keyboard.dismiss();
    Animated.timing(translateY, {
      toValue: screenHeight,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsDrawerOpen(false);
      setEditingUser(null);
      setFormData({
        idNumber: '',
        firstName: '',
        lastName: '',
        email: '',
        username: '',
        roles: ['student' as UserRole],
      });
    });
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dy) > 5;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        translateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > DRAG_THRESHOLD) {
        closeDrawer();
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
        }).start();
      }
    },
  });

  const handleSubmit = async () => {
    try {
      setIsLoading(true);

      // Validate required fields
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.username || formData.roles.length === 0) {
        setAlert({
          visible: true,
          title: 'Missing Information',
          message: 'Please fill in all required fields and select at least one role',
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

      // Check if email already exists (for new users, or if email was changed)
      if (!editingUser || editingUser.email.toLowerCase() !== formData.email.toLowerCase()) {
        const existingUser = users.find(user => 
          user.email.toLowerCase() === formData.email.toLowerCase() &&
          user._id !== (editingUser?._id || '')
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
      }

      // Generate a random password for new users
      const generatedPassword = Math.random().toString(36).slice(-8);

      // Prepare data - include both role and roles for API compatibility
      const userData = {
        ...formData,
        role: formData.roles[0], // Primary role for backward compatibility
      };

      if (editingUser) {
        // Update existing user
        console.log('Updating user with roles:', formData.roles);
        const updatedUser = await updateUser(editingUser._id, userData);
        
        setUsers(prevUsers => prevUsers.map(u => 
          u._id === updatedUser._id ? updatedUser : u
        ));
        
        setAlert({
          visible: true,
          title: 'Success',
          message: 'User updated successfully',
          type: 'success'
        });
      } else {
        // Create new user with password
        console.log('Creating new user with roles:', formData.roles);
        const newUser = await createUser({
          ...userData,
          password: generatedPassword,
        });
        
        setUsers(prevUsers => [...prevUsers, newUser]);

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
              role: formData.roles[0], // Primary role
              roles: formData.roles,   // All roles
              firstName: formData.firstName,
            }),
          });
        } catch (emailError) {
          console.error('Error sending credentials email:', emailError);
        }

        setAlert({
          visible: true,
          title: 'Success',
          message: 'User created successfully',
          type: 'success'
        });
      }

      // Reset form and close drawer
      closeDrawer();
      fetchUsers();
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

  const handleRoleCardPress = (role: string) => {
    setSelectedRole(role);
    setShowUserListModal(true);
  };

  const getUsersByRole = (role: string) => {
    return users.filter(user => {
      // Check if user has the given role in the roles array
      if (Array.isArray(user.roles) && user.roles.length > 0) {
        return user.roles.includes(role as UserRole);
      } 
      // Backward compatibility with existing single role structure
      return user.role === role;
    });
  };

  // Helper to check if a user has multiple roles
  const hasMultipleRoles = (user: User) => {
    if (Array.isArray(user.roles)) {
      return user.roles.length > 1;
    }
    return false;
  };

  // Component to display role badges
  const RoleBadges: React.FC<{ user: User }> = ({ user }) => {
    const roles = Array.isArray(user.roles) ? user.roles : [user.role];
    
    return (
      <View style={styles.roleBadgesContainer}>
        {roles.map((role, index) => (
          <View 
            key={index} 
            style={[
              styles.roleBadge, 
              role === 'admin' ? styles.adminBadge : 
              role === 'lecturer' ? styles.lecturerBadge : 
              styles.studentBadge
            ]}
          >
            <Text style={styles.roleBadgeText}>{role.charAt(0).toUpperCase() + role.slice(1)}</Text>
          </View>
        ))}
      </View>
    );
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUser(userId);
      setUsers(users.filter(user => user._id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const toggleRoleCards = () => {
    setShowRoleCards(!showRoleCards);
  };

  const renderDrawer = () => (
    <Animated.View
      style={[
        styles.drawer,
        {
          transform: [{ translateY }]
        },
      ]}
    >
      <View style={styles.drawerHeader} {...panResponder.panHandlers}>
        <View style={styles.drawerHandle} />
        <Text style={styles.drawerTitle}>
          {editingUser ? `Edit: ${editingUser.firstName} ${editingUser.lastName}` : 'Add New User'}
        </Text>
        <TouchableOpacity onPress={closeDrawer} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView 
          style={styles.drawerContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Personal Information Section */}
          <View style={styles.formSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-circle-outline" size={24} color="#1a73e8" />
              <Text style={styles.sectionTitle}>Personal Information</Text>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>ID Number</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="card-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.idNumber}
                  onChangeText={(text) => setFormData({ ...formData, idNumber: text })}
                  placeholder="Enter ID number"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.nameContainer}>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <Text style={styles.inputLabel}>First Name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.firstName}
                    onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                    placeholder="Enter first name"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={[styles.inputContainer, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.lastName}
                    onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                    placeholder="Enter last name"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Account Information Section */}
          <View style={styles.formSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="lock-closed-outline" size={24} color="#1a73e8" />
              <Text style={styles.sectionTitle}>Account Information</Text>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  placeholder="Enter email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Username</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="at-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.username}
                  onChangeText={(text) => setFormData({ ...formData, username: text })}
                  placeholder="Enter username"
                  autoCapitalize="none"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>

          {/* Role Selection Section */}
          <View style={styles.formSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-outline" size={24} color="#1a73e8" />
              <Text style={styles.sectionTitle}>Role</Text>
            </View>
            
            <View style={styles.roleContainer}>
              {(['student', 'lecturer', 'admin'] as UserRole[]).map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleButton,
                    formData.roles.includes(role) && styles.roleButtonSelected,
                  ]}
                  onPress={() => {
                    if (formData.roles.includes(role)) {
                      setFormData({
                        ...formData,
                        roles: formData.roles.filter((r) => r !== role),
                      });
                    } else {
                      setFormData({
                        ...formData,
                        roles: [...formData.roles, role],
                      });
                    }
                  }}
                >
                  <View style={[
                    styles.drawerRoleIconContainer,
                    formData.roles.includes(role) && styles.drawerRoleIconContainerSelected
                  ]}>
                    <Ionicons
                      name={
                        role === 'admin' ? 'shield-checkmark' :
                        role === 'lecturer' ? 'school' : 'people'
                      }
                      size={24}
                      color={formData.roles.includes(role) ? '#fff' : '#666'}
                    />
                  </View>
                  <Text
                    style={[
                      styles.roleButtonText,
                      formData.roles.includes(role) && styles.roleButtonTextSelected,
                    ]}
                  >
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.drawerButtons}>
          <TouchableOpacity
            style={[styles.drawerButton, styles.cancelButton]}
            onPress={closeDrawer}
          >
            <Ionicons name="close-circle-outline" size={20} color="#666" style={styles.buttonIcon} />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.drawerButton, styles.saveButton]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.saveButtonText}>Create User</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );

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
        <Text style={styles.welcomeText}>Admin Dashboard</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        bounces={true}
        overScrollMode="never"
      >
        <View style={styles.cardContainer}>
          {/* Manage Users Card */}
          <Animated.View style={[{ transform: [{ scale: cardScale }] }, styles.cardWrapper]}>
            <View style={styles.card}>
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconContainer, styles.usersIconContainer]}>
                  <Ionicons name="people" size={32} color="#1a73e8" />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Manage Users</Text>
                  <Text style={styles.cardDescription}>Add, edit, and manage system users</Text>
                </View>
              </View>
              
              {/* Add User Button */}
              <TouchableOpacity 
                style={styles.addUserButton}
                onPress={handleAddUser}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.addUserButtonText}>Add New User</Text>
              </TouchableOpacity>

              {/* Toggle Button */}
              <TouchableOpacity 
                style={styles.toggleButton}
                onPress={toggleRoleCards}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name={showRoleCards ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#1a73e8" 
                />
                <Text style={styles.toggleButtonText}>
                  {showRoleCards ? "Hide Role Cards" : "Show Role Cards"}
                </Text>
              </TouchableOpacity>

              {/* Role Cards */}
              {showRoleCards && (
                <View style={styles.roleCardsContainer}>
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
                  <RoleCard
                    role="student"
                    count={getUsersByRole('student').length}
                    onPress={() => handleRoleCardPress('student')}
                    iconName="people"
                  />
                </View>
              )}
            </View>
          </Animated.View>

          {/* Manage Courses Card */}
          <Animated.View style={[{ transform: [{ scale: cardScale }] }, styles.cardWrapper]}>
            <TouchableOpacity 
              style={styles.card}
              onPress={handleManageCourses}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              activeOpacity={0.9}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconContainer, styles.coursesIconContainer]}>
                  <Ionicons name="book" size={32} color="#1a73e8" />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Manage Courses</Text>
                  <Text style={styles.cardDescription}>Add, edit, and organize academic courses</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#1a73e8" style={styles.cardArrow} />
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Reports Card */}
          <Animated.View style={[{ transform: [{ scale: cardScale }] }, styles.cardWrapper]}>
            <TouchableOpacity 
              style={styles.card}
              onPress={handleGenerateReports}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              activeOpacity={0.9}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconContainer, styles.reportsIconContainer]}>
                  <Ionicons name="analytics" size={32} color="#1a73e8" />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Attendance Reports</Text>
                  <Text style={styles.cardDescription}>Generate and export attendance reports</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#1a73e8" style={styles.cardArrow} />
              </View>
            </TouchableOpacity>
          </Animated.View>

        </View>
      </ScrollView>

      {/* User List Modal */}
      {showUserListModal && selectedRole && (
        <UserListModal
          visible={showUserListModal}
          onClose={() => setShowUserListModal(false)}
          users={getUsersByRole(selectedRole)}
          onEdit={(user) => {
            // Close the user list modal
            setShowUserListModal(false);
            
            // Set the user we're editing
            setEditingUser(user);
            
            // Set form data from the user to edit
            setFormData({
              idNumber: user.idNumber,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              username: user.username,
              roles: Array.isArray(user.roles) 
                ? user.roles 
                : [user.role as UserRole],
            });
            
            // Open the drawer for editing
            openDrawer();
          }}
          onDelete={async (userId) => {
            await handleDeleteUser(userId);
            fetchUsers();
          }}
          role={selectedRole}
          onRefresh={fetchUsers}
        />
      )}

      {isDrawerOpen && (
        <View style={styles.drawerOverlay}>
          <TouchableOpacity
            style={styles.drawerBackdrop}
            activeOpacity={1}
            onPress={closeDrawer}
          />
          {renderDrawer()}
        </View>
      )}

      <Alert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ ...alert, visible: false })}
      />

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.confirmHeader}>
              <Ionicons name="log-out-outline" size={48} color="#002147" />
              <Text style={styles.confirmTitle}>Confirm Logout</Text>
            </View>
            
            <Text style={styles.confirmText}>
              Are you sure you want to logout from the admin dashboard?
            </Text>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={() => setShowLogoutConfirm(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.logoutConfirmButton]}
                onPress={handleConfirmLogout}
              >
                <Text style={styles.logoutButtonText}>Logout</Text>
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
    padding: 24,
    paddingTop: 40,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 54,
    height: 54,
    marginRight: 12,
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
    fontSize: 28,
    color: '#002147',
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 12,
    backgroundColor: 'rgba(0, 33, 71, 0.05)',
    borderRadius: 12,
  },
  logoutConfirmButton: {
    backgroundColor: '#002147',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 32,
  },
  cardContainer: {
    gap: 24,
  },
  cardWrapper: {
    borderRadius: 24,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  card: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(26, 115, 232, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  usersIconContainer: {
    backgroundColor: 'rgba(26, 115, 232, 0.1)',
  },
  coursesIconContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  reportsIconContainer: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a73e8',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  cardArrow: {
    marginLeft: 16,
    opacity: 0.7,
  },
  addUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a73e8',
    padding: 16,
    borderRadius: 16,
    marginTop: 24,
    marginBottom: 24,
    shadowColor: '#1a73e8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addUserButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  roleCardsContainer: {
    gap: 16,
    marginTop: 16,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 115, 232, 0.05)',
  },
  toggleButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#1a73e8',
  },
  roleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(26, 115, 232, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  roleCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  adminIconContainer: {
    backgroundColor: 'rgba(26, 115, 232, 0.1)',
  },
  lecturerIconContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  studentIconContainer: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a73e8',
    marginBottom: 4,
  },
  roleCount: {
    fontSize: 14,
    color: '#666',
  },
  roleArrow: {
    opacity: 0.6,
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
    padding: 28,
    width: '90%',
    maxWidth: 400,
  },
  confirmHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#002147',
    marginTop: 16,
  },
  confirmText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  confirmButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  drawerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '90%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  drawerHandle: {
    position: 'absolute',
    top: 8,
    left: '50%',
    width: 40,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    transform: [{ translateX: -20 }],
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a73e8',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 8,
  },
  drawerContent: {
    padding: 24,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a73e8',
    marginLeft: 12,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 0,
  },
  nameContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  roleButtonSelected: {
    backgroundColor: '#1a73e8',
    borderColor: '#1a73e8',
  },
  drawerRoleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  drawerRoleIconContainerSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginTop: 4,
  },
  roleButtonTextSelected: {
    color: '#fff',
  },
  drawerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  drawerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  buttonIcon: {
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#1a73e8',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  roleBadgesContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  roleBadge: {
    padding: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
  },
  adminBadge: {
    backgroundColor: 'rgba(26, 115, 232, 0.1)',
  },
  lecturerBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  studentBadge: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
  },
  otherBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
}); 