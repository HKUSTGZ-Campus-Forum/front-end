export type AcademicMajorCode = 'AI' | 'AMAT' | 'DSA' | 'SMMG' | 'FTEC' | 'ROAS' | 'MICS' | 'SEE'

export interface AcademicMajorMeta {
  code: AcademicMajorCode
  nameZh: string
  nameEn: string
}

export const academicMajors: AcademicMajorMeta[] = [
  { code: 'AI', nameZh: '人工智能', nameEn: 'Artificial Intelligence' },
  { code: 'AMAT', nameZh: '材料科学与工程', nameEn: 'Materials Science and Engineering' },
  { code: 'DSA', nameZh: '数据科学与大数据', nameEn: 'Data Science and Big Data Technology' },
  { code: 'SMMG', nameZh: '智能制造工程', nameEn: 'Smart Manufacturing Engineering' },
  { code: 'FTEC', nameZh: '金融科技', nameEn: 'Financial Technology' },
  { code: 'ROAS', nameZh: '机器人工程', nameEn: 'Robotics' },
  { code: 'MICS', nameZh: '微电子科学与工程', nameEn: 'Microelectronics Science and Engineering' },
  { code: 'SEE', nameZh: '新能源科学与工程', nameEn: 'New Energy Science and Engineering' },
]

export const academicMajorAliases: Record<string, AcademicMajorCode> = {
  DSBD: 'DSA',
  SEEN: 'SEE',
}

export function normalizeAcademicMajorCode(value: string): AcademicMajorCode | null {
  const code = value.trim().toUpperCase()
  const normalized = academicMajorAliases[code] || code
  return academicMajors.some(major => major.code === normalized) ? normalized as AcademicMajorCode : null
}
