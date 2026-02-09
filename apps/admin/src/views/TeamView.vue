<template>
    <div class="team-view">
        <div class="header-section">
            <div>
                <h2>Team Members</h2>
                <p class="subtitle">Manage your organization's team</p>
            </div>
            <button @click="showInviteModal = true" class="btn-primary">Invite Member</button>
        </div>

        <div v-if="loading" class="loading">Loading team members...</div>

        <div v-else-if="members.length === 0" class="empty-state">
            <p>No team members yet</p>
            <button @click="showInviteModal = true" class="btn-primary">Invite Your First Member</button>
        </div>

        <table v-else class="team-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="member in members" :key="member.id">
                    <td class="member-name">
                        {{ getMemberName(member) }}
                        <span v-if="member.id === authStore.user?.id" class="badge-you">You</span>
                    </td>
                    <td>{{ member.email }}</td>
                    <td>
                        <span class="role-badge">{{ member.role || "Member" }}</span>
                    </td>
                    <td>
                        <span :class="['status-badge', member.active ? 'active' : 'inactive']">
                            {{ member.active ? "Active" : "Inactive" }}
                        </span>
                    </td>
                    <td>{{ formatDate(member.created_at) }}</td>
                    <td class="actions-cell">
                        <div v-if="member.id !== authStore.user?.id" class="action-buttons">
                            <button
                                @click="handleResendInvite(member)"
                                class="btn-text text-primary"
                                title="Resend invitation email"
                            >
                                Resend Invite
                            </button>
                            <button @click="confirmRemove(member)" class="btn-text text-danger">Remove</button>
                        </div>
                        <span v-else class="text-muted">—</span>
                    </td>
                </tr>
            </tbody>
        </table>

        <!-- Success Modal -->
        <div v-if="inviteSuccess" class="modal-overlay" @click="inviteSuccess = null">
            <div class="modal-content" @click.stop>
                <h3>{{ inviteSuccess.emailSent ? "✅ Invitation Sent!" : "⚠️ User Created" }}</h3>

                <div class="success-content">
                    <p>
                        User <strong>{{ inviteSuccess.email }}</strong> has been added to your team.
                    </p>

                    <!-- Email sent successfully -->
                    <div v-if="inviteSuccess.emailSent" class="success-box">
                        <p>
                            📧 <strong>An invitation email has been sent to {{ inviteSuccess.email }}</strong>
                        </p>
                        <p style="font-size: 14px; color: #666; margin-top: 10px">
                            The email contains their temporary password and login instructions.
                        </p>
                    </div>

                    <!-- Email failed - show password manually -->
                    <div v-else>
                        <div class="warning-box" style="margin-bottom: 15px">
                            <strong>⚠️ Email Failed:</strong> The invitation email could not be sent. Please share the
                            password manually.
                            <p v-if="inviteSuccess.error" class="email-error-detail">{{ inviteSuccess.error }}</p>
                        </div>

                        <div class="temp-password-box">
                            <label>Temporary Password:</label>
                            <div class="password-display">
                                <code>{{ inviteSuccess.tempPassword }}</code>
                                <button @click="copyPassword(inviteSuccess.tempPassword!)" class="btn-copy">
                                    Copy
                                </button>
                            </div>
                        </div>

                        <div class="info-box" style="margin-top: 15px">
                            Share this password with the new team member securely. They should change it after their
                            first login.
                        </div>
                    </div>
                </div>

                <button
                    @click="
                        inviteSuccess = null;
                        showInviteModal = false;
                    "
                    class="btn-primary"
                >
                    Close
                </button>
            </div>
        </div>

        <!-- Invite Member Modal -->
        <div v-else-if="showInviteModal" class="modal-overlay" @click="showInviteModal = false">
            <div class="modal-content" @click.stop>
                <h3>Invite Team Member</h3>

                <form @submit.prevent="handleInvite" class="form">
                    <div class="form-group">
                        <label for="invite-email">Email Address *</label>
                        <input
                            id="invite-email"
                            v-model="inviteForm.email"
                            type="email"
                            placeholder="colleague@example.com"
                            required
                        />
                    </div>

                    <div class="info-box">
                        <strong>Note:</strong> A temporary password will be generated. Make sure to share it with the
                        new team member securely.
                    </div>

                    <div v-if="error" class="error-message">{{ error }}</div>

                    <div class="modal-actions">
                        <button type="button" @click="showInviteModal = false" class="btn-secondary">Cancel</button>
                        <button type="submit" class="btn-primary" :disabled="inviting">
                            {{ inviting ? "Sending..." : "Send Invitation" }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useAuthStore } from "../stores/auth";
import { db } from "../services/api";

const authStore = useAuthStore();
const apiBaseUrl = computed(() => import.meta.env.VITE_API_BASE_URL || "http://localhost:3000");

interface TeamMember {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role?: string;
    active: boolean;
    created_at: string;
}

const members = ref<TeamMember[]>([]);
const loading = ref(false);
const showInviteModal = ref(false);
const inviting = ref(false);
const resending = ref(false);
const error = ref<string | null>(null);

const inviteForm = ref({
    email: "",
});

const inviteSuccess = ref<{
    email: string;
    emailSent: boolean;
    tempPassword?: string;
    error?: string; // API error message when email failed
} | null>(null);

function getMemberName(member: TeamMember): string {
    if (member.first_name || member.last_name) {
        return `${member.first_name || ""} ${member.last_name || ""}`.trim();
    }
    return member.email.split("@")[0];
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

async function copyPassword(password: string) {
    try {
        await navigator.clipboard.writeText(password);
        alert("Password copied to clipboard!");
    } catch (err) {
        console.error("Failed to copy:", err);
    }
}

async function handleInvite() {
    inviting.value = true;
    error.value = null;

    try {
        const response = await fetch(`${apiBaseUrl.value}/api/team/invite`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authStore.token}`,
            },
            body: JSON.stringify({ email: inviteForm.value.email }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to invite user");
        }

        const data = await response.json();
        inviteSuccess.value = {
            email: data.user.email,
            emailSent: data.emailSent,
            tempPassword: data.tempPassword, // Only present if email failed
            error: data.error ?? undefined,
        };

        // Refresh team members list
        await fetchTeamMembers();

        inviteForm.value = { email: "" };
    } catch (err: any) {
        error.value = err.message || "Failed to send invitation";
    } finally {
        inviting.value = false;
    }
}

async function handleResendInvite(member: TeamMember) {
    if (!confirm(`Resend invitation email to ${member.email}? This will generate a new temporary password.`)) {
        return;
    }

    resending.value = true;

    try {
        const response = await fetch(`${apiBaseUrl.value}/api/team/${member.id}/resend-invite`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${authStore.token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to resend invitation");
        }

        const data = await response.json();
        inviteSuccess.value = {
            email: data.user.email,
            emailSent: data.emailSent,
            tempPassword: data.tempPassword,
            error: data.error ?? undefined,
        };
    } catch (err: any) {
        alert(err.message || "Failed to resend invitation");
    } finally {
        resending.value = false;
    }
}

async function confirmRemove(member: TeamMember) {
    if (!confirm(`Are you sure you want to remove ${getMemberName(member)}?`)) {
        return;
    }

    try {
        const response = await fetch(`${apiBaseUrl.value}/api/team/${member.id}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${authStore.token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to remove user");
        }

        // Refresh team members list
        await fetchTeamMembers();
    } catch (err: any) {
        alert(err.message || "Failed to remove team member");
    }
}

async function fetchTeamMembers() {
    loading.value = true;
    try {
        const response = await fetch(`${apiBaseUrl.value}/api/team`, {
            headers: {
                Authorization: `Bearer ${authStore.token}`,
            },
        });

        if (!response.ok) {
            throw new Error("Failed to fetch team members");
        }

        members.value = await response.json();
    } catch (err) {
        console.error("Failed to fetch team members:", err);
    } finally {
        loading.value = false;
    }
}

onMounted(fetchTeamMembers);
</script>

<style scoped>
.team-view {
    background: white;
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;
}

.header-section h2 {
    margin: 0 0 4px 0;
    font-size: 24px;
    color: #333;
}

.subtitle {
    margin: 0;
    font-size: 14px;
    color: #666;
}

.btn-primary {
    padding: 10px 20px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
    background: #5568d3;
}

.btn-primary:disabled {
    background: #ccc;
    cursor: not-allowed;
}

.loading,
.empty-state {
    text-align: center;
    padding: 48px;
    color: #666;
}

.team-table {
    width: 100%;
    border-collapse: collapse;
}

.team-table th {
    text-align: left;
    padding: 12px;
    border-bottom: 2px solid #e1e4e8;
    font-size: 12px;
    font-weight: 600;
    color: #666;
    text-transform: uppercase;
}

.team-table td {
    padding: 16px 12px;
    border-bottom: 1px solid #e1e4e8;
    font-size: 14px;
    color: #333;
}

.member-name {
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
}

.badge-you {
    display: inline-block;
    padding: 2px 8px;
    background: #667eea;
    color: white;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
}

.role-badge {
    display: inline-block;
    padding: 4px 12px;
    background: #f0f0f0;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    color: #666;
}

.status-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
}

.status-badge.active {
    background: #d4edda;
    color: #155724;
}

.status-badge.inactive {
    background: #f8d7da;
    color: #721c24;
}

.btn-text {
    background: none;
    border: none;
    color: #667eea;
    font-size: 14px;
    cursor: pointer;
    padding: 4px 8px;
}

.btn-text:hover {
    text-decoration: underline;
}

.text-danger {
    color: #d73a49;
}

.text-primary {
    color: #667eea;
}

.text-muted {
    color: #999;
}

.actions-cell {
    white-space: nowrap;
}

.action-buttons {
    display: flex;
    gap: 12px;
    align-items: center;
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
    padding: 32px;
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
}

.modal-content h3 {
    margin: 0 0 24px 0;
    font-size: 24px;
    color: #333;
}

.form {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.form-group label:not(.checkbox-inline):not(.checkbox-label):not(.radio-label) {
    font-size: 14px;
    font-weight: 500;
    color: #333;
}

.form-group input,
.form-group select {
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
}

.form-group input:focus,
.form-group select:focus {
    outline: none;
    border-color: #667eea;
}

.help-text {
    font-size: 12px;
    color: #666;
}

.info-box {
    padding: 12px;
    background: #e7f3ff;
    border: 1px solid #b3d9ff;
    border-radius: 6px;
    color: #004085;
    font-size: 14px;
    line-height: 1.5;
}

.error-message {
    padding: 12px;
    background: #fee;
    border: 1px solid #fcc;
    border-radius: 6px;
    color: #c33;
    font-size: 14px;
}

.modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
}

.btn-secondary {
    padding: 10px 20px;
    background: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
}

.btn-secondary:hover {
    background: #e5e5e5;
}

.success-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-bottom: 24px;
}

.temp-password-box {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.temp-password-box label {
    font-weight: 600;
    color: #666;
    font-size: 14px;
}

.password-display {
    display: flex;
    align-items: center;
    gap: 12px;
}

.password-display code {
    flex: 1;
    padding: 12px;
    background: #f5f5f5;
    border: 2px solid #667eea;
    border-radius: 6px;
    font-family: monospace;
    font-size: 16px;
    font-weight: 600;
    color: #667eea;
}

.btn-copy {
    padding: 8px 16px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    font-weight: 500;
}

.btn-copy:hover {
    background: #5568d3;
}

.warning-box {
    padding: 12px;
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 6px;
    color: #856404;
    font-size: 14px;
    line-height: 1.5;
}

.warning-box .email-error-detail {
    margin: 8px 0 0 0;
    font-size: 13px;
    opacity: 0.95;
}

.success-box {
    padding: 16px;
    background: #d4edda;
    border: 1px solid #c3e6cb;
    border-radius: 6px;
    color: #155724;
    font-size: 14px;
    line-height: 1.5;
    text-align: center;
}

.success-box p {
    margin: 0;
}
</style>
