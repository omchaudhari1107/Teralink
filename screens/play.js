import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
  Animated,
  ScrollView,
  Keyboard,
} from 'react-native';
import Video from 'react-native-video';

const PlayScreen = () => {
  const [inputLink, setInputLink] = useState('');
  const [isLoading, setIsLoading] = useState(false); // General loading (e.g., Get Video)
  const [isVideoLoading, setIsVideoLoading] = useState(false); // Video-specific loading
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const dropdownAnimation = useRef(new Animated.Value(0)).current;

  // Mock quality options (replace with backend data in production)
  const qualityOptions = [
    { quality: '360p', url: 'https://example.com/video_360p.mp4' },
    { quality: '480p', url: 'https://example.com/video_480p.mp4' },
    { quality: '720p', url: 'https://example.com/video_720p.mp4' },
    { quality: '1080p', url: 'https://example.com/video_1080p.mp4' },
  ];

  // Toggle dropdown with animation
  const toggleDropdown = () => {
    if (showDropdown) {
      Animated.timing(dropdownAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setShowDropdown(false));
    } else {
      setShowDropdown(true);
      Animated.timing(dropdownAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  // Handle quality selection
  const handleQualitySelect = (url) => {
    setIsVideoLoading(true);
    setErrorMessage('');
    setSelectedQuality(url);
    setTimeout(() => {
      setIsVideoLoading(false);
    }, 1000); // Simulate video fetch delay
    toggleDropdown();
  };

  // Mock function to simulate link submission
  const handleGetVideo = () => {
    if (!inputLink) {
      alert('Please enter a TeraBox link');
      return;
    }
    Keyboard.dismiss(); // Remove cursor from input
    setIsLoading(true);
    setIsVideoLoading(true);
    setErrorMessage('');
    setTimeout(() => {
      setShowVideo(true);
      setSelectedQuality(qualityOptions[0].url);
      setIsLoading(false);
      setIsVideoLoading(false);
    }, 1000);
  };

  // Mock download toggle
  const handleDownload = () => {
    if (!selectedQuality) {
      setErrorMessage('Please select a quality');
      return;
    }
    setIsDownloading(true);
    setTimeout(() => setIsDownloading(false), 2000);
  };

  // Handle video errors
  const handleVideoError = (error) => {
    console.log('Video error:', error);
    setErrorMessage('Failed to load video');
    setIsVideoLoading(false);
  };

  // Handle "Next" button press to reset the screen
  const handleNext = () => {
    setInputLink('');
    setShowVideo(false);
    setSelectedQuality(null);
    setErrorMessage('');
    setIsLoading(false);
    setIsVideoLoading(false);
    setIsDownloading(false);
    setShowDropdown(false);
    dropdownAnimation.setValue(0);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <Text style={styles.header}>Video Player</Text>

          {/* Input Section */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Paste TeraBox link here"
              placeholderTextColor="#888"
              value={inputLink}
              onChangeText={setInputLink}
              autoCapitalize="none"
              returnKeyType="done"
            />
            {!showVideo ? (
              <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.buttonDisabled]}
                onPress={handleGetVideo}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? 'Loading...' : 'Get Video'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextButtonText}>→ Next</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Video Player and Quality Selector */}
          {showVideo && (
            <View style={styles.videoContainer}>
              {/* Quality Selector with Error */}
              <View style={styles.qualitySelector}>
                <Text style={styles.qualityLabel}>Quality:</Text>
                <View style={styles.dropdownContainer}>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={toggleDropdown}
                  >
                    <Text style={styles.dropdownText}>
                      {selectedQuality
                        ? qualityOptions.find(
                            (option) => option.url === selectedQuality,
                          )?.quality || 'Select Quality'
                        : 'Select Quality'}
                    </Text>
                  </TouchableOpacity>
                  {showDropdown && (
                    <Animated.View
                      style={[
                        styles.dropdownMenu,
                        {
                          opacity: dropdownAnimation,
                          transform: [
                            {
                              translateY: dropdownAnimation.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-10, 0],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      {qualityOptions.map((option, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.dropdownItem}
                          onPress={() => handleQualitySelect(option.url)}
                        >
                          <Text style={styles.dropdownItemText}>
                            {option.quality}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </Animated.View>
                  )}
                </View>
                <Text style={styles.errorText}>{errorMessage || ' '}</Text>
              </View>

              {/* Video Player with Loading Overlay */}
              <View style={styles.videoWrapper}>
                <Video
                  source={{ uri: selectedQuality }}
                  style={styles.video}
                  controls={true}
                  resizeMode="contain"
                  bufferConfig={{
                    minBufferMs: 15000,
                    maxBufferMs: 50000,
                    bufferForPlaybackMs: 2500,
                    bufferForPlaybackAfterRebufferMs: 5000,
                  }}
                  onError={handleVideoError}
                />
                {isVideoLoading && (
                  <View style={styles.videoLoadingOverlay}>
                    <ActivityIndicator size="large" color="#007AFF" />
                  </View>
                )}
              </View>

              {/* Download Button */}
              <TouchableOpacity
                style={[
                  styles.downloadButton,
                  isDownloading && styles.buttonDisabled,
                ]}
                onPress={handleDownload}
                disabled={isDownloading}
              >
                <Text style={styles.buttonText}>
                  {isDownloading ? 'Downloading...' : 'Download Video'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {isLoading && (
          <ActivityIndicator
            size="large"
            color="#007AFF"
            style={styles.loadingIndicator}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
    width: '100%',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 30,
    alignItems: 'center',
  },
  input: {
    backgroundColor: '#1E1E1E',
    color: '#fff',
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
    width: '100%',
    marginBottom: 15,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    width: '100%',
  },
  buttonDisabled: {
    backgroundColor: '#666',
    shadowOpacity: 0,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    width: '100%',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  videoContainer: {
    width: '100%',
    alignItems: 'center',
  },
  qualitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
  },
  qualityLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginRight: 10,
  },
  dropdownContainer: {
    flex: 1,
    position: 'relative',
  },
  dropdownButton: {
    backgroundColor: '#1E1E1E',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  dropdownText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 50,
    width: '100%',
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  dropdownItemText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    color: '#FF5252',
    fontSize: 14,
    marginLeft: 10,
    minWidth: 100,
    textAlign: 'left',
  },
  videoWrapper: {
    width: '100%',
    position: 'relative',
    marginBottom: 20,
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  videoLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    width: '100%',
    alignItems: 'center',
  },
  loadingIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
  },
});

export default PlayScreen;