import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal, BackHandler } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function AdminDashboard() {
  const [fontsLoaded, fontError] = useFonts({
    'THEDISPLAYFONT': require('../assets/fonts/THEDISPLAYFONT-DEMOVERSION.ttf'),
  });

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Handle back button press
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      setShowLogoutConfirm(true);
      return true; // Prevent default back behavior
    });

    return () => backHandler.remove();
  }, []);

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

  const handleManageUsers = () => {
    router.push('/manage-users');
  };

  const handleManageCourses = () => {
    router.push('/manage-courses');
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
        <Text style={styles.welcomeText}>Admin Dashboard</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.cardContainer}>
          <TouchableOpacity 
            style={styles.card}
            onPress={handleManageUsers}
          >
            <View style={styles.cardIconContainer}>
              <Ionicons name="people" size={32} color="#1a73e8" />
            </View>
            <Text style={styles.cardTitle}>Manage Users</Text>
            <Text style={styles.cardDescription}>Add, edit, and remove users</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.card}
            onPress={handleManageCourses}
          >
            <View style={styles.cardIconContainer}>
              <Ionicons name="book" size={32} color="#1a73e8" />
            </View>
            <Text style={styles.cardTitle}>Manage Courses</Text>
            <Text style={styles.cardDescription}>Add, edit, and manage courses</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card}>
            <View style={styles.cardIconContainer}>
              <Ionicons name="settings" size={32} color="#1a73e8" />
            </View>
            <Text style={styles.cardTitle}>Settings</Text>
            <Text style={styles.cardDescription}>Configure system settings</Text>
          </TouchableOpacity>
        </View>
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
  cardContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(26, 115, 232, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a73e8',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
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