<template>
  <div class="thrust-selector">
    <!-- Selected Thrust Areas -->
    <div v-if="modelValue?.length" class="selected-tags">
      <div class="selected-label">已选择的研究方向:</div>
      <div class="tags-list">
        <span
          v-for="thrust in modelValue"
          :key="thrust"
          class="selected-tag"
          @click="removeThrust(thrust)"
        >
          {{ thrust }}
          <Icon name="x" class="remove-icon" />
        </span>
      </div>
    </div>

    <!-- Predefined Thrust Options -->
    <div class="predefined-section">
      <h4>选择研究方向 (可多选)</h4>
      <div class="thrust-categories">
        <!-- Computer Science & Engineering -->
        <div class="thrust-category">
          <h5>计算机科学与工程</h5>
          <div class="thrust-options">
            <button
              v-for="thrust in computerScienceThrusts"
              :key="thrust"
              :class="['thrust-option', { selected: isSelected(thrust), disabled: isDisabled(thrust) }]"
              @click="toggleThrust(thrust)"
              :disabled="isDisabled(thrust)"
            >
              {{ thrust }}
            </button>
          </div>
        </div>

        <!-- Data Science & AI -->
        <div class="thrust-category">
          <h5>数据科学与人工智能</h5>
          <div class="thrust-options">
            <button
              v-for="thrust in dataScienceThrusts"
              :key="thrust"
              :class="['thrust-option', { selected: isSelected(thrust), disabled: isDisabled(thrust) }]"
              @click="toggleThrust(thrust)"
              :disabled="isDisabled(thrust)"
            >
              {{ thrust }}
            </button>
          </div>
        </div>

        <!-- Robotics & Automation -->
        <div class="thrust-category">
          <h5>机器人与自动化</h5>
          <div class="thrust-options">
            <button
              v-for="thrust in roboticsThrusts"
              :key="thrust"
              :class="['thrust-option', { selected: isSelected(thrust), disabled: isDisabled(thrust) }]"
              @click="toggleThrust(thrust)"
              :disabled="isDisabled(thrust)"
            >
              {{ thrust }}
            </button>
          </div>
        </div>

        <!-- Internet of Things -->
        <div class="thrust-category">
          <h5>物联网</h5>
          <div class="thrust-options">
            <button
              v-for="thrust in iotThrusts"
              :key="thrust"
              :class="['thrust-option', { selected: isSelected(thrust), disabled: isDisabled(thrust) }]"
              @click="toggleThrust(thrust)"
              :disabled="isDisabled(thrust)"
            >
              {{ thrust }}
            </button>
          </div>
        </div>

        <!-- Microelectronics -->
        <div class="thrust-category">
          <h5>微电子</h5>
          <div class="thrust-options">
            <button
              v-for="thrust in microelectronicsThrusts"
              :key="thrust"
              :class="['thrust-option', { selected: isSelected(thrust), disabled: isDisabled(thrust) }]"
              @click="toggleThrust(thrust)"
              :disabled="isDisabled(thrust)"
            >
              {{ thrust }}
            </button>
          </div>
        </div>

        <!-- Advanced Materials -->
        <div class="thrust-category">
          <h5>先进材料</h5>
          <div class="thrust-options">
            <button
              v-for="thrust in materialsThrusts"
              :key="thrust"
              :class="['thrust-option', { selected: isSelected(thrust), disabled: isDisabled(thrust) }]"
              @click="toggleThrust(thrust)"
              :disabled="isDisabled(thrust)"
            >
              {{ thrust }}
            </button>
          </div>
        </div>

        <!-- Sustainable Energy -->
        <div class="thrust-category">
          <h5>可持续能源</h5>
          <div class="thrust-options">
            <button
              v-for="thrust in energyThrusts"
              :key="thrust"
              :class="['thrust-option', { selected: isSelected(thrust), disabled: isDisabled(thrust) }]"
              @click="toggleThrust(thrust)"
              :disabled="isDisabled(thrust)"
            >
              {{ thrust }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Custom Input -->
    <div class="custom-input-section">
      <h4>添加自定义研究方向</h4>
      <div class="input-group">
        <input
          v-model="customThrust"
          type="text"
          placeholder="输入自定义研究方向..."
          class="custom-input"
          @keyup.enter="addCustomThrust"
          maxlength="50"
        />
        <button
          @click="addCustomThrust"
          class="add-btn"
          :disabled="!canAddCustom"
        >
          <Icon name="plus" />
          添加
        </button>
      </div>
      <div class="input-help">
        最多可选择 {{ maxSelections }} 个研究方向
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Props
const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  maxSelections: {
    type: Number,
    default: 8
  }
})

// Emits
const emit = defineEmits(['update:modelValue'])

// State
const customThrust = ref('')

// Predefined thrust areas (based on HKUST-GZ research focus)
const computerScienceThrusts = [
  '人工智能',
  '机器学习',
  '深度学习',
  '计算机视觉',
  '自然语言处理',
  '软件工程',
  '分布式系统',
  '云计算',
  '区块链',
  '网络安全',
  '数据库系统',
  '人机交互'
]

const dataScienceThrusts = [
  '大数据分析',
  '数据挖掘',
  '机器学习算法',
  '统计学习',
  '预测建模',
  '数据可视化',
  '商业智能',
  '推荐系统',
  '时间序列分析',
  '优化算法'
]

const roboticsThrusts = [
  '移动机器人',
  '工业机器人',
  '服务机器人',
  '自主导航',
  '机器人控制',
  '传感器融合',
  '运动规划',
  '机器人视觉',
  '人机协作',
  '无人驾驶'
]

const iotThrusts = [
  '智慧城市',
  '智能家居',
  '工业物联网',
  '边缘计算',
  '传感器网络',
  '无线通信',
  '嵌入式系统',
  '物联网安全',
  '协议设计',
  '设备管理'
]

const microelectronicsThrusts = [
  '集成电路设计',
  '半导体器件',
  '芯片制造',
  '模拟电路',
  '数字电路',
  '射频电路',
  '功率电子',
  '光电子学',
  '纳米电子学',
  '量子电子学'
]

const materialsThrusts = [
  '纳米材料',
  '智能材料',
  '生物材料',
  '复合材料',
  '超导材料',
  '光电材料',
  '储能材料',
  '催化材料',
  '功能材料',
  '材料表征'
]

const energyThrusts = [
  '太阳能',
  '风能',
  '储能技术',
  '智能电网',
  '燃料电池',
  '电池技术',
  '能源管理',
  '绿色建筑',
  '碳捕获',
  '可再生能源'
]

// Computed
const canAddCustom = computed(() => {
  return customThrust.value.trim().length > 0 &&
         props.modelValue.length < props.maxSelections &&
         !isSelected(customThrust.value.trim())
})

// Methods
const isSelected = (thrust) => {
  return props.modelValue.includes(thrust)
}

const isDisabled = (thrust) => {
  return !isSelected(thrust) && props.modelValue.length >= props.maxSelections
}

const toggleThrust = (thrust) => {
  if (isDisabled(thrust)) return

  const currentValues = [...props.modelValue]
  const index = currentValues.indexOf(thrust)

  if (index > -1) {
    // Remove thrust
    currentValues.splice(index, 1)
  } else {
    // Add thrust (if under limit)
    if (currentValues.length < props.maxSelections) {
      currentValues.push(thrust)
    }
  }

  emit('update:modelValue', currentValues)
}

const removeThrust = (thrust) => {
  const currentValues = [...props.modelValue]
  const index = currentValues.indexOf(thrust)
  if (index > -1) {
    currentValues.splice(index, 1)
    emit('update:modelValue', currentValues)
  }
}

const addCustomThrust = () => {
  if (!canAddCustom.value) return

  const thrust = customThrust.value.trim()
  if (thrust && !isSelected(thrust)) {
    const currentValues = [...props.modelValue, thrust]
    emit('update:modelValue', currentValues)
    customThrust.value = ''
  }
}
</script>

<style scoped>
.thrust-selector {
  width: 100%;
}

.selected-tags {
  margin-bottom: 24px;
  padding: 16px;
  background: var(--surface-secondary, #f8f9fa);
  border-radius: 8px;
}

.selected-label {
  font-weight: 500;
  color: var(--text-primary, #2c3e50);
  margin-bottom: 12px;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.selected-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--accent-primary, #3498db);
  color: white;
  border-radius: 20px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.selected-tag:hover {
  background: var(--accent-secondary, #2980b9);
}

.remove-icon {
  font-size: 0.8rem;
  font-weight: bold;
}

.predefined-section h4, .custom-input-section h4 {
  margin: 0 0 16px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary, #2c3e50);
}

.thrust-categories {
  display: grid;
  gap: 24px;
}

.thrust-category {
  border: 1px solid var(--border-primary, #e9ecef);
  border-radius: 8px;
  padding: 16px;
  background: var(--surface-primary, white);
}

.thrust-category h5 {
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--accent-primary, #3498db);
  border-bottom: 1px solid var(--border-primary, #e9ecef);
  padding-bottom: 8px;
}

.thrust-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.thrust-option {
  padding: 8px 16px;
  border: 1px solid var(--border-primary, #e9ecef);
  border-radius: 20px;
  background: var(--surface-primary, white);
  color: var(--text-secondary, #7f8c8d);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.thrust-option:hover:not(.disabled) {
  border-color: var(--accent-primary, #3498db);
  color: var(--accent-primary, #3498db);
}

.thrust-option.selected {
  background: var(--accent-primary, #3498db);
  color: white;
  border-color: var(--accent-primary, #3498db);
}

.thrust-option.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.custom-input-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--border-primary, #e9ecef);
}

.input-group {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.custom-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid var(--border-primary, #e9ecef);
  border-radius: 8px;
  font-size: 1rem;
  background: var(--surface-primary, white);
  color: var(--text-primary, #2c3e50);
}

.custom-input:focus {
  outline: none;
  border-color: var(--accent-primary, #3498db);
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.add-btn {
  padding: 12px 16px;
  background: var(--accent-primary, #3498db);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.2s ease;
}

.add-btn:hover:not(:disabled) {
  background: var(--accent-secondary, #2980b9);
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-help {
  font-size: 0.85rem;
  color: var(--text-secondary, #7f8c8d);
}

@media (max-width: 768px) {
  .thrust-categories {
    gap: 16px;
  }

  .thrust-category {
    padding: 12px;
  }

  .thrust-options {
    gap: 6px;
  }

  .thrust-option {
    padding: 6px 12px;
    font-size: 0.85rem;
  }

  .input-group {
    flex-direction: column;
    gap: 8px;
  }

  .add-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>