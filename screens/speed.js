import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  KeyboardAvoidingView,
  SafeAreaView,
  ScrollView,
  Keyboard,
  StatusBar,
  Modal,
  ProgressBarAndroid,
  Clipboard, // NEW: Added Clipboard for paste functionality
} from 'react-native';
import Video from 'react-native-video';
import AnimatedReanimated, { Easing, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import RNFS from 'react-native-fs';

// AnimatedAlert Component (unchanged)
const AnimatedAlert = ({ message, visible, onClose }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(50);
  const scale = useSharedValue(0.9);
  const shadowOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const [isHidden, setIsHidden] = useState(!visible);

  useEffect(() => {
    let timeout;
    if (visible) {
      setIsHidden(false);
      timeout = setTimeout(() => {
        onClose();
      }, 3000);
    }
    return () => clearTimeout(timeout);
  }, [visible, onClose]);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 400, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
      translateY.value = withTiming(0, { duration: 400, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
      scale.value = withTiming(1, { duration: 400, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
      shadowOpacity.value = withTiming(0.5, { duration: 400 });
    } else {
      opacity.value = withTiming(0, { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
      translateY.value = withTiming(50, { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
      scale.value = withTiming(0.9, { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
      shadowOpacity.value = withTiming(0, { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
      const timeout = setTimeout(() => {
        setIsHidden(true);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    shadowOpacity: shadowOpacity.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handlePressIn = () => {
    buttonScale.value = withTiming(0.95, { duration: 100 });
  };

  const handlePressOut = () => {
    buttonScale.value = withTiming(1, { duration: 100 });
  };

  if (isHidden) return null;

  return (
    <AnimatedReanimated.View style={[styles.alertContainer, animatedStyle]}>
      <Text style={styles.alertText}>{message}</Text>
      <AnimatedReanimated.View style={[styles.alertCloseButton, buttonAnimatedStyle]}>
        <TouchableOpacity
          onPress={onClose}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.8}
        >
          <Text style={styles.alertCloseText}>✕</Text>
        </TouchableOpacity>
      </AnimatedReanimated.View>
    </AnimatedReanimated.View>
  );
};

const PlayScreen = () => {
  const [inputLink, setInputLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [videoData, setVideoData] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [isInputInvalid, setIsInputInvalid] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const downloadJobId = useRef(null);
  const lastUpdateTime = useRef(0);
  const lastDownloadedBytes = useRef(0);
  const isUserCancelled = useRef(false);
  const retryCount = useRef(0); // NEW: Track retry attempts

  // NEW: Convert bytes to Mbps
  const bytesToMbps = (bytes) => {
    return (((bytes * 8) / 1e6)).toFixed(2);
  };

  // Process long or proxied URLs (unchanged)
  const processLink = (link) => {
    let processedLink = link.trim();
    try {
      const urlParams = new URLSearchParams(new URL(processedLink).search);
      const encodedUrl = urlParams.get('url');
      if (encodedUrl) {
        const decodedUrl = atob(encodedUrl);
        if (decodedUrl.includes('terabox.com') || decodedUrl.includes('terashare')) {
          const match = decodedUrl.match(/\/s\/([^\?]+)/);
          if (match && match[1]) {
            return `https://1024terabox.com/s/${match[1]}`;
          }
          return decodedUrl;
        }
      }
    } catch (e) {
      console.warn('Link processing error:', e.message);
    }
    return processedLink;
  };

  // Validate TeraBox link (unchanged)
  const isValidTeraBoxLink = (link) => {
    const lowerCaseLink = link.toLowerCase();
    return (
      (lowerCaseLink.includes('terabox') || lowerCaseLink.includes('terashare')) &&
      lowerCaseLink.includes('/s/')
    );
  };

  // Convert bytes to GB or MB (unchanged)
  const bytesToGB = (bytes) => {
    return (bytes / 1e9).toFixed(2);
  };

  const bytesToMB = (bytes) => {
    return (bytes / 1e6).toFixed(2);
  };

  // Fetch video metadata from API (unchanged)
  const fetchVideoMetadata = async (link) => {
    try {
      console.log('Sending metadata request with URL:', link);
      const response = await fetch('https://fastapi-r708.onrender.com/file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ url: link }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorData}`);
      }

      const data = await response.json();
      console.log('File API Response:', data);

      if (data && data.status === 'success' && Array.isArray(data.list) && data.list.length > 0) {
        return {
          title: data.list[0].name,
          size: parseInt(data.list[0].size, 10),
        };
      } else {
        const errorMsg = data.status !== 'success'
          ? `API status: ${data.status}`
          : !data.list
            ? 'No list in response'
            : 'Empty list in response';
        throw new Error(`Invalid video data: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Fetch error:', error.message);
      throw error;
    }
  };

  // Handle link submission (unchanged)
  const handleGetVideo = async () => {
    if (!inputLink) {
      setAlertMessage('Please enter a TeraBox link');
      setShowAlert(true);
      setIsInputInvalid(true);
      setInputLink('');
      return;
    }
    const processedLink = processLink(inputLink);
    if (!isValidTeraBoxLink(processedLink)) {
      setAlertMessage('Please enter a valid TeraBox link (e.g., https://1024terabox.com/s/...)');
      setShowAlert(true);
      setIsInputInvalid(true);
      setInputLink('');
      return;
    }
    setInputLink(processedLink);
    setIsInputInvalid(false);
    Keyboard.dismiss();
    setIsLoading(true);
    setErrorMessage('');
    try {
      const metadata = await fetchVideoMetadata(processedLink);
      setVideoData(metadata);
      setVideoUrl('https://example.com/video.mp4');
      setIsLoading(false);
    } catch (error) {
      setAlertMessage(`Failed to fetch video data: ${error.message}`);
      setShowAlert(true);
      setIsLoading(false);
    }
  };

  // Clear highlight when user starts typing (unchanged)
  const handleInputChange = (text) => {
    setInputLink(text);
    if (isInputInvalid) {
      setIsInputInvalid(false);
    }
  };

  // NEW: Handle paste from clipboard
  const handlePaste = async () => {
    try {
      const clipboardContent = await Clipboard.getString();
      if (clipboardContent) {
        setInputLink(clipboardContent);
        setIsInputInvalid(false);
      } else {
        setAlertMessage('Clipboard is empty');
        setShowAlert(true);
      }
    } catch (error) {
      console.error('Paste error:', error);
      setAlertMessage('Failed to paste from clipboard');
      setShowAlert(true);
    }
  };

  // Handle Play button (unchanged)
  const handlePlay = () => {
    if (!videoUrl) {
      setErrorMessage('No video URL available');
      return;
    }
    setIsVideoLoading(true);
    setShowVideo(true);
    setTimeout(() => {
      setIsVideoLoading(false);
    }, 1000);
  };

  // Handle Download button with retry logic
  const handleDownload = async (retries = 2) => {
    if (!inputLink) {
      setErrorMessage('No link available for download');
      return;
    }
    const processedLink = processLink(inputLink);
    setIsDownloading(true);
    try {
      console.log('Sending download request with payload:', { url: processedLink });
      const response = await fetch('https://fastapi-r708.onrender.com/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ url: processedLink }),
      });

      if (!response.ok) {
        let errorDetails = 'Unknown error';
        try {
          errorDetails = await response.json();
          console.log('Error response:', errorDetails);
          errorDetails = JSON.stringify(errorDetails.detail || errorDetails);
        } catch (e) {
          errorDetails = await response.text();
        }
        throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorDetails}`);
      }

      const data = await response.json();
      console.log('Link API Response:', data);

      if (data.download_link.url_2) {
        const downloadUrl = data.download_link.url_2;
        console.log(downloadUrl);
        const fileName = videoData?.title.replace(/[^a-zA-Z0-9.-]/g, '_') || 'video.mp4';
        const destinationPath = `${RNFS.TemporaryDirectoryPath}/${fileName}`;

        setShowDownloadModal(true);
        setDownloadProgress(0);
        setDownloadedBytes(0);
        setDownloadSpeed(0);
        setTotalBytes(videoData?.size || 0);
        lastUpdateTime.current = Date.now();
        lastDownloadedBytes.current = 0;
        isUserCancelled.current = false;
        retryCount.current = 0; // Reset retry count

        const download = RNFS.downloadFile({
          fromUrl: downloadUrl,
          toFile: destinationPath,
          background: true,
          cacheable: true, // NEW: Enable caching
          connectionTimeout: 15000, // NEW: Set connection timeout
          readTimeout: 15000, // NEW: Set read timeout
          progressDivider: 10, // NEW: Update progress every 10%
          progress: (res) => {
            const progress = res.contentLength > 0 ? res.bytesWritten / res.contentLength : 0;
            const currentTime = Date.now();
            const timeDiff = (currentTime - lastUpdateTime.current) / 1000;
            const bytesDiff = res.bytesWritten - lastDownloadedBytes.current;
            const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;

            setDownloadProgress(progress);
            setDownloadedBytes(res.bytesWritten);
            setTotalBytes(res.contentLength || videoData?.size || 0);
            setDownloadSpeed(speed);

            if (timeDiff >= 1) {
              lastUpdateTime.current = currentTime;
              lastDownloadedBytes.current = res.bytesWritten;
            }
          },
        });

        downloadJobId.current = download.jobId;

        download.promise
          .then(() => {
            setShowDownloadModal(false);
            setAlertMessage(`Download completed: ${fileName}`);
            setShowAlert(true);
            setIsDownloading(false);
            downloadJobId.current = null;
          })
          .catch(async (err) => {
            console.error('Download failed:', err);
            if (!isUserCancelled.current && retries > 0) {
              console.log(`Retrying download... (${retries} retries left)`);
              retryCount.current += 1;
              await new Promise((resolve) => setTimeout(resolve, 2000)); // 2-second delay
              handleDownload(retries - 1); // Retry
            } else {
              if (!isUserCancelled.current) {
                setShowDownloadModal(false);
                setErrorMessage(`Download failed: ${err.message}`);
                setShowAlert(true);
              }
              setIsDownloading(false);
              downloadJobId.current = null;
            }
          });
      } else {
        throw new Error('No download URL returned');
      }
    } catch (error) {
      console.error('Download error:', error.message);
      setErrorMessage(`Failed to initiate download: ${error.message}`);
      setShowAlert(true);
      setIsDownloading(false);
    }
  };

  // Show cancel confirmation modal (unchanged)
  const requestCancelDownload = () => {
    setShowCancelConfirmModal(true);
  };

  // Confirm and cancel download (unchanged)
  const confirmCancelDownload = () => {
    if (downloadJobId.current) {
      isUserCancelled.current = true;
      RNFS.stopDownload(downloadJobId.current);
    }
    setShowDownloadModal(false);
    setShowCancelConfirmModal(false);
    setIsDownloading(false);
    setDownloadProgress(0);
    setDownloadedBytes(0);
    setDownloadSpeed(0);
    setTotalBytes(0);
    downloadJobId.current = null;
    setErrorMessage('');
  };

  // Dismiss cancel confirmation (unchanged)
  const dismissCancelConfirm = () => {
    setShowCancelConfirmModal(false);
  };

  // Handle video errors (unchanged)
  const handleVideoError = (error) => {
    console.log('Video error:', error);
    setErrorMessage('Failed to load video');
    setIsVideoLoading(false);
  };

  // Handle "Next" button press to reset the screen (unchanged)
  const handleNext = () => {
    if (isDownloading) {
      requestCancelDownload();
      return;
    }
    setInputLink('');
    setShowVideo(false);
    setVideoData(null);
    setVideoUrl(null);
    setErrorMessage('');
    setIsLoading(false);
    setIsVideoLoading(false);
    setIsDownloading(false);
    setIsInputInvalid(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      <KeyboardAvoidingView style={styles.container} behavior="height" keyboardVerticalOffset={20}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <Text style={styles.header}>Video Player</Text>

          {/* Input Section */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, isInputInvalid && styles.inputInvalid]}
                placeholder="Paste TeraBox link here"
                placeholderTextColor="#888"
                value={inputLink}
                onChangeText={handleInputChange}
                autoCapitalize="none"
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.pasteButton} onPress={handlePaste}>
                <Text style={styles.pasteButtonText}>Paste</Text>
              </TouchableOpacity>
            </View>
            {!videoData ? (
              <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.buttonDisabled]}
                onPress={handleGetVideo}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>{isLoading ? 'Loading...' : 'Get Video'}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextButtonText}>Convert Next Video</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Video Metadata and Buttons */}
          {videoData && !showVideo && (
            <View style={styles.metadataContainer}>
              <Text style={styles.metadataTitle}>{videoData.title}</Text>
              <Text style={styles.metadataSize}>Size: {bytesToGB(videoData.size)} GB</Text>
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.playButton, isVideoLoading && styles.buttonDisabled]}
                  onPress={handlePlay}
                  disabled={isVideoLoading}
                >
                  <Text style={styles.buttonText}>{isVideoLoading ? 'Loading...' : 'Play'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.downloadButton, isDownloading && styles.buttonDisabled]}
                  onPress={() => handleDownload(2)} // Start with 2 retries
                  disabled={isDownloading}
                >
                  <Text style={styles.buttonText}>{isDownloading ? 'Downloading...' : 'Download'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.errorText}>{errorMessage || ' '}</Text>
            </View>
          )}

          {/* Video Player */}
          {showVideo && (
            <View style={styles.videoContainer}>
              <View style={styles.videoWrapper}>
                <Video
                  source={{ uri: videoUrl }}
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
                    <ActivityIndicator size="large" color="#FFFFFF" />
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Download Progress Modal */}
        <Modal visible={showDownloadModal} transparent={true} animationType="fade" onRequestClose={requestCancelDownload}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Downloading {videoData?.title || 'Video'}</Text>
              <View style={styles.progressContainer}>
                <ProgressBarAndroid
                  styleAttr="Horizontal"
                  indeterminate={false}
                  progress={downloadProgress}
                  color="#007AFF"
                  style={styles.progressBar}
                />
                <Text style={styles.progressText}>{Math.round(downloadProgress * 100)}%</Text>
              </View>
              <Text style={styles.statusText}>
                Downloaded: {bytesToMB(downloadedBytes)} MB / {bytesToMB(totalBytes)} MB
              </Text>
              <Text style={styles.statusText}>Speed: {bytesToMbps(downloadSpeed)} Mbps</Text>
              <TouchableOpacity style={styles.cancelButton} onPress={requestCancelDownload}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Cancel Confirmation Modal */}
        <Modal visible={showCancelConfirmModal} transparent={true} animationType="fade" onRequestClose={dismissCancelConfirm}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Are you sure you want to stop downloading?</Text>
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.confirmButton} onPress={confirmCancelDownload}>
                  <Text style={styles.confirmButtonText}>Yes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dismissButton} onPress={dismissCancelConfirm}>
                  <Text style={styles.dismissButtonText}>No</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <AnimatedAlert message={alertMessage} visible={showAlert} onClose={() => setShowAlert(false)} />

        {isLoading && (
          <ActivityIndicator size="large" color="#FFFFFF" style={styles.loadingIndicator} />
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#1E1E1E',
    color: '#fff',
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
    flex: 1,
    marginRight: 10,
  },
  inputInvalid: {
    borderColor: '#FF5252',
    borderWidth: 2,
  },
  pasteButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pasteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  metadataContainer: {
    width: '100%',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  metadataTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  metadataSize: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  playButton: {
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
    flex: 1,
    marginRight: 10,
  },
  downloadButton: {
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
    flex: 1,
    marginLeft: 10,
  },
  errorText: {
    color: '#FF5252',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  videoContainer: {
    width: '100%',
    alignItems: 'center',
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
  loadingIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
  },
  alertContainer: {
    position: 'absolute',
    top: '40%',
    left: 20,
    right: 20,
    backgroundColor: 'rgba(30, 30, 30, 0.92)',
    borderRadius: 16,
    padding: 25,
    paddingTop: 35,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    shadowColor: '#FF5252',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.3)',
  },
  alertText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: '80%',
  },
  alertCloseButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#E53935',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  alertCloseText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressBar: {
    width: '100%',
    height: 10,
  },
  progressText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 5,
  },
  statusText: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 10,
  },
  cancelButton: {
    backgroundColor: '#E53935',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#E53935',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dismissButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginLeft: 10,
  },
  dismissButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PlayScreen;