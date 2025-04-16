import OSS from "ali-oss";
import CryptoJS from "crypto-js";

// STS令牌响应类型定义
interface STSTokenResponse {
  AccessKeyId: string;
  AccessKeySecret: string;
  SecurityToken: string;
  region?: string;
  bucket?: string;
  Expiration?: string;
}

// 安全地从localStorage获取token - 兼容SSR
function safeGetToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

// 获取STS令牌
export async function getSTSToken(): Promise<STSTokenResponse> {
  try {
    // 检查是否在浏览器环境
    if (typeof window === "undefined") {
      throw new Error("无法在服务器端获取STS令牌");
    }

    const token = safeGetToken();
    if (!token) {
      throw new Error("未找到认证令牌，请先登录");
    }

    // 在实际应用中，这个接口应从你的后端服务获取
    // const response = await fetch('https://dev.unikorn.axfff.com/api/oss/token', {
    //   method: 'GET',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${token}`,
    //   },
    // });

    // if (!response.ok) {
    //   throw new Error(`获取STS令牌失败: ${response.status}`);
    // }

    // const data = await response.json();
    // return data as STSTokenResponse;

    // 临时返回一个模拟的STS令牌对象，实际应用中应替换为真实数据
    return {
      AccessKeyId: "STS.NVf3creBxzJw8Be7aZMriFLMU",
      AccessKeySecret: "BB5h1pSjY5nTRvemBqQz9YR4F1cirHpwsCWNyXVN3PsD",
      SecurityToken:
        "CAISxQJ1q6Ft5B2yfSjIr5XTeNnGiJ1ZzYicOmTU02EPQf1FqYnmtzz2IHhMeXdhB+0Yt/gxlWBY7f0ZlqZiTIJffkHfdsp36LJe9A750wlrIUfvv9I+k5SANTW5KXyShb3/AYjQSNfaZY3eCTTtnTNyxr3XbCirW0ffX7SClZ9gaKZ8PGD6F00kYu1bPQx/ssQXGGLMPPK2SH7Qj3HXEVBjt3gX6wo9y9zmn5LFsUuO0wyglrJP9tipGPX+MZkwZqUYesyuwel7epDG1CNt8BVQ/M909vccoWqZ74/AXQANvUTWY7GPqccMIAJnI6EiGutfsOPsMSPcBFgeGu4dojc63oE9O0y3LOjISxt9h3cCPZ1w8zqvjv4pfgQT0jXR8mJCLztSf2gCIwV5cyavUUJxFmwCdpKvwFpDaH+pU6DruPpmLc8rpz2AGoABphPc6eQYtHDwPu77VmYX9l6EIRp/Rw/mCGaCRMUo28/SHuevl/G3zU8EXeiwRRIhvYOUP11dT+CTV90bqa1uHo0o7Uqja//D+uitfvUz7gXFsylnJkp1B52YoG5PRjKYgW9Y0z60gewcvJkTJ4Un1YDTQ2u9SEtHE6Ljca5GYu4gAA==",
      region: "oss-cn-guangzhou",
      bucket: "test20250312",
    };
  } catch (error) {
    console.error("获取STS令牌失败:", error);
    throw error;
  }
}

// 初始化OSS客户端
export async function initOSSClient(): Promise<OSS> {
  try {
    // 获取临时访问凭证
    const stsToken = await getSTSToken();

    return new OSS({
      region: stsToken.region || "oss-cn-hangzhou", // 默认杭州区域
      accessKeyId: stsToken.AccessKeyId,
      accessKeySecret: stsToken.AccessKeySecret,
      stsToken: stsToken.SecurityToken,
      bucket: stsToken.bucket || "your-bucket-name",
    });
  } catch (error) {
    console.error("初始化OSS客户端失败:", error);
    throw error;
  }
}

// 文件上传返回结果接口
interface UploadResult {
  url: string;
  name: string;
  size: number;
  type: string;
}

// 生成唯一文件名
export function generateUniqueFileName(file: File): string {
  const ext = file.name.split(".").pop() || "unknown";
  const timestamp = new Date().getTime();
  const randomStr = CryptoJS.MD5(file.name + timestamp)
    .toString()
    .substring(0, 8);
  return `uploads/${timestamp}-${randomStr}.${ext}`;
}

// 上传文件到OSS
export async function uploadFileToOSS(
  file: File,
  progress?: (percent: number) => void
): Promise<UploadResult> {
  try {
    // 检查是否在浏览器环境
    if (typeof window === "undefined") {
      throw new Error("无法在服务器端上传文件");
    }

    // 初始化OSS客户端
    const client = await initOSSClient();

    // 生成唯一文件名
    const ossPath = generateUniqueFileName(file);

    // 自定义头信息
    const headers = {
      "x-oss-storage-class": "Standard",
      //   "x-oss-object-acl": "public-read", // 公共读
      "Content-Disposition": `inline; filename="${encodeURIComponent(
        file.name
      )}"`,
    };

    // 上传文件
    const result = await client.multipartUpload(ossPath, file, {
      headers,
      progress: (p) => {
        if (typeof progress === "function") {
          progress(Math.floor(p * 100));
        }
      },
    });

    // 构建正确的URL (可能需要根据你的OSS配置调整)
    const stsToken = await getSTSToken();
    const baseUrl = `https://${stsToken.bucket}.${stsToken.region}.aliyuncs.com`;
    const fileUrl = `${baseUrl}/${ossPath}`;

    // 返回文件URL
    return {
      url: fileUrl, // 使用完整URL而不是从结果中提取
      name: file.name,
      size: file.size,
      type: file.type,
    };
  } catch (error) {
    console.error("上传文件失败:", error);
    throw error;
  }
}
