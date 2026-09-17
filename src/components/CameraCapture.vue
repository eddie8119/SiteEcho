<template>
  <div class="camera-container">
    <div v-if="!cameraActive" class="camera-inactive">
      <button class="start-camera-btn" :disabled="loading" @click="startCamera">
        {{ loading ? t('camera.status.starting_camera') : t('camera.buttons.start_camera') }}
      </button>
      <p v-if="error" class="error-message">{{ error }}</p>
    </div>

    <div v-else class="camera-active">
      <video ref="videoElement" autoplay playsinline class="camera-video" />

      <div class="camera-controls">
        <button class="capture-btn" @click="capturePhoto">
          {{ t('camera.buttons.capture_photo') }}
        </button>
        <button class="stop-btn" @click="stopCamera">{{ t('camera.buttons.close_camera') }}</button>
      </div>

      <canvas ref="canvasElement" class="hidden-canvas" />
    </div>

    <div v-if="capturedImage" class="captured-preview">
      <h3>{{ t('camera.ui.capture_result') }}</h3>
      <img :src="capturedImage" :alt="t('camera.ui.captured_photo_alt')" class="captured-image" />
      <div class="image-actions">
        <button class="retake-btn" @click="retakePhoto">{{ t('camera.buttons.retake') }}</button>
        <button class="save-btn" @click="savePhoto">{{ t('camera.buttons.save') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const emit = defineEmits<{
  'photo-captured': [imageData: string];
}>();

const { t } = useI18n();

const videoElement = ref<HTMLVideoElement>();
const canvasElement = ref<HTMLCanvasElement>();
const cameraActive = ref(false);
const loading = ref(false);
const error = ref<string>('');
const capturedImage = ref<string>('');
let stream: MediaStream | null = null;

const startCamera = async () => {
  loading.value = true;
  error.value = '';

  try {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment', // 優先使用後置鏡頭
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    });

    stream = mediaStream;

    if (videoElement.value) {
      videoElement.value.srcObject = stream;
      cameraActive.value = true;
    }
  } catch (err) {
    console.error('Camera access error:', err);
    if (err instanceof Error) {
      if (err.name === 'NotAllowedError') {
        error.value = t('camera.errors.camera_permission_denied');
      } else if (err.name === 'NotFoundError') {
        error.value = t('camera.errors.no_camera_found');
      } else {
        error.value = `${t('camera.errors.camera_start_failed')}: ${err.message}`;
      }
    } else {
      error.value = t('camera.errors.camera_start_failed');
    }
  } finally {
    loading.value = false;
  }
};

const stopCamera = () => {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  if (videoElement.value) {
    videoElement.value.srcObject = null;
  }

  cameraActive.value = false;
};

const capturePhoto = () => {
  if (!videoElement.value || !canvasElement.value) return;

  const video = videoElement.value;
  const canvas = canvasElement.value;
  const context = canvas.getContext('2d');

  if (!context) return;

  // 設定 canvas 尺寸與影片相同
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // 將影片當前畫面繪製到 canvas
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  // 轉換為 base64 圖片
  capturedImage.value = canvas.toDataURL('image/jpeg', 0.9);
};

const retakePhoto = () => {
  capturedImage.value = '';
};

const savePhoto = () => {
  if (!capturedImage.value) return;

  // 創建下載連結
  const link = document.createElement('a');
  link.href = capturedImage.value;
  link.download = `SiteNear-photo-${new Date().getTime()}.jpg`;
  link.click();

  // 觸發儲存事件給父元件
  emit('photo-captured', capturedImage.value);
};

// 組件卸載時確保相機關閉
onUnmounted(() => {
  stopCamera();
});
</script>

<style scoped>
.camera-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.camera-inactive {
  text-align: center;
  padding: 40px 20px;
}

.start-camera-btn {
  background-color: #eafe62;
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.start-camera-btn:hover:not(:disabled) {
  background-color: #e56a00;
}

.start-camera-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.error-message {
  color: #dc3545;
  margin-top: 15px;
  font-size: 14px;
}

.camera-active {
  position: relative;
}

.camera-video {
  width: 100%;
  border-radius: 8px;
  background-color: #000;
}

.camera-controls {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 20px;
}

.capture-btn {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.capture-btn:hover {
  background-color: #218838;
}

.stop-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.stop-btn:hover {
  background-color: #c82333;
}

.hidden-canvas {
  display: none;
}

.captured-preview {
  margin-top: 30px;
  text-align: center;
}

.captured-preview h3 {
  margin-bottom: 15px;
  color: #333;
}

.captured-image {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.image-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 20px;
}

.retake-btn {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.retake-btn:hover {
  background-color: #5a6268;
}

.save-btn {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.save-btn:hover {
  background-color: #0056b3;
}

@media (max-width: 768px) {
  .camera-container {
    padding: 10px;
  }

  .camera-controls,
  .image-actions {
    flex-direction: column;
    align-items: center;
  }

  .camera-controls button,
  .image-actions button {
    width: 200px;
  }
}
</style>
