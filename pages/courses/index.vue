<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useApi } from "~/composables/useApi";
import { useAuth } from "~/composables/useAuth";
import type { CourseOffering } from "~/utils/courseOffering";
import { getSingleQueryValue } from "~/utils/courseOffering";

definePageMeta({ layout: 'keguang' });

const route = useRoute();
const router = useRouter();

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
  instructor?: { id: number; username: string };
}

const { fetchWithAuth, fetchPublic, getApiUrl } = useApi();
const { isLoggedIn } = useAuth();

const courses = ref<Course[]>([]);
const isLoading = ref(true);
const searchQuery = ref("");
const sortBy = ref("code");
const sortOrder = ref("asc");
const selectedSemester = ref("");
const selectedCourseType = ref("AIAA");
const selectedStage = ref("UG");
const availableSemesters = ref<CourseOffering[]>([]);
const availableCourseTypes = ref<any[]>([]);

// Extract course number from code like "AIAA 1010" -> 1010
const getCourseNumber = (code: string): number => {
  const parts = code.split(/\s+/);
  if (parts.length >= 2) {
    const num = parseInt(parts[1]);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

// Filter courses by stage (UG/PG) on frontend
const filteredCourses = computed(() => {
  if (!selectedStage.value) return courses.value;
  return courses.value.filter(course => {
    const num = getCourseNumber(course.code);
    if (selectedStage.value === 'UG') return num >= 1000 && num <= 4999;
    if (selectedStage.value === 'PG') return num >= 5000;
    return true;
  });
});

const debounce = (fn: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

/** 供列表页与进入详情页链接使用，返回后恢复筛选 */
const buildListQuery = (): Record<string, string> => {
  const q: Record<string, string> = {};
  if (selectedCourseType.value) q.course_type = selectedCourseType.value;
  if (selectedSemester.value) q.semester = selectedSemester.value;
  if (selectedStage.value) q.stage = selectedStage.value;
  else q.stage = "all";
  const sq = searchQuery.value.trim();
  if (sq) q.q = sq;
  return q;
};

const courseListReturnQuery = computed(() => buildListQuery());
const selectedOfferingTag = computed(() => (
  availableSemesters.value.find((semester) => semester.code === selectedSemester.value)?.offering_tag || ""
));

const syncRouteQuery = () => {
  router.replace({ path: route.path, query: buildListQuery() });
};

const fetchInstructorInfo = async (instructorId: number) => {
  try {
    const response = await fetchPublic(getApiUrl(`/api/users/public/${instructorId}`));
    if (!response.ok) throw new Error("Failed to fetch instructor info");
    const data = await response.json();
    return { id: data.id, username: data.username };
  } catch (error) {
    return null;
  }
};

const fetchCourses = async () => {
  try {
    isLoading.value = true;
    const queryParams = new URLSearchParams({ q: searchQuery.value, sort_by: sortBy.value, sort_order: sortOrder.value });
    if (selectedSemester.value) queryParams.append('semester', selectedSemester.value);
    if (selectedCourseType.value) queryParams.append('course_type', selectedCourseType.value);
    const response = await fetchPublic(getApiUrl(`/api/courses?${queryParams.toString()}`));
    if (!response.ok) throw new Error("Failed to fetch courses");
    const data = await response.json();
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

const fetchFiltersData = async () => {
  try {
    const response = await fetchPublic(getApiUrl('/api/courses/filters'));
    if (response.ok) {
      const data = await response.json();
      availableSemesters.value = data.semesters || [];
      availableCourseTypes.value = data.course_types || [];

      const rq = route.query;
      const courseTypeFromRoute = getSingleQueryValue(rq.course_type);
      const semesterFromRoute = getSingleQueryValue(rq.semester);
      const stageFromRoute = getSingleQueryValue(rq.stage);
      const qFromRoute = getSingleQueryValue(rq.q);

      if (availableSemesters.value.length > 0) {
        if (
          semesterFromRoute &&
          availableSemesters.value.some((s: any) => s.code === semesterFromRoute)
        ) {
          selectedSemester.value = semesterFromRoute;
        } else {
          selectedSemester.value = availableSemesters.value[0].code;
        }
      }

      if (availableCourseTypes.value.length > 0) {
        if (
          courseTypeFromRoute &&
          availableCourseTypes.value.some((t: any) => t.code === courseTypeFromRoute)
        ) {
          selectedCourseType.value = courseTypeFromRoute;
        } else {
          const hasAIAA = availableCourseTypes.value.some((t: any) => t.code === "AIAA");
          selectedCourseType.value = hasAIAA ? "AIAA" : availableCourseTypes.value[0].code;
        }
      }

      if (typeof qFromRoute === "string") searchQuery.value = qFromRoute;

      if (stageFromRoute === "all" || stageFromRoute === "") selectedStage.value = "";
      else if (stageFromRoute === "UG" || stageFromRoute === "PG") selectedStage.value = stageFromRoute;

      fetchCourses();
      return;
    }
  } catch (error) {
    console.error('获取筛选数据失败:', error);
  }
  fetchCourses();
};

const selectCourseType = (code: string) => {
  selectedCourseType.value = code;
  syncRouteQuery();
  fetchCourses();
};

const handleFilterChange = () => {
  syncRouteQuery();
  fetchCourses();
};
const handleSearch = debounce(() => {
  syncRouteQuery();
  fetchCourses();
}, 300);

onMounted(() => { fetchFiltersData(); });
</script>

<template>
  <div class="kg-courses">
    <div class="kg-courses-header">
      <h1 class="kg-page-title">课程评价</h1>
      <p class="kg-page-subtitle">查看并分享课程体验</p>
    </div>

    <div class="kg-card kg-filters">
      <input
        v-model="searchQuery"
        class="kg-search-input"
        type="text"
        placeholder="搜索课程名称或代码..."
        @input="handleSearch"
      />
      <div class="kg-filter-row">
        <div class="kg-filter-group">
          <label class="kg-filter-label">学期</label>
          <div class="kg-filter-options">
            <button
              v-for="sem in availableSemesters"
              :key="sem.code"
              :class="['kg-filter-btn', { active: selectedSemester === sem.code }]"
              @click="selectedSemester = sem.code; handleFilterChange()"
            >
              {{ sem.display_name }}
            </button>
          </div>
        </div>
        <div class="kg-filter-group">
          <label class="kg-filter-label">阶段</label>
          <div class="kg-filter-options">
            <button
              :class="['kg-filter-btn', { active: selectedStage === '' }]"
              @click="selectedStage = ''; handleFilterChange()"
            >
              全部
            </button>
            <button
              :class="['kg-filter-btn', { active: selectedStage === 'UG' }]"
              @click="selectedStage = 'UG'; handleFilterChange()"
            >
              本科 (UG)
            </button>
            <button
              :class="['kg-filter-btn', { active: selectedStage === 'PG' }]"
              @click="selectedStage = 'PG'; handleFilterChange()"
            >
              研究生 (PG)
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Course Type Letter Navigation -->
    <div class="kg-card kg-course-types">
      <div class="kg-course-types-label">课程类型:</div>
      <div class="kg-course-types-list">
        <button
          v-for="type in availableCourseTypes"
          :key="type.code"
          :class="['kg-type-chip', { active: selectedCourseType === type.code }]"
          @click="selectCourseType(type.code)"
        >
          {{ type.code }}
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="kg-loading">
      <div class="kg-spinner"></div>
      <span>加载中...</span>
    </div>

    <div v-else-if="filteredCourses.length === 0" class="kg-empty">
      <div class="kg-empty-icon">📚</div>
      <p>暂无课程数据</p>
    </div>

    <div v-else class="kg-course-grid">
      <NuxtLink
        v-for="course in filteredCourses"
        :key="course.id"
        :to="{
          path: selectedOfferingTag ? `/courses/${course.id}/offerings/${selectedOfferingTag}` : `/courses/${course.id}`,
          query: courseListReturnQuery,
        }"
        class="kg-course-card"
      >
        <div class="kg-course-card__top">
          <span class="kg-course-code">{{ course.code }}</span>
          <span class="kg-course-credits">{{ course.credits }} 学分</span>
        </div>
        <h3 class="kg-course-name">{{ course.name }}</h3>
        <p class="kg-course-desc">{{ course.description?.slice(0, 80) }}{{ course.description?.length > 80 ? '...' : '' }}</p>
        <div class="kg-course-card__footer">
          <span v-if="course.instructor" class="kg-course-instructor">
            <i class="fas fa-chalkboard-teacher"></i> {{ course.instructor.username }}
          </span>
          <span :class="['kg-course-status', course.is_active ? 'active' : 'inactive']">
            {{ course.is_active ? '进行中' : '已结束' }}
          </span>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.kg-courses {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 20px 60px;
}

.kg-courses-header {
  margin-bottom: 24px;
}

.kg-page-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: #1a2a4a;
  margin: 0 0 4px;
}

.kg-page-subtitle {
  font-size: 0.9rem;
  color: #4a6080;
  margin: 0;
}

.kg-card {
  background: #F5FBFE;
  border: 1.5px solid #c8dff8;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(40, 57, 101, 0.06);
}

.kg-filters {
  padding: 16px 20px;
  margin-bottom: 12px;
}

.kg-search-input {
  width: 100%;
  padding: 10px 16px;
  border: 1.5px solid #c8dff8;
  border-radius: 12px;
  background: #fff;
  color: #1a2a4a;
  font-size: 0.9rem;
  outline: none;
  margin-bottom: 12px;
  box-sizing: border-box;
  transition: border-color 0.2s;
  &:focus { border-color: #26a4ff; }
  &::placeholder { color: #9ab0c6; }
}

.kg-filter-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.kg-filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.kg-filter-label {
  font-size: 0.84rem;
  color: #4a6080;
  font-weight: 500;
  white-space: nowrap;
  min-width: 32px;
}

.kg-filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.kg-filter-btn {
  padding: 5px 14px;
  border: 1.5px solid #c8dff8;
  border-radius: 10px;
  background: #fff;
  color: #4a6080;
  font-size: 0.83rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    border-color: #26a4ff;
    color: #26a4ff;
  }

  &.active {
    background: #26a4ff;
    border-color: #26a4ff;
    color: #fff;
  }
}

// Course type letter navigation
.kg-course-types {
  padding: 14px 20px;
  margin-bottom: 20px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.kg-course-types-label {
  font-size: 0.85rem;
  color: #4a6080;
  font-weight: 500;
  white-space: nowrap;
  padding-top: 5px;
}

.kg-course-types-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.kg-type-chip {
  padding: 5px 14px;
  border: 1.5px solid #c8dff8;
  border-radius: 10px;
  background: #fff;
  color: #4a6080;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    border-color: #26a4ff;
    color: #26a4ff;
  }

  &.active {
    background: #26a4ff;
    border-color: #26a4ff;
    color: #fff;
  }
}

.kg-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px;
  color: #4a6080;
}

.kg-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #c8dff8;
  border-top-color: #26a4ff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.kg-empty {
  text-align: center;
  padding: 60px 20px;
  color: #4a6080;
  .kg-empty-icon { font-size: 3rem; margin-bottom: 12px; }
  p { font-size: 1rem; margin: 0; }
}

.kg-course-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.kg-course-card {
  display: flex;
  flex-direction: column;
  background: #F5FBFE;
  border: 1.5px solid #c8dff8;
  border-radius: 16px;
  padding: 20px;
  text-decoration: none;
  box-shadow: 0 2px 12px rgba(40, 57, 101, 0.06);
  transition: box-shadow 0.2s, border-color 0.2s, transform 0.15s;
  &:hover {
    box-shadow: 0 4px 20px rgba(40, 57, 101, 0.12);
    border-color: #26a4ff;
    transform: translateY(-2px);
  }
}

.kg-course-card__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.kg-course-code {
  font-size: 0.8rem;
  font-weight: 700;
  color: #26a4ff;
  background: rgba(38, 164, 255, 0.1);
  border-radius: 6px;
  padding: 2px 8px;
}

.kg-course-credits {
  font-size: 0.78rem;
  color: #9ab0c6;
}

.kg-course-name {
  font-size: 1rem;
  font-weight: 600;
  color: #1a2a4a;
  margin: 0 0 8px;
  line-height: 1.4;
}

.kg-course-desc {
  font-size: 0.83rem;
  color: #4a6080;
  line-height: 1.6;
  margin: 0 0 auto;
  padding-bottom: 12px;
  flex: 1;
}

.kg-course-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #e8f4fd;
  padding-top: 10px;
  margin-top: 4px;
}

.kg-course-instructor {
  font-size: 0.8rem;
  color: #6a85a0;
  display: flex;
  align-items: center;
  gap: 5px;
}

.kg-course-status {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 10px;
  &.active { background: rgba(38, 220, 120, 0.12); color: #1a9a55; }
  &.inactive { background: rgba(160, 160, 160, 0.12); color: #888; }
}
</style>
