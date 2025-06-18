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
        <div class="image-container">
          <img 
            v-if="imageUrl"
            :src="imageUrl" 
            :alt="imageAlt || 'Image'"
            class="modal-image"
            @load="handleImageLoad"
            @error="handleImageError"
          />
          <div v-else class="image-placeholder">
            <span class="placeholder-icon">🖼️</span>
            <p>无法加载图片</p>
          </div>
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
import { defineProps, defineEmits } from 'vue';

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

const handleClose = () => {
  emit('close');
};

const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    handleClose();
  }
};

const handleImageLoad = (event) => {
  emit('image-load', event);
};

const handleImageError = (event) => {
  console.error('Image failed to load in modal:', props.imageUrl);
  emit('image-error', event);
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
  }
};

// Add keyboard listener when modal is shown
import { onMounted, onUnmounted, watch } from 'vue';

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
  max-width: 100%;
  max-height: 80vh;
  
  // Mobile height adjustment
  @media (max-width: 768px) {
    max-height: 70vh;
  }
}

.modal-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  
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