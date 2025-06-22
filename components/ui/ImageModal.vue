<!-- components/ui/ImageModal.vue -->
<template>
  <teleport to="body">
    <div v-if="show" class="image-modal-overlay" @click="handleOverlayClick">
      <div class="image-modal-container" @click.stop>
        <!-- Close button -->
        <button class="close-button" @click="handleClose">
          <span class="close-icon">✕</span>
        </button>
        
        <!-- Navigation buttons for multiple images -->
        <button 
          v-if="showNavigation && hasPrevious" 
          class="nav-button nav-previous" 
          @click="$emit('previous')"
        >
          <span class="nav-icon">‹</span>
        </button>
        
        <button 
          v-if="showNavigation && hasNext" 
          class="nav-button nav-next" 
          @click="$emit('next')"
        >
          <span class="nav-icon">›</span>
        </button>
        
        <!-- Image container -->
        <div class="image-container" ref="imageContainer">
          <div 
            v-if="imageUrl"
            class="image-wrapper"
            :style="imageWrapperStyle"
            @wheel="handleWheel"
            @mousedown="handleMouseDown"
            @mousemove="handleMouseMove"
            @mouseup="handleMouseUp"
            @mouseleave="handleMouseUp"
            @touchstart="handleTouchStart"
            @touchmove="handleTouchMove"
            @touchend="handleTouchEnd"
            @dblclick="handleDoubleClick"
          >
            <img 
              :src="imageUrl" 
              :alt="imageAlt || 'Image'"
              class="modal-image"
              :style="imageStyle"
              @load="handleImageLoad"
              @error="handleImageError"
              @dragstart.prevent
            />
          </div>
          <div v-else class="image-placeholder">
            <span class="placeholder-icon">🖼️</span>
            <p>无法加载图片</p>
          </div>
        </div>
        
        <!-- Zoom controls -->
        <div v-if="imageUrl" class="zoom-controls">
          <button class="zoom-btn" @click="zoomOut" :disabled="scale <= minScale">
            <span class="zoom-icon">-</span>
          </button>
          <span class="zoom-level">{{ Math.round(scale * 100) }}%</span>
          <button class="zoom-btn" @click="zoomIn" :disabled="scale >= maxScale">
            <span class="zoom-icon">+</span>
          </button>
          <button class="zoom-btn reset-btn" @click="resetZoom" title="适应屏幕">
            <span class="zoom-icon">⚏</span>
          </button>
        </div>
        
        <!-- Image info -->
        <div v-if="filename || imageAlt" class="image-info">
          <p class="image-filename">{{ filename || imageAlt }}</p>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { defineProps, defineEmits, ref, computed, watch, nextTick } from 'vue';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  imageUrl: {
    type: String,
    default: ''
  },
  imageAlt: {
    type: String,
    default: ''
  },
  filename: {
    type: String,
    default: ''
  },
  closeOnOverlay: {
    type: Boolean,
    default: true
  },
  showNavigation: {
    type: Boolean,
    default: false
  },
  hasPrevious: {
    type: Boolean,
    default: false
  },
  hasNext: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'previous', 'next', 'image-load', 'image-error']);

// Zoom and pan state
const scale = ref(1);
const translateX = ref(0);
const translateY = ref(0);
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });
const imageContainer = ref(null);
const naturalDimensions = ref({ width: 0, height: 0 });
const fittedScale = ref(1);

// Zoom constraints
const minScale = 0.1;
const maxScale = 5;
const zoomStep = 0.2;

// Reset state when modal opens/closes
watch(() => props.show, (newShow) => {
  if (newShow) {
    // Reset state but don't auto-fit yet - wait for image load
    scale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
  }
});

// Watch for image changes and reset zoom
watch(() => props.imageUrl, () => {
  if (props.imageUrl) {
    nextTick(() => {
      // Reset but don't auto-fit yet - wait for image load
      scale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
    });
  }
});

// Computed styles
const imageWrapperStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px)`,
  cursor: scale.value > 1 ? (isDragging.value ? 'grabbing' : 'grab') : 'default',
  transition: isDragging.value ? 'none' : 'transform 0.3s ease'
}));

const imageStyle = computed(() => ({
  transform: `scale(${scale.value})`,
  transition: isDragging.value ? 'none' : 'transform 0.3s ease',
  transformOrigin: 'center center'
}));

const handleClose = () => {
  resetZoom();
  emit('close');
};

const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    handleClose();
  }
};

const handleImageLoad = (event) => {
  // Store natural dimensions for smart fitting
  naturalDimensions.value = {
    width: event.target.naturalWidth,
    height: event.target.naturalHeight
  };
  
  // Auto-execute the == button logic when image loads
  nextTick(() => {
    resetZoom(); // This is exactly what the == button does
  });
  
  emit('image-load', event);
};

const handleImageError = (event) => {
  console.error('Image failed to load in modal:', props.imageUrl);
  emit('image-error', event);
};

// Zoom and pan functions
const resetZoom = () => {
  // Reset to smart fit instead of 1:1 scale
  fitImageToViewport();
  isDragging.value = false;
};

const fitImageToViewport = () => {
  if (!imageContainer.value || !naturalDimensions.value.width) return;
  
  const container = imageContainer.value;
  const containerRect = container.getBoundingClientRect();
  const containerWidth = containerRect.width;
  const containerHeight = containerRect.height;
  
  console.log('fitImageToViewport called:', {
    containerWidth,
    containerHeight,
    imageWidth: naturalDimensions.value.width,
    imageHeight: naturalDimensions.value.height
  });
  
  // If container has no size yet, retry after a short delay
  if (containerWidth === 0 || containerHeight === 0) {
    console.log('Container has no size, retrying...');
    setTimeout(() => fitImageToViewport(), 100);
    return;
  }
  
  const imageAspectRatio = naturalDimensions.value.width / naturalDimensions.value.height;
  const containerAspectRatio = containerWidth / containerHeight;
  
  console.log('Aspect ratios:', { imageAspectRatio, containerAspectRatio });
  
  // Smart fitting: ensure image fits within viewport while maintaining aspect ratio
  let newScale;
  if (imageAspectRatio > containerAspectRatio) {
    // Image is wider - fit to width
    newScale = containerWidth / naturalDimensions.value.width;
    console.log('Fitting to width - scale:', newScale);
  } else {
    // Image is taller - fit to height
    newScale = containerHeight / naturalDimensions.value.height;
    console.log('Fitting to height - scale:', newScale);
  }
  
  // Apply reasonable padding to ensure image doesn't touch edges
  newScale = newScale * 0.95; // 5% padding
  console.log('Scale after padding:', newScale);
  
  // IMPORTANT FIX: Don't let images get too small - use minimum 1.0 scale for large images
  // This prevents high-resolution images from becoming tiny
  newScale = Math.max(newScale, 1.0);
  console.log('Scale after minimum 1.0 constraint:', newScale);
  
  // Ensure we don't exceed max scale or go below min scale
  newScale = Math.min(Math.max(newScale, minScale), maxScale);
  console.log('Final scale:', newScale);
  
  // Store the fitted scale for comparison in double-click
  fittedScale.value = newScale;
  
  scale.value = newScale;
  translateX.value = 0;
  translateY.value = 0;
};

const zoomIn = () => {
  if (scale.value < maxScale) {
    scale.value = Math.min(scale.value + zoomStep, maxScale);
    constrainPan();
  }
};

const zoomOut = () => {
  if (scale.value > minScale) {
    scale.value = Math.max(scale.value - zoomStep, minScale);
    constrainPan();
  }
};

const constrainPan = () => {
  if (!imageContainer.value) return;
  
  const container = imageContainer.value;
  const containerRect = container.getBoundingClientRect();
  const scaledWidth = naturalDimensions.value.width * scale.value;
  const scaledHeight = naturalDimensions.value.height * scale.value;
  
  const maxTranslateX = Math.max(0, (scaledWidth - containerRect.width) / 2);
  const maxTranslateY = Math.max(0, (scaledHeight - containerRect.height) / 2);
  
  translateX.value = Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX.value));
  translateY.value = Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY.value));
};

// Mouse events
const handleMouseDown = (event) => {
  if (scale.value <= 1) return;
  
  isDragging.value = true;
  dragStart.value = {
    x: event.clientX - translateX.value,
    y: event.clientY - translateY.value
  };
  event.preventDefault();
};

const handleMouseMove = (event) => {
  if (!isDragging.value || scale.value <= 1) return;
  
  translateX.value = event.clientX - dragStart.value.x;
  translateY.value = event.clientY - dragStart.value.y;
  constrainPan();
  event.preventDefault();
};

const handleMouseUp = () => {
  isDragging.value = false;
};

// Touch events for mobile
const handleTouchStart = (event) => {
  if (scale.value <= 1 || event.touches.length !== 1) return;
  
  isDragging.value = true;
  const touch = event.touches[0];
  dragStart.value = {
    x: touch.clientX - translateX.value,
    y: touch.clientY - translateY.value
  };
  event.preventDefault();
};

const handleTouchMove = (event) => {
  if (!isDragging.value || scale.value <= 1 || event.touches.length !== 1) return;
  
  const touch = event.touches[0];
  translateX.value = touch.clientX - dragStart.value.x;
  translateY.value = touch.clientY - dragStart.value.y;
  constrainPan();
  event.preventDefault();
};

const handleTouchEnd = () => {
  isDragging.value = false;
};

// Scroll wheel zoom
const handleWheel = (event) => {
  event.preventDefault();
  
  const zoomDelta = event.deltaY > 0 ? -zoomStep : zoomStep;
  const newScale = Math.max(minScale, Math.min(maxScale, scale.value + zoomDelta));
  
  if (newScale !== scale.value) {
    scale.value = newScale;
    constrainPan();
  }
};

// Double click to fit/zoom
const handleDoubleClick = () => {
  // If we're at the fitted scale (within tolerance), zoom to 2x
  if (Math.abs(scale.value - fittedScale.value) < 0.1) {
    scale.value = Math.min(2, maxScale);
  } else {
    // Reset to fit
    fitImageToViewport();
  }
  constrainPan();
};

// Keyboard navigation
const handleKeydown = (event) => {
  if (!props.show) return;
  
  switch (event.key) {
    case 'Escape':
      handleClose();
      break;
    case 'ArrowLeft':
      if (props.hasPrevious) emit('previous');
      break;
    case 'ArrowRight':
      if (props.hasNext) emit('next');
      break;
    case '+':
    case '=':
      event.preventDefault();
      zoomIn();
      break;
    case '-':
      event.preventDefault();
      zoomOut();
      break;
    case '0':
      event.preventDefault();
      fitImageToViewport();
      break;
  }
};

// Add keyboard listener when modal is shown  
import { onMounted, onUnmounted } from 'vue';

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});

// Prevent body scroll when modal is open
watch(() => props.show, (newShow) => {
  if (newShow) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});
</script>

<style lang="scss" scoped>
.image-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  animation: fadeIn 0.3s ease-out;
  
  // Mobile optimizations
  @media (max-width: 768px) {
    padding: 1rem;
  }
}

.image-modal-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 95vw;
  max-height: 95vh;
  animation: slideIn 0.3s ease-out;
}

.close-button {
  position: absolute;
  top: -50px;
  right: 0;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;
  
  // Mobile positioning
  @media (max-width: 768px) {
    top: -60px;
    right: 10px;
    background: rgba(255, 255, 255, 0.3);
  }
  
  .close-icon {
    color: white;
    font-size: 1.5rem;
    font-weight: bold;
    line-height: 1;
  }
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }
}

.nav-button {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.5);
  border: none;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;
  
  // Mobile sizing
  @media (max-width: 768px) {
    width: 44px;
    height: 44px;
  }
  
  .nav-icon {
    color: white;
    font-size: 2rem;
    font-weight: bold;
    line-height: 1;
  }
  
  &:hover {
    background: rgba(0, 0, 0, 0.7);
    transform: translateY(-50%) scale(1.1);
  }
  
  &.nav-previous {
    left: -70px;
    
    @media (max-width: 768px) {
      left: 10px;
    }
  }
  
  &.nav-next {
    right: -70px;
    
    @media (max-width: 768px) {
      right: 10px;
    }
  }
}

.image-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 90vw;
  height: 80vh;
  overflow: hidden;
  position: relative;
  
  // Mobile height adjustment
  @media (max-width: 768px) {
    width: 95vw;
    height: 70vh;
  }
}

.image-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  position: relative;
  user-select: none;
}

.modal-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  pointer-events: none;
  
  // Ensure image is crisp
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
}

.image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 300px;
  min-height: 200px;
  background: var(--surface-secondary);
  border-radius: 8px;
  color: var(--text-muted);
  
  .placeholder-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }
  
  p {
    margin: 0;
    font-size: 1.1rem;
  }
}

.image-info {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 20px;
  max-width: 100%;
  
  .image-filename {
    margin: 0;
    color: white;
    font-size: 0.9rem;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 400px;
    
    // Mobile adjustments
    @media (max-width: 768px) {
      font-size: 0.8rem;
      max-width: 250px;
    }
  }
}

.zoom-controls {
  position: absolute;
  bottom: -60px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 25px;
  padding: 0.5rem 1rem;
  
  // Mobile positioning
  @media (max-width: 768px) {
    bottom: -50px;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
  }
  
  .zoom-btn {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    
    @media (max-width: 768px) {
      width: 32px;
      height: 32px;
    }
    
    .zoom-icon {
      color: white;
      font-size: 1.2rem;
      font-weight: bold;
      line-height: 1;
      
      @media (max-width: 768px) {
        font-size: 1rem;
      }
    }
    
    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.1);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    &.reset-btn {
      background: rgba(255, 255, 255, 0.1);
      
      &:hover {
        background: rgba(255, 255, 255, 0.2);
      }
    }
  }
  
  .zoom-level {
    color: white;
    font-size: 0.9rem;
    font-weight: 500;
    min-width: 50px;
    text-align: center;
    
    @media (max-width: 768px) {
      font-size: 0.8rem;
      min-width: 45px;
    }
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

// Responsive adjustments for very small screens
@media (max-width: 480px) {
  .image-modal-container {
    max-width: 100vw;
    max-height: 100vh;
  }
  
  .image-container {
    max-height: 60vh;
  }
  
  .close-button {
    top: -40px;
    width: 36px;
    height: 36px;
    
    .close-icon {
      font-size: 1.2rem;
    }
  }
}
</style>