import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, ActivityIndicator, Image } from 'react-native';
import { router } from 'expo-router';
import { authenticateUser, resetPassword } from '../lib/api';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function LoginScreen() {
  const [fontsLoaded] = useFonts({
    'THEDISPLAYFONT': require('../assets/fonts/THEDISPLAYFONT-DEMOVERSION.ttf'),
  });

  React.useEffect(() => {
    console.log('Font loading status:', fontsLoaded);
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [modalType, setModalType] = useState<'success' | 'error'>('success');
  const [userData, setUserData] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const isNavigating = useRef(false);

  // Forgot password states
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const showNotification = (title: string, message: string, type: 'success' | 'error', data?: any) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setUserData(data);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    if (modalType === 'success' && userData) {
      switch (userData.role) {
        case 'admin':
          router.push('/admin-dashboard');
          break;
        case 'lecturer':
          router.push(`/lecturer-dashboard?id=${userData._id}`);
          break;
        case 'student':
          router.push(`/student-dashboard?id=${userData._id}`);
          break;
      }
    }
  };

  const handleLogin = async () => {
    if (isLoading || isNavigating.current) return;
    
    try {
      setIsLoading(true);
      const response = await authenticateUser(username, password);
      
      if (response.success) {
        setUserData(response.user);
        setModalTitle('Success');
        setModalMessage('Login successful!');
        setModalType('success');
        setShowModal(true);
        isNavigating.current = true;
      } else {
        setModalTitle('Error');
        setModalMessage(response.error || 'Invalid credentials');
        setModalType('error');
        setShowModal(true);
      }
    } catch (error) {
      setModalTitle('Error');
      setModalMessage('An error occurred during login');
      setModalType('error');
      setShowModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setShowForgotPasswordModal(true);
  };

  const handleResetPassword = async () => {
    if (!email || !username) {
      showNotification('Error', 'Please enter both email and username', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotification('Error', 'Passwords do not match', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showNotification('Error', 'Password must be at least 6 characters long', 'error');
      return;
    }

    try {
      setIsResettingPassword(true);
      await resetPassword(email, username, newPassword);
      showNotification('Success', 'Password reset successful!', 'success');
      setShowForgotPasswordModal(false);
      setEmail('');
      setUsername('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      showNotification('Error', error instanceof Error ? error.message : 'Failed to reset password', 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={[styles.logoText, { fontFamily: 'THEDISPLAYFONT' }]}>CHEQR</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#999"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            editable={!isLoading}
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
            disabled={isLoading}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color="#666"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.forgotPasswordButton}
          onPress={handleForgotPassword}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleModalClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[
              styles.modalIconContainer,
              modalType === 'success' ? styles.successIcon : styles.errorIcon
            ]}>
              <Ionicons
                name={modalType === 'success' ? 'checkmark-circle' : 'alert-circle'}
                size={40}
                color="#fff"
              />
            </View>
            <Text style={[
              styles.modalTitle,
              modalType === 'success' ? styles.successTitle : styles.errorTitle
            ]}>
              {modalTitle}
            </Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>
            <TouchableOpacity
              style={[
                styles.modalButton,
                modalType === 'success' ? styles.successButton : styles.errorButton
              ]}
              onPress={handleModalClose}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showForgotPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowForgotPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalMessage}>Enter your email, username, and new password</Text>
            
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isResettingPassword}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#999"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                editable={!isResettingPassword}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="New Password"
                placeholderTextColor="#999"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                editable={!isResettingPassword}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm New Password"
                placeholderTextColor="#999"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                editable={!isResettingPassword}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowForgotPasswordModal(false);
                  setEmail('');
                  setUsername('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                disabled={isResettingPassword}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleResetPassword}
                disabled={isResettingPassword}
              >
                {isResettingPassword ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Reset Password</Text>
                )}
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
  logoContainer: {
    height: '30%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a73e8',
  },
  logoImage: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  formContainer: {
    flex: 1,
    padding: 30,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a73e8',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  inputIcon: {
    marginLeft: 15,
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: 15,
    color: '#333',
  },
  passwordInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 15,
    color: '#333',
  },
  eyeIcon: {
    padding: 15,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#1a73e8',
    fontSize: 14,
  },
  button: {
    height: 50,
    backgroundColor: '#1a73e8',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    elevation: 3,
    shadowColor: '#1a73e8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIcon: {
    backgroundColor: '#34C759',
  },
  errorIcon: {
    backgroundColor: '#FF3B30',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  successTitle: {
    color: '#34C759',
  },
  errorTitle: {
    color: '#FF3B30',
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
    color: '#666',
    lineHeight: 24,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  successButton: {
    backgroundColor: '#34C759',
  },
  errorButton: {
    backgroundColor: '#FF3B30',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    flex: 1,
    marginRight: 10,
  },
  submitButton: {
    backgroundColor: '#1a73e8',
    flex: 1,
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 