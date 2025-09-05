<template>
  <footer class="site-footer">
    <div class="footer-container">
      <!-- Compact Footer Content -->
      <div class="footer-main">
        <!-- Brand and WeChat -->
        <div class="footer-section brand-section">
          <div class="brand-info">
            <h3 class="footer-title">UniKorn 科广汇</h3>
            <p class="footer-tagline">让学习更有温度</p>
          </div>
          <div class="wechat-qr">
            <img 
              src="/image/qrcode_unikorn_official_account.jpeg" 
              alt="UniKorn微信公众号"
              class="qr-code"
            />
            <span class="qr-label">微信公众号</span>
          </div>
        </div>

        <!-- Navigation and Links -->
        <div class="footer-section links-section">
          <div class="link-group">
            <h4 class="section-title">导航</h4>
            <div class="link-row">
              <NuxtLink to="/">首页</NuxtLink>
              <NuxtLink to="/forum">论坛</NuxtLink>
              <NuxtLink to="/club">社团</NuxtLink>
              <NuxtLink to="/courses">课程</NuxtLink>
            </div>
          </div>
          <div class="link-group">
            <h4 class="section-title">帮助</h4>
            <div class="link-row">
              <NuxtLink to="/help/guide">使用指南</NuxtLink>
              <NuxtLink to="/help/rules">社区规则</NuxtLink>
              <NuxtLink to="/help/privacy">隐私政策</NuxtLink>
            </div>
          </div>
        </div>

        <!-- Contact -->
        <div class="footer-section contact-section">
          <h4 class="section-title">联系</h4>
          <a href="mailto:unikorn-connect@outlook.com" class="email-link">
            📧 unikorn-connect@outlook.com
          </a>
          <div class="contact-tags">
            <span class="tag">意见反馈</span>
            <span class="tag">校园合作</span>
          </div>
        </div>
      </div>

      <!-- Compact Bottom -->
      <div class="footer-bottom">
        <div class="footer-bottom-content">
          <div class="left-info">
            <span class="copyright">© {{ currentYear }} UniKorn 科广汇</span>
            <a href="https://beian.miit.gov.cn/" target="_blank" class="icp-link">
              京ICP备2023006922号-1
            </a>
          </div>
          <div class="right-info">
            <div class="tech-badges">
              <span class="badge">Vue.js</span>
              <span class="badge">Nuxt 3</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
// Get current year for copyright
const currentYear = new Date().getFullYear();
</script>

<style lang="scss" scoped>
.site-footer {
  background: var(--surface-secondary);
  border-top: 1px solid var(--border-primary);
  color: var(--text-secondary);
  margin-top: auto;
  
  .footer-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
  }
  
  .footer-main {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 2rem;
    padding: 1.5rem 0 1rem;
    align-items: start;
    
    @media (max-width: 768px) {
      grid-template-columns: 1fr;
      gap: 1rem;
      padding: 1rem 0 0.75rem;
    }
  }
  
  .footer-section {
    &.brand-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      
      @media (max-width: 768px) {
        flex-direction: column;
        text-align: center;
        gap: 0.75rem;
      }
      
      .brand-info {
        .footer-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
          
          @media (max-width: 768px) {
            font-size: 1.1rem;
          }
        }
        
        .footer-tagline {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin: 0;
          opacity: 0.8;
        }
      }
      
      .wechat-qr {
        display: flex;
        flex-direction: column;
        align-items: center;
        
        .qr-code {
          width: 50px;
          height: 50px;
          border-radius: 4px;
          margin-bottom: 0.25rem;
        }
        
        .qr-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
      }
    }
    
    &.links-section {
      display: flex;
      gap: 2rem;
      justify-content: center;
      
      @media (max-width: 768px) {
        gap: 1.5rem;
        justify-content: space-around;
      }
      
      @media (max-width: 480px) {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }
    }
    
    &.contact-section {
      text-align: right;
      
      @media (max-width: 768px) {
        text-align: center;
      }
    }
    
    .section-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 0.5rem;
    }
  }
  
  .link-group {
    .link-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      
      @media (max-width: 480px) {
        flex-direction: column;
        gap: 0.25rem;
      }
      
      a {
        color: var(--text-secondary);
        text-decoration: none;
        font-size: 0.85rem;
        transition: color 0.2s ease;
        
        &:hover {
          color: var(--interactive-primary);
        }
      }
    }
  }
  
  .email-link {
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.85rem;
    display: block;
    margin-bottom: 0.5rem;
    transition: color 0.2s ease;
    
    &:hover {
      color: var(--interactive-primary);
    }
  }
  
  .contact-tags {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    
    @media (max-width: 768px) {
      justify-content: center;
    }
    
    .tag {
      font-size: 0.75rem;
      padding: 0.15rem 0.4rem;
      background: var(--surface-primary);
      color: var(--text-secondary);
      border-radius: 10px;
      border: 1px solid var(--border-primary);
    }
  }
  
  .footer-bottom {
    border-top: 1px solid var(--border-primary);
    padding: 0.75rem 0;
    
    .footer-bottom-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      @media (max-width: 768px) {
        flex-direction: column;
        gap: 0.5rem;
        text-align: center;
      }
    }
    
    .left-info {
      display: flex;
      gap: 1rem;
      align-items: center;
      
      @media (max-width: 768px) {
        flex-direction: column;
        gap: 0.25rem;
      }
      
      .copyright {
        font-size: 0.8rem;
        color: var(--text-secondary);
      }
      
      .icp-link {
        font-size: 0.75rem;
        color: var(--text-secondary);
        text-decoration: none;
        transition: color 0.2s ease;
        
        &:hover {
          color: var(--interactive-primary);
        }
      }
    }
    
    .right-info {
      .tech-badges {
        display: flex;
        gap: 0.4rem;
        
        .badge {
          font-size: 0.7rem;
          padding: 0.15rem 0.4rem;
          background: var(--interactive-primary);
          color: var(--text-inverse);
          border-radius: 8px;
          opacity: 0.8;
        }
      }
    }
  }
}

// Mobile optimizations
@media (max-width: 480px) {
  .site-footer {
    .footer-container {
      padding: 0 0.75rem;
    }
    
    .footer-main {
      padding: 0.75rem 0 0.5rem;
    }
    
    .footer-bottom {
      padding: 0.5rem 0;
    }
  }
}
</style>