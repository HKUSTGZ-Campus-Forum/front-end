// 首页持久化存储的类型定义
export interface HomeStorePersist {
  // fold 对象定义了各个区块的折叠状态
  fold: {
    updates: boolean; // 更新区块的折叠状态
    topics: boolean; // 主题区块的折叠状态
    square: boolean; // 广场区块的折叠状态
    resources: boolean; // 资源区块的折叠状态
    sitemaps: boolean; // 站点地图区块的折叠状态
  };
}
