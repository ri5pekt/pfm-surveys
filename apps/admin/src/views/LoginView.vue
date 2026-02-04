<template>
  <div class="login-container">
    <div class="login-box">
      <div class="logo-container">
        <img src="../assets/pfm-surveys.svg" alt="PFM Surveys" class="logo" />
        <h1>PFM Surveys</h1>
      </div>
      <p class="subtitle">Sign in to your account</p>

      <form @submit.prevent="handleSubmit" class="login-form">
        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="Enter your email"
            required
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="Enter your password"
            required
            :disabled="loading"
          />
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <div class="register-link">
        <p>Don't have an account? <a href="#" @click.prevent="showRegister = true">Register</a></p>
      </div>
    </div>

    <!-- Register Modal -->
    <div v-if="showRegister" class="modal-overlay" @click="showRegister = false">
      <div class="modal-content" @click.stop>
        <h2>Create Account</h2>
        
        <form @submit.prevent="handleRegister" class="login-form">
          <div class="form-group">
            <label for="reg-tenant">Company Name</label>
            <input
              id="reg-tenant"
              v-model="registerData.tenant_name"
              type="text"
              placeholder="Your company name"
              required
              :disabled="loading"
            />
          </div>

          <div class="form-group">
            <label for="reg-email">Email</label>
            <input
              id="reg-email"
              v-model="registerData.email"
              type="email"
              placeholder="Enter your email"
              required
              :disabled="loading"
            />
          </div>

          <div class="form-group">
            <label for="reg-password">Password</label>
            <input
              id="reg-password"
              v-model="registerData.password"
              type="password"
              placeholder="Choose a password (min 6 characters)"
              required
              minlength="6"
              :disabled="loading"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="reg-first">First Name</label>
              <input
                id="reg-first"
                v-model="registerData.first_name"
                type="text"
                placeholder="Optional"
                :disabled="loading"
              />
            </div>

            <div class="form-group">
              <label for="reg-last">Last Name</label>
              <input
                id="reg-last"
                v-model="registerData.last_name"
                type="text"
                placeholder="Optional"
                :disabled="loading"
              />
            </div>
          </div>

          <div v-if="error" class="error-message">
            {{ error }}
          </div>

          <div class="modal-actions">
            <button type="button" @click="showRegister = false" class="btn-secondary" :disabled="loading">
              Cancel
            </button>
            <button type="submit" class="btn-primary" :disabled="loading">
              {{ loading ? 'Creating Account...' : 'Create Account' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref<string | null>(null);
const showRegister = ref(false);

const registerData = ref({
  tenant_name: '',
  email: '',
  password: '',
  first_name: '',
  last_name: '',
});

async function handleSubmit() {
  loading.value = true;
  error.value = null;

  const success = await authStore.login({
    email: email.value,
    password: password.value,
  });

  loading.value = false;

  if (success) {
    router.push({ name: 'surveys' });
  } else {
    error.value = authStore.error;
  }
}

async function handleRegister() {
  loading.value = true;
  error.value = null;

  const success = await authStore.register(registerData.value);

  loading.value = false;

  if (success) {
    showRegister.value = false;
    router.push({ name: 'surveys' });
  } else {
    error.value = authStore.error;
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-box {
  background: white;
  border-radius: 12px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.logo-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.logo {
  height: 48px;
  width: auto;
}

h1 {
  margin: 0;
  font-size: 28px;
  color: #333;
  text-align: center;
}

.subtitle {
  margin: 0 0 32px 0;
  color: #666;
  text-align: center;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.form-row {
  display: flex;
  gap: 12px;
}

label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

input {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

input:focus {
  outline: none;
  border-color: #667eea;
}

input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.error-message {
  padding: 12px;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 6px;
  color: #c33;
  font-size: 14px;
}

.btn-primary, .btn-secondary {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #5568d3;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e5e5;
}

.register-link {
  margin-top: 24px;
  text-align: center;
  font-size: 14px;
  color: #666;
}

.register-link a {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
}

.register-link a:hover {
  text-decoration: underline;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 40px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content h2 {
  margin: 0 0 24px 0;
  font-size: 24px;
  color: #333;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
</style>
