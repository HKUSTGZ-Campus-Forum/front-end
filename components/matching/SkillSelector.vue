<template>
  <div class="skill-selector">
    <!-- Input for new skills -->
    <div class="input-container">
      <input
        v-model="inputValue"
        @keydown="handleKeyDown"
        @input="handleInput"
        :placeholder="placeholder"
        class="skill-input"
        type="text"
      />
      <div v-if="filteredSuggestions.length" class="suggestions-dropdown">
        <div
          v-for="(suggestion, index) in filteredSuggestions.slice(0, 8)"
          :key="suggestion"
          @click="addSkill(suggestion)"
          :class="['suggestion-item', { active: index === selectedIndex }]"
        >
          {{ suggestion }}
        </div>
      </div>
    </div>

    <!-- Popular tags (if enabled) -->
    <div
      v-if="showPopularTags && availablePopularTags.length"
      class="popular-tags"
    >
      <div class="popular-label">Popular:</div>
      <div class="popular-list">
        <button
          v-for="tag in availablePopularTags.slice(0, 6)"
          :key="tag"
          @click="addSkill(tag)"
          class="popular-tag"
          type="button"
        >
          {{ tag }}
        </button>
      </div>
    </div>

    <!-- Selected skills -->
    <div v-if="modelValue?.length" class="selected-skills">
      <div
        v-for="skill in modelValue"
        :key="skill"
        class="skill-tag"
      >
        <span class="skill-name">{{ skill }}</span>
        <button
          @click="removeSkill(skill)"
          class="remove-btn"
          type="button"
          :title="`Remove ${skill}`"
        >
          ×
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

// Props
const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  placeholder: {
    type: String,
    default: 'Add skills...'
  },
  suggestions: {
    type: Array,
    default: () => []
  },
  popularTags: {
    type: Array,
    default: () => []
  },
  showPopularTags: {
    type: Boolean,
    default: false
  },
  maxSkills: {
    type: Number,
    default: 20
  }
})

// Emits
const emit = defineEmits(['update:modelValue'])

// Reactive data
const inputValue = ref('')
const selectedIndex = ref(-1)
const showSuggestions = ref(false)

// Computed
const filteredSuggestions = computed(() => {
  if (!inputValue.value.trim()) return []

  const input = inputValue.value.toLowerCase().trim()
  const currentSkills = (props.modelValue || []).map(skill => skill.toLowerCase())

  return props.suggestions.filter(suggestion => {
    const suggestionLower = suggestion.toLowerCase()
    return suggestionLower.includes(input) &&
           !currentSkills.includes(suggestionLower)
  }).sort((a, b) => {
    // Prioritize exact matches and prefix matches
    const aLower = a.toLowerCase()
    const bLower = b.toLowerCase()

    if (aLower.startsWith(input) && !bLower.startsWith(input)) return -1
    if (!aLower.startsWith(input) && bLower.startsWith(input)) return 1

    return a.localeCompare(b)
  })
})

// Popular tags that haven't been selected yet
const availablePopularTags = computed(() => {
  if (!props.popularTags?.length) return []

  const currentSkills = (props.modelValue || []).map(skill => skill.toLowerCase())

  return props.popularTags.filter(tag => {
    const tagLower = tag.toLowerCase()
    return !currentSkills.includes(tagLower)
  })
})

// Methods
const addSkill = (skill) => {
  const trimmedSkill = skill.trim()

  if (!trimmedSkill) return
  if (props.modelValue && props.modelValue.length >= props.maxSkills) return

  const currentSkills = props.modelValue || []
  const skillLower = trimmedSkill.toLowerCase()

  // Check if skill already exists (case-insensitive)
  const exists = currentSkills.some(existing =>
    existing.toLowerCase() === skillLower
  )

  if (!exists) {
    const newSkills = [...currentSkills, trimmedSkill]
    emit('update:modelValue', newSkills)
  }

  // Clear input and reset selection
  inputValue.value = ''
  selectedIndex.value = -1
  showSuggestions.value = false
}

const removeSkill = (skillToRemove) => {
  const currentSkills = props.modelValue || []
  const newSkills = currentSkills.filter(skill => skill !== skillToRemove)
  emit('update:modelValue', newSkills)
}

const handleKeyDown = (event) => {
  const suggestions = filteredSuggestions.value

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, suggestions.length - 1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, -1)
  } else if (event.key === 'Enter') {
    event.preventDefault()

    if (selectedIndex.value >= 0 && suggestions[selectedIndex.value]) {
      addSkill(suggestions[selectedIndex.value])
    } else if (inputValue.value.trim()) {
      addSkill(inputValue.value.trim())
    }
  } else if (event.key === 'Escape') {
    inputValue.value = ''
    selectedIndex.value = -1
    showSuggestions.value = false
  } else if (event.key === 'Tab') {
    // Allow tab to work normally, but if there's a selected suggestion, use it
    if (selectedIndex.value >= 0 && suggestions[selectedIndex.value]) {
      event.preventDefault()
      addSkill(suggestions[selectedIndex.value])
    }
  }
}

const handleInput = (event) => {
  inputValue.value = event.target.value
  selectedIndex.value = -1
  showSuggestions.value = !!event.target.value.trim()
}

// Watch for input changes to show/hide suggestions
watch(inputValue, (newValue) => {
  showSuggestions.value = !!newValue.trim()
  selectedIndex.value = -1
})
</script>

<style scoped>
.skill-selector {
  position: relative;
}

.input-container {
  position: relative;
}

.skill-input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-primary, #ddd);
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.skill-input:focus {
  outline: none;
  border-color: var(--interactive-primary, #3498db);
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--surface-primary, white);
  border: 1px solid var(--border-primary, #ddd);
  border-top: none;
  border-radius: 0 0 8px 8px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.suggestion-item {
  padding: 12px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  border-bottom: 1px solid #f0f0f0;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover,
.suggestion-item.active {
  background-color: #f8f9fa;
}

.suggestion-item.active {
  background-color: #e3f2fd;
  color: #1976d2;
}

.popular-tags {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.popular-label {
  font-size: 0.9rem;
  color: var(--text-secondary, #7f8c8d);
  font-weight: 500;
  flex-shrink: 0;
}

.popular-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.popular-tag {
  padding: 6px 12px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 20px;
  font-size: 0.85rem;
  color: var(--text-secondary, #7f8c8d);
  cursor: pointer;
  transition: all 0.2s ease;
}

.popular-tag:hover {
  background: #e3f2fd;
  border-color: #3498db;
  color: #1976d2;
}

.selected-skills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.skill-tag {
  display: flex;
  align-items: center;
  background: #e3f2fd;
  color: #1976d2;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
  gap: 8px;
  transition: all 0.2s ease;
}

.skill-tag:hover {
  background: #bbdefb;
}

.skill-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-btn {
  background: none;
  border: none;
  color: #1976d2;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  padding: 0;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
  line-height: 1;
}

.remove-btn:hover {
  background: rgba(25, 118, 210, 0.1);
  color: #d32f2f;
}

@media (max-width: 768px) {
  .popular-tags {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .selected-skills {
    gap: 6px;
  }

  .skill-tag {
    font-size: 0.85rem;
    padding: 5px 10px;
  }

  .skill-name {
    max-width: 100px;
  }
}
</style>