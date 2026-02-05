<template>
    <div class="table-section all-responses-table">
        <div class="table-header-row">
            <span class="table-title">Individual responses</span>
            <button
                v-if="selectedIds.length > 0"
                type="button"
                class="btn-trash"
                @click="$emit('bulkDelete')"
                title="Delete selected"
            >
                🗑 Delete selected ({{ selectedIds.length }})
            </button>
        </div>
        <table class="responses-table">
            <thead>
                <tr>
                    <th class="col-check">
                        <input
                            type="checkbox"
                            :checked="isAllSelected"
                            :indeterminate="isSomeSelected"
                            @change="$emit('toggleSelectAll')"
                            aria-label="Select all"
                        />
                    </th>
                    <th class="col-num">#</th>
                    <th class="col-page">Page</th>
                    <th class="col-answer">Answer</th>
                    <th class="col-browser">Browser / OS</th>
                    <th class="col-device">Device</th>
                    <th class="col-location">Location</th>
                    <th class="col-date">Date</th>
                    <th class="col-actions">Actions</th>
                </tr>
            </thead>
            <tbody>
                <tr v-if="loadingResponses">
                    <td colspan="9" style="text-align: center; padding: 40px; color: #999">Loading responses...</td>
                </tr>
                <tr v-else v-for="(row, index) in responses" :key="row.id">
                    <td class="col-check">
                        <input
                            type="checkbox"
                            :checked="selectedIds.includes(row.id)"
                            @change="$emit('toggleSelect', row.id)"
                            :aria-label="'Select response ' + row.id"
                        />
                    </td>
                    <td class="col-num">{{ index + 1 }}</td>
                    <td class="col-page">
                        <a
                            v-if="row.page_url"
                            :href="row.page_url"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="page-link"
                        >
                            {{ truncateUrl(row.page_url) }}
                            <span class="external-icon" aria-hidden="true">↗</span>
                        </a>
                        <span v-else class="no-page">—</span>
                    </td>
                    <td class="col-answer">
                        <span class="answer-text" :title="row.display_label">{{ row.display_label }}</span>
                    </td>
                    <td class="col-browser">
                        <div class="browser-os-icons" :title="browserOsLabel(row)">
                            <img
                                v-if="row.browser"
                                :src="browserIconPath(row.browser)"
                                :alt="row.browser"
                                class="browser-icon"
                            />
                            <img v-if="row.os" :src="osIconPath(row.os)" :alt="row.os" class="os-icon" />
                            <span v-if="!row.browser && !row.os" class="no-data">—</span>
                        </div>
                    </td>
                    <td class="col-device">
                        <img
                            v-if="row.device"
                            :src="deviceIconPath(row.device)"
                            :alt="row.device"
                            :title="row.device"
                            class="device-icon"
                        />
                        <span v-else class="no-data">—</span>
                    </td>
                    <td class="col-location">
                        <span v-if="row.country" class="location-cell">
                            <img
                                :src="getFlagUrl(row.country)"
                                :alt="row.country"
                                class="country-flag"
                                @error="handleFlagError"
                            />
                            <span>{{ formatLocation(row) }}</span>
                        </span>
                        <span v-else class="no-location">—</span>
                    </td>
                    <td class="col-date">{{ formatDate(row.timestamp) }}</td>
                    <td class="col-actions">
                        <button type="button" class="btn-text" @click="$emit('viewResponse', row)">
                            View response
                        </button>
                        <div class="menu-wrapper">
                            <button
                                type="button"
                                class="btn-icon"
                                @click="$emit('toggleMenu', row.id)"
                                aria-haspopup="true"
                                :aria-expanded="openMenuId === row.id"
                                aria-label="More options"
                            >
                                ⋮
                            </button>
                            <div v-if="openMenuId === row.id" class="dropdown-menu">
                                <button
                                    type="button"
                                    @click="
                                        $emit('copyAnswer', row);
                                        $emit('closeMenu');
                                    "
                                >
                                    Copy answer
                                </button>
                                <button
                                    type="button"
                                    @click="
                                        $emit('deleteOne', row);
                                        $emit('closeMenu');
                                    "
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
        <div v-if="responses.length === 0 && !loadingResponses" class="empty-table">No responses yet.</div>
        <div class="pagination" v-if="total > 0">
            <div class="pagination-controls">
                <button
                    type="button"
                    class="btn-page"
                    :disabled="currentPage <= 1"
                    @click="$emit('update:currentPage', Math.max(1, currentPage - 1))"
                >
                    Previous
                </button>
                <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
                <button
                    type="button"
                    class="btn-page"
                    :disabled="currentPage >= totalPages"
                    @click="$emit('update:currentPage', Math.min(totalPages, currentPage + 1))"
                >
                    Next
                </button>
            </div>
            <div class="per-page-selector">
                <label for="per-page-select" class="per-page-label">Per page:</label>
                <select
                    id="per-page-select"
                    :value="pageSize"
                    @change="$emit('update:pageSize', Number(($event.target as HTMLSelectElement).value))"
                    class="per-page-select"
                >
                    <option :value="10">10</option>
                    <option :value="25">25</option>
                    <option :value="50">50</option>
                    <option :value="100">100</option>
                </select>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { ResponseRow } from "../types";
import { useResponseFormatters } from "../composables/useResponseFormatters";

defineProps<{
    responses: ResponseRow[];
    selectedIds: number[];
    isAllSelected: boolean;
    isSomeSelected: boolean;
    loadingResponses: boolean;
    openMenuId: number | null;
    currentPage: number;
    pageSize: number;
    total: number;
    totalPages: number;
}>();

defineEmits<{
    toggleSelect: [id: number];
    toggleSelectAll: [];
    bulkDelete: [];
    viewResponse: [row: ResponseRow];
    toggleMenu: [id: number];
    closeMenu: [];
    copyAnswer: [row: ResponseRow];
    deleteOne: [row: ResponseRow];
    "update:currentPage": [page: number];
    "update:pageSize": [size: number];
}>();

const {
    truncateUrl,
    browserOsLabel,
    browserIconPath,
    osIconPath,
    deviceIconPath,
    getFlagUrl,
    handleFlagError,
    formatLocation,
    formatDate,
} = useResponseFormatters();
</script>

<style scoped>
.table-section {
    margin-top: 32px;
}

.table-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.table-title {
    font-size: 18px;
    font-weight: 600;
    color: #1a202c;
}

.btn-trash {
    background: #e53e3e;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: background 0.2s;
}
.btn-trash:hover {
    background: #c53030;
}

.responses-table {
    width: 100%;
    border-collapse: collapse;
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.responses-table thead {
    background: #f7fafc;
    border-bottom: 2px solid #e2e8f0;
}

.responses-table th {
    padding: 12px 16px;
    text-align: left;
    font-size: 12px;
    font-weight: 600;
    color: #4a5568;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.responses-table tbody tr {
    border-bottom: 1px solid #e2e8f0;
    transition: background 0.15s;
}

.responses-table tbody tr:hover {
    background: #f7fafc;
}

.responses-table td {
    padding: 12px 16px;
    font-size: 14px;
    color: #2d3748;
}

.col-check {
    width: 40px;
}

.col-num {
    width: 50px;
    color: #718096;
}

.col-page {
    max-width: 200px;
}

.col-answer {
    max-width: 280px;
}

.answer-text {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.col-browser,
.col-device {
    width: 100px;
}

.responses-table thead th.col-browser {
    white-space: nowrap;
}

.col-location {
    width: 180px;
}

.col-date {
    width: 150px;
    white-space: nowrap;
}

.col-actions {
    width: 180px;
}

.page-link {
    color: #3182ce;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
}
.page-link:hover {
    text-decoration: underline;
}

.external-icon {
    font-size: 12px;
    opacity: 0.6;
}

.no-page,
.no-data,
.no-location {
    color: #a0aec0;
}

.browser-os-icons {
    display: flex;
    gap: 8px;
    align-items: center;
}

.browser-icon,
.os-icon,
.device-icon {
    width: 20px;
    height: 20px;
    object-fit: contain;
}

.location-cell {
    display: flex;
    align-items: center;
    gap: 8px;
}

.country-flag {
    width: 20px;
    height: 14px;
    object-fit: cover;
    border-radius: 2px;
}

.btn-text {
    background: none;
    border: none;
    color: #3182ce;
    cursor: pointer;
    font-size: 14px;
    padding: 0;
    text-decoration: underline;
}
.btn-text:hover {
    color: #2c5aa0;
}

.menu-wrapper {
    position: relative;
    display: inline-block;
    margin-left: 8px;
}

.btn-icon {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    padding: 4px 8px;
    color: #718096;
    border-radius: 4px;
}
.btn-icon:hover {
    background: #edf2f7;
}

.dropdown-menu {
    position: absolute;
    top: 100%;
    right: 0;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 4px 0;
    min-width: 140px;
    z-index: 10;
}

.dropdown-menu button {
    width: 100%;
    background: none;
    border: none;
    padding: 8px 16px;
    text-align: left;
    cursor: pointer;
    font-size: 14px;
    color: #2d3748;
}
.dropdown-menu button:hover {
    background: #f7fafc;
}

.empty-table {
    text-align: center;
    padding: 40px;
    color: #a0aec0;
    font-size: 14px;
}

.pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16px;
    padding: 16px;
    background: #f7fafc;
    border-radius: 8px;
}

.pagination-controls {
    display: flex;
    gap: 16px;
    align-items: center;
}

.btn-page {
    background: white;
    border: 1px solid #cbd5e0;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
}
.btn-page:hover:not(:disabled) {
    background: #edf2f7;
    border-color: #a0aec0;
}
.btn-page:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.page-info {
    font-size: 14px;
    color: #4a5568;
}

.per-page-selector {
    display: flex;
    align-items: center;
    gap: 8px;
}

.per-page-label {
    font-size: 14px;
    color: #4a5568;
}

.per-page-select {
    padding: 6px 12px;
    border: 1px solid #cbd5e0;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    background: white;
}
</style>
