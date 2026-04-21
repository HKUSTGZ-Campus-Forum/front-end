import { computed } from "vue";
import { useI18n } from "#imports";

type SemesterCode = "spring" | "summer" | "fall" | "winter";

const SEMESTER_KEYS: Record<SemesterCode, string> = {
  spring: "courses.semester.spring",
  summer: "courses.semester.summer",
  fall: "courses.semester.fall",
  winter: "courses.semester.winter",
};

export function useSemesterDisplay() {
  const { locale, t } = useI18n();

  const formatAcademicYearSemester = (
    year: string | number,
    semesterCode: SemesterCode | string
  ) => {
    const startYear = Number(year);
    if (!Number.isFinite(startYear)) return String(year);

    const seasonKey = SEMESTER_KEYS[semesterCode as SemesterCode];
    const seasonLabel = seasonKey ? t(seasonKey) : semesterCode;
    const yy0 = String(startYear % 100).padStart(2, "0");
    const yy1 = String((startYear + 1) % 100).padStart(2, "0");

    return locale.value === "en"
      ? `${yy0}-${yy1} ${seasonLabel}`
      : `${yy0}-${yy1}${seasonLabel}`;
  };

  const semesterOptions = computed(() => [
    { code: "spring", label: t("courses.semester.spring") },
    { code: "summer", label: t("courses.semester.summer") },
    { code: "fall", label: t("courses.semester.fall") },
    { code: "winter", label: t("courses.semester.winter") },
  ]);

  return {
    formatAcademicYearSemester,
    semesterOptions,
  };
}
