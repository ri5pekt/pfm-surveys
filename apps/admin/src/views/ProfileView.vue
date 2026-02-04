<template>
  <div class="profile-view">
    <div class="profile-header">
      <h2>Profile Settings</h2>
      <p class="subtitle">Manage your account information</p>
    </div>

    <div class="profile-sections">
      <!-- Personal Information Section -->
      <section class="profile-section">
        <h3>Personal Information</h3>
        
        <form @submit.prevent="handleUpdateProfile" class="profile-form">
          <div class="form-group">
            <label for="email">Email Address</label>
            <input
              id="email"
              v-model="profileForm.email"
              type="email"
              disabled
              class="input-disabled"
            />
            <p class="help-text">Email cannot be changed</p>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="first-name">First Name</label>
              <input
                id="first-name"
                v-model="profileForm.first_name"
                type="text"
                placeholder="Enter your first name"
              />
            </div>

            <div class="form-group">
              <label for="last-name">Last Name</label>
              <input
                id="last-name"
                v-model="profileForm.last_name"
                type="text"
                placeholder="Enter your last name"
              />
            </div>
          </div>

          <div v-if="profileError" class="error-message">{{ profileError }}</div>
          <div v-if="profileSuccess" class="success-message">{{ profileSuccess }}</div>

          <button type="submit" class="btn-primary" :disabled="updatingProfile">
            {{ updatingProfile ? 'Updating...' : 'Update Profile' }}
          </button>
        </form>
      </section>

      <!-- Change Password Section -->
      <section class="profile-section">
        <h3>Change Password</h3>
        
        <form @submit.prevent="handleChangePassword" class="profile-form">
          <div class="form-group">
            <label for="current-password">Current Password</label>
            <input
              id="current-password"
              v-model="passwordForm.current_password"
              type="password"
              placeholder="Enter current password"
              required
            />
          </div>

          <div class="form-group">
            <label for="new-password">New Password</label>
            <input
              id="new-password"
              v-model="passwordForm.new_password"
              type="password"
              placeholder="Enter new password (min 6 characters)"
              required
              minlength="6"
            />
          </div>

          <div class="form-group">
            <label for="confirm-password">Confirm New Password</label>
            <input
              id="confirm-password"
              v-model="passwordForm.confirm_password"
              type="password"
              placeholder="Confirm new password"
              required
            />
          </div>

          <div v-if="passwordError" class="error-message">{{ passwordError }}</div>
          <div v-if="passwordSuccess" class="success-message">{{ passwordSuccess }}</div>

          <button type="submit" class="btn-primary" :disabled="changingPassword">
            {{ changingPassword ? 'Changing...' : 'Change Password' }}
          </button>
        </form>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

const profileForm = ref({
  email: '',
  first_name: '',
  last_name: '',
});

const passwordForm = ref({
  current_password: '',
  new_password: '',
  confirm_password: '',
});

const updatingProfile = ref(false);
const profileError = ref<string | null>(null);
const profileSuccess = ref<string | null>(null);

const changingPassword = ref(false);
const passwordError = ref<string | null>(null);
const passwordSuccess = ref<string | null>(null);

onMounted(() => {
  if (authStore.user) {
    profileForm.value.email = authStore.user.email;
    profileForm.value.first_name = authStore.user.first_name || '';
    profileForm.value.last_name = authStore.user.last_name || '';
  }
});

async function handleUpdateProfile() {
  updatingProfile.value = true;
  profileError.value = null;
  profileSuccess.value = null;

  try {
    const response = await fetch('http://localhost:3000/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`,
      },
      body: JSON.stringify({
        first_name: profileForm.value.first_name,
        last_name: profileForm.value.last_name,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update profile');
    }

    const updatedUser = await response.json();
    
    // Update the auth store with new user data
    authStore.user = updatedUser;
    localStorage.setItem('user', JSON.stringify(updatedUser));

    profileSuccess.value = 'Profile updated successfully!';
    
    setTimeout(() => {
      profileSuccess.value = null;
    }, 3000);
  } catch (err: any) {
    profileError.value = err.message || 'Failed to update profile';
  } finally {
    updatingProfile.value = false;
  }
}

async function handleChangePassword() {
  changingPassword.value = true;
  passwordError.value = null;
  passwordSuccess.value = null;

  // Validate passwords match
  if (passwordForm.value.new_password !== passwordForm.value.confirm_password) {
    passwordError.value = 'New passwords do not match';
    changingPassword.value = false;
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/api/user/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`,
      },
      body: JSON.stringify({
        current_password: passwordForm.value.current_password,
        new_password: passwordForm.value.new_password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to change password');
    }

    passwordSuccess.value = 'Password changed successfully!';
    
    // Clear form
    passwordForm.value = {
      current_password: '',
      new_password: '',
      confirm_password: '',
    };

    setTimeout(() => {
      passwordSuccess.value = null;
    }, 3000);
  } catch (err: any) {
    passwordError.value = err.message || 'Failed to change password';
  } finally {
    changingPassword.value = false;
  }
}
</script>

<style scoped>
.profile-view {
  max-width: 800px;
  margin: 0 auto;
}

.profile-header {
  margin-bottom: 32px;
}

.profile-header h2 {
  margin: 0 0 8px 0;
  font-size: 28px;
  color: #333;
}

.subtitle {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.profile-sections {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.profile-section {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.profile-section h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
  color: #333;
  padding-bottom: 12px;
  border-bottom: 1px solid #e1e4e8;
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.form-group input {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

.input-disabled {
  background: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}

.help-text {
  font-size: 12px;
  color: #666;
  margin: 0;
}

.error-message {
  padding: 12px;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 6px;
  color: #c33;
  font-size: 14px;
}

.success-message {
  padding: 12px;
  background: #d4edda;
  border: 1px solid #c3e6cb;
  border-radius: 6px;
  color: #155724;
  font-size: 14px;
}

.btn-primary {
  padding: 12px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  align-self: flex-start;
}

.btn-primary:hover:not(:disabled) {
  background: #5568d3;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
