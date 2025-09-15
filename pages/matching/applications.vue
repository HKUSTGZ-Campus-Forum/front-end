<template>
  <HomeContainer>
    <div class="redirect-page">
      <div class="content-box">
        <Icon name="info" class="info-icon" />
        <h1>Feature Simplified</h1>
        <p>
          The application system has been removed to simplify the matching experience.
          You can now directly discover and connect with project creators.
        </p>
        <div class="action-buttons">
          <NuxtLink to="/matching/discover" class="btn btn-primary">
            <Icon name="search" />
            Discover Projects
          </NuxtLink>
          <NuxtLink to="/matching" class="btn btn-outline">
            <Icon name="home" />
            Back to Dashboard
          </NuxtLink>
        </div>
      </div>
    </div>
  </HomeContainer>
</template>

<script setup>
// Page meta
definePageMeta({
  title: 'Applications - Feature Removed',
  requiresAuth: true,
})
</script>

<style scoped>
.redirect-page {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.content-box {
  text-align: center;
  padding: 40px;
  background: var(--surface-primary, white);
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  border: 1px solid #e9ecef;
}

.info-icon {
  font-size: 4rem;
  color: #3498db;
  margin-bottom: 20px;
}

h1 {
  font-size: 2rem;
  color: var(--text-primary, #2c3e50);
  margin-bottom: 16px;
  font-weight: 600;
}

p {
  font-size: 1.1rem;
  color: var(--text-secondary, #7f8c8d);
  line-height: 1.6;
  margin-bottom: 30px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #3498db;
  color: white;
  border-color: #3498db;
}

.btn-primary:hover {
  background: #2980b9;
}

.btn-outline {
  background: transparent;
  color: var(--text-secondary, #7f8c8d);
  border-color: #bdc3c7;
}

.btn-outline:hover {
  background: #ecf0f1;
}

@media (max-width: 768px) {
  .action-buttons {
    flex-direction: column;
  }
}
</style>