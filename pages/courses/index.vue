<template>
  <HomeContainer>
    <div class="courses-page">
      <div class="courses-header">
        <h1>课程列表</h1>
        <div class="search-filter-bar">
          <div class="search-box">
            <input
              type="text"
              v-model="searchQuery"
              placeholder="搜索课程..."
              @input="handleSearch"
            />
            <i class="fas fa-search"></i>
          </div>
          <div class="filter-box">
            <select v-model="sortBy" @change="handleSort">
              <option value="code">课程代码</option>
              <option value="name">课程名称</option>
              <option value="created_at">创建时间</option>
            </select>
            <select v-model="sortOrder" @change="handleSort">
              <option value="asc">升序</option>
              <option value="desc">降序</option>
            </select>
          </div>
        </div>
      </div>

      <div class="courses-grid" v-if="!isLoading">
        <NuxtLink 
          v-for="course in courses" 
          :key="course.id" 
          :to="`/courses/${course.id}`"
          class="course-card"
        >
          <div class="course-header">
            <h2 class="course-code">{{ course.code }}</h2>
            <span class="course-credits">{{ course.credits }} 学分</span>
          </div>
          <h3 class="course-name">{{ course.name }}</h3>
          <p class="course-description">
            {{ course.description || "暂无课程描述" }}
          </p>
          <div class="course-footer">
            <span class="instructor"
              >讲师: {{ course.instructor?.username || "未分配" }}</span
            >
            <span class="view-course-hint">
              点击查看课程详情
            </span>
          </div>
        </NuxtLink>
      </div>

      <div v-else class="loading-state">
        <i class="fas fa-spinner fa-spin"></i>
        <span>加载中...</span>
      </div>

      <div v-if="!isLoading && courses.length === 0" class="no-courses">
        <i class="fas fa-book"></i>
        <p>暂无课程</p>
      </div>
    </div>
  </HomeContainer>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useApi } from "~/composables/useApi";
import { useAuth } from "~/composables/useAuth";

interface Course {
  id: number;
  code: string;
  name: string;
  description: string;
  instructor_id: number | null;
  credits: number;
  capacity: number | null;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  instructor?: {
    id: number;
    username: string;
  };
}

const { fetchWithAuth, fetchPublic, getApiUrl } = useApi();
const { isLoggedIn } = useAuth();

const courses = ref<Course[]>([]);
const isLoading = ref(true);
const searchQuery = ref("");
const sortBy = ref("code");
const sortOrder = ref("asc");

// 防抖函数
const debounce = (fn: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

// 获取讲师信息
const fetchInstructorInfo = async (instructorId: number) => {
  try {
    const response = await fetchPublic(
      getApiUrl(`/users/public/${instructorId}`)
    );
    if (!response.ok) {
      throw new Error("Failed to fetch instructor info");
    }
    const data = await response.json();
    return {
      id: data.id,
      username: data.username,
    };
  } catch (error) {
    console.error("获取讲师信息失败:", error);
    return null;
  }
};

// 获取课程列表
const fetchCourses = async () => {
  try {
    isLoading.value = true;
    const queryParams = new URLSearchParams({
      q: searchQuery.value,
      sort_by: sortBy.value,
      sort_order: sortOrder.value,
    });

    const response = await fetchPublic(
      getApiUrl(`/courses?${queryParams.toString()}`)
    );
    if (!response.ok) {
      throw new Error("Failed to fetch courses");
    }
    const data = await response.json();

    // 获取所有课程的讲师信息
    const coursesWithInstructors = await Promise.all(
      data.map(async (course: Course) => {
        if (course.instructor_id) {
          const instructor = await fetchInstructorInfo(course.instructor_id);
          return { ...course, instructor };
        }
        return course;
      })
    );

    courses.value = coursesWithInstructors;
  } catch (error) {
    console.error("获取课程列表失败:", error);
  } finally {
    isLoading.value = false;
  }
};

// 使用防抖处理搜索
const handleSearch = debounce(() => {
  fetchCourses();
}, 300);

// 处理排序
const handleSort = () => {
  fetchCourses();
};

// 页面加载时获取课程列表
onMounted(() => {
  fetchCourses();
});
</script>

<style lang="scss" scoped>
.courses-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  
  // Mobile optimization
  @media (max-width: 768px) {
    padding: 1rem;
  }
  
  @media (max-width: 480px) {
    padding: 0.75rem;
  }
}

.courses-header {
  margin-bottom: 2rem;

  h1 {
    font-size: 2rem;
    color: #2c3e50;
    margin-bottom: 1.5rem;
    
    // Mobile optimization
    @media (max-width: 768px) {
      font-size: 1.75rem;
      margin-bottom: 1rem;
    }
    
    @media (max-width: 480px) {
      font-size: 1.5rem;
      margin-bottom: 0.75rem;
    }
  }
  
  // Mobile optimization
  @media (max-width: 768px) {
    margin-bottom: 1.5rem;
  }
  
  @media (max-width: 480px) {
    margin-bottom: 1rem;
  }
}

.search-filter-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }
  
  @media (max-width: 480px) {
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
}

.search-box {
  flex: 1;
  position: relative;
  min-width: 200px;

  input {
    width: 100%;
    padding: 0.75rem 1rem 0.75rem 2.5rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    font-size: 1rem;
    transition: all 0.3s ease;
    // Ensure touch-friendly input height
    min-height: 44px;
    box-sizing: border-box;

    &:focus {
      border-color: #3498db;
      box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
      outline: none;
    }
    
    // Mobile optimization
    @media (max-width: 480px) {
      font-size: 16px; // Prevent zoom on iOS
      padding: 0.875rem 1rem 0.875rem 2.5rem;
    }
  }

  i {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: #95a5a6;
    // Ensure touch target is large enough
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  // Mobile optimization
  @media (max-width: 768px) {
    min-width: 100%;
  }
}

.filter-box {
  display: flex;
  gap: 0.5rem;

  select {
    padding: 0.75rem 1rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    font-size: 1rem;
    background-color: white;
    cursor: pointer;
    transition: all 0.3s ease;
    // Ensure touch-friendly select height
    min-height: 44px;
    box-sizing: border-box;

    &:focus {
      border-color: #3498db;
      outline: none;
    }
    
    // Mobile optimization
    @media (max-width: 480px) {
      font-size: 16px; // Prevent zoom on iOS
      padding: 0.875rem 1rem;
    }
  }
  
  // Mobile optimization
  @media (max-width: 768px) {
    flex-direction: column;
    width: 100%;
    
    select {
      width: 100%;
    }
  }
  
  @media (max-width: 480px) {
    gap: 0.5rem;
  }
}

.courses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  
  // Mobile optimization - responsive grid
  @media (max-width: 1024px) {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.25rem;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr; // Single column on mobile
    gap: 0.75rem;
  }
}

.course-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  text-decoration: none;
  color: inherit;
  display: block;
  cursor: pointer;
  // Ensure minimum touch target size
  min-height: 44px;
  position: relative;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    text-decoration: none;
    color: inherit;
  }
  
  // Mobile optimization
  @media (max-width: 768px) {
    padding: 1.25rem;
    border-radius: 10px;
    
    // Adjust hover effect for mobile
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12);
    }
  }
  
  @media (max-width: 480px) {
    padding: 1rem;
    border-radius: 8px;
    
    // Remove hover transform on small screens to prevent layout issues
    &:hover {
      transform: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    }
    
    // Add active state for touch feedback
    &:active {
      transform: scale(0.98);
      transition: transform 0.1s ease;
    }
  }
}

.course-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  gap: 0.75rem;

  .course-code {
    font-size: 1.25rem;
    color: #2c3e50;
    margin: 0;
    flex: 1;
    min-width: 0; // Allow text to truncate
    
    // Mobile optimization
    @media (max-width: 768px) {
      font-size: 1.125rem;
    }
    
    @media (max-width: 480px) {
      font-size: 1rem;
    }
  }

  .course-credits {
    background: #e3f2fd;
    color: #1976d2;
    padding: 0.25rem 0.75rem;
    border-radius: 16px;
    font-size: 0.875rem;
    font-weight: 500;
    white-space: nowrap;
    flex-shrink: 0;
    
    // Mobile optimization
    @media (max-width: 480px) {
      font-size: 0.8125rem;
      padding: 0.25rem 0.5rem;
    }
  }
  
  // Mobile optimization
  @media (max-width: 480px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    
    .course-credits {
      align-self: flex-end;
    }
  }
}

.course-name {
  font-size: 1.125rem;
  color: #34495e;
  margin: 0 0 0.75rem 0;
  line-height: 1.4;
  
  // Mobile optimization
  @media (max-width: 768px) {
    font-size: 1.0625rem;
    margin-bottom: 0.625rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1rem;
    margin-bottom: 0.5rem;
    line-height: 1.3;
  }
}

.course-description {
  color: #666;
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.course-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  gap: 0.5rem;

  .instructor {
    color: #666;
    font-size: 0.875rem;
    flex: 1;
    min-width: 0; // Allow text to truncate
    
    // Mobile optimization
    @media (max-width: 480px) {
      font-size: 0.8125rem;
    }
  }

  .view-course-hint {
    color: #3498db;
    font-size: 0.875rem;
    font-weight: 500;
    opacity: 0.8;
    transition: opacity 0.3s ease;
    white-space: nowrap;
    flex-shrink: 0;
    
    // Mobile optimization
    @media (max-width: 480px) {
      font-size: 0.8125rem;
    }
  }
  
  // Mobile optimization
  @media (max-width: 480px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
    
    .view-course-hint {
      align-self: flex-end;
    }
  }
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #666;

  i {
    font-size: 2rem;
    margin-bottom: 1rem;
    color: #3498db;
  }
}

.no-courses {
  text-align: center;
  padding: 3rem;
  color: #666;

  i {
    font-size: 3rem;
    color: #95a5a6;
    margin-bottom: 1rem;
  }

  p {
    font-size: 1.125rem;
  }
}
</style>
