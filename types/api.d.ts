export interface Api {
  get<T = any>(url: string, config?: any): Promise<{ data: T }>
  post<T = any>(url: string, data?: any, config?: any): Promise<{ data: T }>
  put<T = any>(url: string, data?: any, config?: any): Promise<{ data: T }>
  delete<T = any>(url: string, config?: any): Promise<{ data: T }>
  request<T = any>(config: any): Promise<{ data: T }>
}
