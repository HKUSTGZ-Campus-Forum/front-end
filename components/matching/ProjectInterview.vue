<template>
  <div class="project-interview">
    <!-- Interview Progress -->
    <div class="interview-progress">
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: `${(currentRound / 5) * 100}%` }"
        ></div>
      </div>
      <div class="progress-text">第 {{ currentRound }}/5 轮问题</div>
    </div>

    <!-- Question Section -->
    <div v-if="!isCompleted && !isLoading" class="question-section">
      <h3 class="question-title">{{ currentQuestion }}</h3>

      <!-- Option Buttons -->
      <div class="options-grid">
        <button
          v-for="(option, index) in currentOptions"
          :key="index"
          @click="selectOption(option)"
          class="option-button"
          :class="{ 'selected': selectedOption === option }"
        >
          {{ option }}
        </button>

        <!-- Other Option -->
        <button
          @click="showCustomInput = true"
          class="option-button other-button"
          :class="{ 'selected': showCustomInput }"
        >
          其他
        </button>

        <!-- Skip Button -->
        <button
          @click="skipQuestion"
          class="option-button skip-button"
        >
          跳过此问题
        </button>
      </div>

      <!-- Custom Input -->
      <div v-if="showCustomInput" class="custom-input-section">
        <textarea
          v-model="customAnswer"
          placeholder="请输入您的想法..."
          rows="3"
          class="custom-input"
          @input="selectedOption = customAnswer"
        />
      </div>

      <!-- Next Button -->
      <div class="action-buttons">
        <button
          @click="submitAnswer"
          :disabled="!selectedOption || submitting"
          class="btn btn-primary next-button"
        >
          <Icon v-if="submitting" name="spinner" class="spinning" />
          {{ currentRound < 5 ? '下一题' : '完成访谈' }}
        </button>
      </div>
    </div>

    <!-- Loading Section -->
    <div v-if="isLoading" class="loading-section">
      <!-- AI Brain Animation -->
      <div class="ai-brain-container">
        <div class="ai-brain">
          <div class="brain-core">
            <div class="brain-pulse"></div>
            <div class="brain-spark spark-1"></div>
            <div class="brain-spark spark-2"></div>
            <div class="brain-spark spark-3"></div>
            <div class="brain-spark spark-4"></div>
          </div>
          <div class="neural-network">
            <div class="neural-line line-1"></div>
            <div class="neural-line line-2"></div>
            <div class="neural-line line-3"></div>
            <div class="neural-node node-1"></div>
            <div class="neural-node node-2"></div>
            <div class="neural-node node-3"></div>
          </div>
        </div>
      </div>

      <!-- Animated Text -->
      <div class="loading-text-container">
        <p class="loading-text">{{ loadingText }}</p>
        <div class="text-dots">
          <span class="dot dot-1">.</span>
          <span class="dot dot-2">.</span>
          <span class="dot dot-3">.</span>
        </div>
      </div>

      <!-- Progress Indicator -->
      <div class="ai-progress-indicator">
        <div class="progress-wave">
          <div class="wave wave-1"></div>
          <div class="wave wave-2"></div>
          <div class="wave wave-3"></div>
        </div>
      </div>
    </div>

    <!-- Completion Section -->
    <div v-if="isCompleted" class="completion-section">
      <div class="completion-header">
        <Icon name="check-circle" class="completion-icon" />
        <h3>访谈完成！</h3>
        <p>基于您的回答，我们为您生成了完善的项目描述</p>
      </div>

      <div class="synthesized-description">
        <label>完善后的项目描述：</label>
        <textarea
          v-model="finalDescription"
          rows="8"
          class="description-textarea"
          placeholder="项目描述将在这里显示..."
        />
        <div class="char-count">{{ finalDescription?.length || 0 }}/1000</div>
      </div>

      <div class="completion-actions">
        <button @click="restartInterview" class="btn btn-secondary">
          重新访谈
        </button>
        <button
          @click="confirmDescription"
          :disabled="!finalDescription?.trim()"
          class="btn btn-primary"
        >
          确认并创建项目
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// Props
const props = defineProps({
  initialDescription: {
    type: String,
    required: true
  }
})

// Emits
const emit = defineEmits(['completed', 'restart'])

// Composables
const { fetchWithAuth } = useApi()

// State
const currentRound = ref(1)
const currentQuestion = ref('')
const currentOptions = ref([])
const selectedOption = ref('')
const customAnswer = ref('')
const showCustomInput = ref(false)
const interviewHistory = ref([])
const isLoading = ref(false)
const submitting = ref(false)
const isCompleted = ref(false)
const finalDescription = ref('')
const loadingText = ref('正在生成问题...')

// Methods
const startInterview = async () => {
  isLoading.value = true
  loadingText.value = '正在生成问题...'

  try {
    const response = await fetchWithAuth('/api/project-interview/start', {
      method: 'POST',
      body: { initial_description: props.initialDescription }
    })

    const data = await response.json()

    if (data.success) {
      currentQuestion.value = data.data.question
      currentOptions.value = data.data.options
      currentRound.value = data.data.round

      // Initialize history
      interviewHistory.value = [{
        question: currentQuestion.value,
        options: currentOptions.value,
        answer: null
      }]
    } else {
      throw new Error(data.message || 'Failed to start interview')
    }
  } catch (error) {
    console.error('Error starting interview:', error)
    // Could show error toast here
  } finally {
    isLoading.value = false
  }
}

const selectOption = (option) => {
  selectedOption.value = option
  showCustomInput.value = false
  customAnswer.value = ''
}

const skipQuestion = () => {
  selectedOption.value = '跳过'
  showCustomInput.value = false
  customAnswer.value = ''
}

const submitAnswer = async () => {
  if (!selectedOption.value || submitting.value) return

  submitting.value = true
  isLoading.value = true

  // Update current history entry with answer
  if (interviewHistory.value.length > 0) {
    interviewHistory.value[interviewHistory.value.length - 1].answer = selectedOption.value
  }

  try {
    if (currentRound.value >= 5) {
      // Final round - synthesize description
      await synthesizeDescription()
    } else {
      // Continue interview
      loadingText.value = '正在生成下一个问题...'

      const response = await fetchWithAuth('/api/project-interview/answer', {
        method: 'POST',
        body: {
          interview_history: interviewHistory.value,
          current_answer: selectedOption.value,
          round: currentRound.value,
          initial_description: props.initialDescription  // Include initial description
        }
      })

      const data = await response.json()

      if (data.success) {
        if (data.completed) {
          finalDescription.value = data.data.description
          isCompleted.value = true
        } else {
          // Next question
          currentQuestion.value = data.data.question
          currentOptions.value = data.data.options
          currentRound.value = data.data.round

          // Add new question to history
          interviewHistory.value.push({
            question: currentQuestion.value,
            options: currentOptions.value,
            answer: null
          })

          // Reset selection state
          selectedOption.value = ''
          showCustomInput.value = false
          customAnswer.value = ''
        }
      } else {
        throw new Error(data.message || 'Failed to continue interview')
      }
    }
  } catch (error) {
    console.error('Error submitting answer:', error)
    // Could show error toast here
  } finally {
    submitting.value = false
    isLoading.value = false
  }
}

const synthesizeDescription = async () => {
  loadingText.value = '正在生成完善的项目描述...'

  try {
    const response = await fetchWithAuth('/api/project-interview/synthesize', {
      method: 'POST',
      body: {
        interview_history: interviewHistory.value,
        initial_description: props.initialDescription  // Include initial description
      }
    })

    const data = await response.json()

    if (data.success) {
      finalDescription.value = data.data.description
      isCompleted.value = true
    } else {
      throw new Error(data.message || 'Failed to synthesize description')
    }
  } catch (error) {
    console.error('Error synthesizing description:', error)
    // Fallback: use original description
    finalDescription.value = props.initialDescription
    isCompleted.value = true
  }
}

const restartInterview = () => {
  emit('restart')
}

const confirmDescription = () => {
  emit('completed', finalDescription.value)
}

// Initialize on mount
onMounted(() => {
  startInterview()
})
</script>

<style scoped>
.project-interview {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.interview-progress {
  margin-bottom: 30px;
  text-align: center;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--surface-secondary, #f8f9fa);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--interactive-primary, #3498db), #2ecc71);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.9rem;
  color: var(--text-secondary, #7f8c8d);
  font-weight: 500;
}

.question-section {
  background: var(--surface-primary, white);
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  padding: 30px;
  margin-bottom: 20px;
}

.question-title {
  font-size: 1.4rem;
  color: var(--text-primary, #2c3e50);
  margin-bottom: 25px;
  line-height: 1.4;
  font-weight: 600;
}

.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.option-button {
  padding: 16px 20px;
  border: 2px solid var(--border-primary, #e9ecef);
  border-radius: 8px;
  background: var(--surface-primary, white);
  color: var(--text-primary, #2c3e50);
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.option-button:hover {
  border-color: var(--interactive-primary, #3498db);
  background: rgba(52, 152, 219, 0.02);
}

.option-button.selected {
  border-color: var(--interactive-primary, #3498db);
  background: rgba(52, 152, 219, 0.1);
  color: var(--interactive-primary, #3498db);
  font-weight: 500;
}

.option-button.other-button {
  background: var(--surface-secondary, #f8f9fa);
  border-style: dashed;
}

.option-button.skip-button {
  background: #fff5f5;
  border-color: #fed7d7;
  color: var(--text-secondary, #7f8c8d);
}

.custom-input-section {
  margin: 15px 0 20px 0;
}

.custom-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--interactive-primary, #3498db);
  border-radius: 8px;
  font-size: 1rem;
  resize: vertical;
  background: var(--surface-primary, white);
  color: var(--text-primary, #2c3e50);
}

.custom-input:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.next-button {
  padding: 12px 32px;
  font-size: 1.1rem;
  font-weight: 500;
}

.loading-section {
  text-align: center;
  padding: 60px 20px;
  background: var(--surface-primary, white);
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  position: relative;
  overflow: hidden;
}

/* AI Brain Animation */
.ai-brain-container {
  display: flex;
  justify-content: center;
  margin-bottom: 30px;
}

.ai-brain {
  position: relative;
  width: 80px;
  height: 80px;
}

.brain-core {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  background: linear-gradient(45deg, var(--interactive-primary, #3498db), #2ecc71);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brain-pulse {
  width: 20px;
  height: 20px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  animation: brain-pulse 2s ease-in-out infinite;
}

.brain-spark {
  position: absolute;
  width: 6px;
  height: 6px;
  background: #ffd700;
  border-radius: 50%;
  animation: spark-float 3s ease-in-out infinite;
}

.spark-1 {
  top: -10px;
  left: 10px;
  animation-delay: 0s;
}

.spark-2 {
  top: 10px;
  right: -10px;
  animation-delay: 0.7s;
}

.spark-3 {
  bottom: -10px;
  left: 10px;
  animation-delay: 1.4s;
}

.spark-4 {
  top: 10px;
  left: -10px;
  animation-delay: 2.1s;
}

.neural-network {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.neural-line {
  position: absolute;
  background: var(--interactive-primary, #3498db);
  border-radius: 2px;
  opacity: 0.6;
  animation: neural-pulse 2.5s ease-in-out infinite;
}

.line-1 {
  width: 30px;
  height: 2px;
  top: 15px;
  left: 0;
  transform: rotate(45deg);
  animation-delay: 0s;
}

.line-2 {
  width: 25px;
  height: 2px;
  top: 45px;
  right: 5px;
  transform: rotate(-30deg);
  animation-delay: 0.8s;
}

.line-3 {
  width: 20px;
  height: 2px;
  bottom: 20px;
  left: 15px;
  transform: rotate(60deg);
  animation-delay: 1.6s;
}

.neural-node {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #2ecc71;
  border-radius: 50%;
  animation: node-glow 3s ease-in-out infinite;
}

.node-1 {
  top: 5px;
  left: 5px;
  animation-delay: 0.5s;
}

.node-2 {
  top: 35px;
  right: 10px;
  animation-delay: 1.2s;
}

.node-3 {
  bottom: 15px;
  left: 20px;
  animation-delay: 1.9s;
}

/* Animated Text */
.loading-text-container {
  margin-bottom: 25px;
}

.loading-text {
  font-size: 1.1rem;
  color: var(--text-primary, #2c3e50);
  margin-bottom: 8px;
  font-weight: 500;
}

.text-dots {
  display: inline-flex;
  gap: 2px;
}

.dot {
  font-size: 1.5rem;
  color: var(--interactive-primary, #3498db);
  animation: dot-bounce 1.5s ease-in-out infinite;
}

.dot-1 {
  animation-delay: 0s;
}

.dot-2 {
  animation-delay: 0.3s;
}

.dot-3 {
  animation-delay: 0.6s;
}

/* Progress Wave Indicator */
.ai-progress-indicator {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.progress-wave {
  display: flex;
  align-items: end;
  gap: 4px;
  height: 30px;
}

.wave {
  width: 4px;
  background: linear-gradient(to top, var(--interactive-primary, #3498db), rgba(52, 152, 219, 0.3));
  border-radius: 2px;
  animation: wave-bounce 1.8s ease-in-out infinite;
}

.wave-1 {
  height: 15px;
  animation-delay: 0s;
}

.wave-2 {
  height: 25px;
  animation-delay: 0.2s;
}

.wave-3 {
  height: 18px;
  animation-delay: 0.4s;
}

/* Animations */
@keyframes brain-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
}

@keyframes spark-float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  25% {
    transform: translate(5px, -5px) scale(1.2);
    opacity: 0.8;
  }
  50% {
    transform: translate(-3px, -8px) scale(0.8);
    opacity: 0.6;
  }
  75% {
    transform: translate(-5px, 3px) scale(1.1);
    opacity: 0.9;
  }
}

@keyframes neural-pulse {
  0%, 100% {
    opacity: 0.3;
    transform: scaleX(1);
  }
  50% {
    opacity: 0.8;
    transform: scaleX(1.1);
  }
}

@keyframes node-glow {
  0%, 100% {
    box-shadow: 0 0 5px rgba(46, 204, 113, 0.5);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 15px rgba(46, 204, 113, 0.8);
    transform: scale(1.3);
  }
}

@keyframes dot-bounce {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-10px);
  }
}

@keyframes wave-bounce {
  0%, 100% {
    transform: scaleY(0.5);
    opacity: 0.6;
  }
  50% {
    transform: scaleY(1);
    opacity: 1;
  }
}

.completion-section {
  background: var(--surface-primary, white);
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  padding: 30px;
}

.completion-header {
  text-align: center;
  margin-bottom: 30px;
}

.completion-icon {
  font-size: 3rem;
  color: #27ae60;
  margin-bottom: 16px;
}

.completion-header h3 {
  color: var(--text-primary, #2c3e50);
  margin-bottom: 8px;
}

.completion-header p {
  color: var(--text-secondary, #7f8c8d);
  margin: 0;
}

.synthesized-description {
  margin-bottom: 25px;
}

.synthesized-description label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary, #2c3e50);
}

.description-textarea {
  width: 100%;
  padding: 16px;
  border: 1px solid var(--border-primary, #ddd);
  border-radius: 8px;
  font-size: 1rem;
  line-height: 1.5;
  resize: vertical;
  background: var(--surface-primary, white);
  color: var(--text-primary, #2c3e50);
}

.description-textarea:focus {
  outline: none;
  border-color: var(--interactive-primary, #3498db);
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.char-count {
  text-align: right;
  font-size: 0.9rem;
  color: var(--text-secondary, #7f8c8d);
  margin-top: 4px;
}

.completion-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
}

.btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--interactive-primary, #3498db);
  color: white;
  border-color: var(--interactive-primary, #3498db);
}

.btn-primary:hover:not(:disabled) {
  background: #2980b9;
  border-color: #2980b9;
}

.btn-secondary {
  background: var(--surface-primary, white);
  color: var(--text-secondary, #7f8c8d);
  border-color: #bdc3c7;
}

.btn-secondary:hover {
  background: #ecf0f1;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .options-grid {
    grid-template-columns: 1fr;
  }

  .completion-actions {
    flex-direction: column-reverse;
  }

  .project-interview {
    padding: 15px;
  }

  .question-section,
  .completion-section {
    padding: 20px;
  }

  .loading-section {
    padding: 40px 15px;
  }

  /* Mobile AI Brain Animation */
  .ai-brain {
    width: 60px;
    height: 60px;
  }

  .brain-core {
    width: 30px;
    height: 30px;
  }

  .brain-pulse {
    width: 15px;
    height: 15px;
  }

  .brain-spark {
    width: 4px;
    height: 4px;
  }

  .neural-line {
    height: 1px;
  }

  .line-1 {
    width: 20px;
  }

  .line-2 {
    width: 18px;
  }

  .line-3 {
    width: 15px;
  }

  .neural-node {
    width: 6px;
    height: 6px;
  }

  .loading-text {
    font-size: 1rem;
  }

  .dot {
    font-size: 1.2rem;
  }

  .progress-wave {
    height: 20px;
  }

  .wave {
    width: 3px;
  }

  .wave-1 {
    height: 10px;
  }

  .wave-2 {
    height: 15px;
  }

  .wave-3 {
    height: 12px;
  }
}</style>