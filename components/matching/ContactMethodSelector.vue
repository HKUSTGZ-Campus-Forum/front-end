<template>
  <div class="contact-method-selector">
    <h4>{{ t("matching.contact.title") }}</h4>
    <p class="description">{{ t("matching.contact.description") }}</p>

    <div class="contact-methods">
      <div
        v-for="method in contactMethodOptions"
        :key="method.key"
        class="contact-method"
      >
        <div class="method-header">
          <div class="method-info">
            <Icon :name="method.icon" class="method-icon" />
            <div class="method-details">
              <div class="method-name">{{ t(method.nameKey) }}</div>
              <div class="method-desc">{{ t(method.descriptionKey) }}</div>
            </div>
          </div>
          <label class="toggle">
            <input
              type="checkbox"
              :checked="isMethodEnabled(method.key)"
              @change="toggleMethod(method.key, $event.target.checked)"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div v-if="isMethodEnabled(method.key)" class="method-input">
          <input
            v-model="contactValues[method.key]"
            :type="method.inputType"
            :placeholder="t(method.placeholderKey)"
            class="contact-input"
            @blur="updateContactValue(method.key)"
          />
        </div>
      </div>
    </div>

    <div class="privacy-notice">
      <Icon name="shield" class="privacy-icon" />
      <div class="privacy-text">
        <strong>{{ t("matching.contact.privacyTitle") }}</strong> <br />
        {{ t("matching.contact.privacyBody") }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";

const { t } = useI18n();

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["update:modelValue"]);

const contactMethodOptions = [
  {
    key: "email",
    icon: "mail",
    inputType: "email",
    nameKey: "matching.contact.methods.email.name",
    descriptionKey: "matching.contact.methods.email.description",
    placeholderKey: "matching.contact.methods.email.placeholder",
  },
  {
    key: "wechat",
    icon: "message-square",
    inputType: "text",
    nameKey: "matching.contact.methods.wechat.name",
    descriptionKey: "matching.contact.methods.wechat.description",
    placeholderKey: "matching.contact.methods.wechat.placeholder",
  },
  {
    key: "qq",
    icon: "message-circle",
    inputType: "text",
    nameKey: "matching.contact.methods.qq.name",
    descriptionKey: "matching.contact.methods.qq.description",
    placeholderKey: "matching.contact.methods.qq.placeholder",
  },
  {
    key: "telegram",
    icon: "send",
    inputType: "text",
    nameKey: "matching.contact.methods.telegram.name",
    descriptionKey: "matching.contact.methods.telegram.description",
    placeholderKey: "matching.contact.methods.telegram.placeholder",
  },
  {
    key: "discord",
    icon: "hash",
    inputType: "text",
    nameKey: "matching.contact.methods.discord.name",
    descriptionKey: "matching.contact.methods.discord.description",
    placeholderKey: "matching.contact.methods.discord.placeholder",
  },
  {
    key: "phone",
    icon: "phone",
    inputType: "tel",
    nameKey: "matching.contact.methods.phone.name",
    descriptionKey: "matching.contact.methods.phone.description",
    placeholderKey: "matching.contact.methods.phone.placeholder",
  },
];

const contactValues = ref({
  email: "",
  wechat: "",
  qq: "",
  telegram: "",
  discord: "",
  phone: "",
});

const initializeFromProps = () => {
  const nextValues = {
    email: "",
    wechat: "",
    qq: "",
    telegram: "",
    discord: "",
    phone: "",
  };

  if (props.modelValue?.length) {
    props.modelValue.forEach((contact) => {
      if (contact.method && contact.value && contact.method in nextValues) {
        nextValues[contact.method] = contact.value;
      }
    });
  }

  contactValues.value = nextValues;
};

initializeFromProps();

watch(() => props.modelValue, initializeFromProps, { deep: true });

const isMethodEnabled = (method) => {
  return props.modelValue.some((contact) => contact.method === method);
};

const toggleMethod = (method, enabled) => {
  const currentMethods = [...props.modelValue];

  if (enabled) {
    if (!currentMethods.some((contact) => contact.method === method)) {
      currentMethods.push({
        method,
        value: contactValues.value[method] || "",
      });
    }
  } else {
    const index = currentMethods.findIndex((contact) => contact.method === method);
    if (index > -1) {
      currentMethods.splice(index, 1);
    }
    contactValues.value[method] = "";
  }

  emit("update:modelValue", currentMethods);
};

const updateContactValue = (method) => {
  const currentMethods = [...props.modelValue];
  const index = currentMethods.findIndex((contact) => contact.method === method);

  if (index > -1) {
    currentMethods[index].value = contactValues.value[method] || "";
    emit("update:modelValue", currentMethods);
  }
};
</script>

<style scoped>
.contact-method-selector h4 {
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary, #2c3e50);
}

.description {
  margin: 0 0 20px 0;
  color: var(--text-secondary, #7f8c8d);
  font-size: 0.9rem;
  line-height: 1.4;
}

.contact-methods {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.contact-method {
  border: 1px solid var(--border-primary, #e9ecef);
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface-primary, white);
}

.method-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
}

.method-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.method-icon {
  width: 20px;
  height: 20px;
  color: var(--accent-primary, #3498db);
}

.method-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.method-name {
  font-weight: 500;
  color: var(--text-primary, #2c3e50);
}

.method-desc {
  font-size: 0.85rem;
  color: var(--text-secondary, #7f8c8d);
}

.toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border-primary, #ccc);
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.toggle input:checked + .toggle-slider {
  background-color: var(--accent-primary, #3498db);
}

.toggle input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

.method-input {
  padding: 0 16px 16px 16px;
  border-top: 1px solid var(--border-primary, #f0f0f0);
  background: var(--surface-secondary, #f8f9fa);
}

.contact-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border-primary, #e9ecef);
  border-radius: 6px;
  font-size: 0.9rem;
  background: var(--surface-primary, white);
  color: var(--text-primary, #2c3e50);
  margin-top: 12px;
}

.contact-input:focus {
  outline: none;
  border-color: var(--accent-primary, #3498db);
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.contact-input::placeholder {
  color: var(--text-secondary, #95a5a6);
}

.privacy-notice {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  margin-top: 20px;
}

.privacy-icon {
  width: 20px;
  height: 20px;
  color: var(--accent-primary, #3498db);
  margin-top: 2px;
  flex-shrink: 0;
}

.privacy-text {
  font-size: 0.85rem;
  line-height: 1.4;
  color: var(--text-secondary, #7f8c8d);
}

.privacy-text strong {
  color: var(--text-primary, #2c3e50);
}

@media (max-width: 768px) {
  .method-header {
    padding: 12px;
  }

  .method-input {
    padding: 0 12px 12px 12px;
  }

  .privacy-notice {
    padding: 12px;
  }

  .contact-input {
    font-size: 0.85rem;
  }
}
</style>
