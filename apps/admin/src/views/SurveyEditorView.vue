<template>
    <div class="survey-editor">
        <!-- Header -->
        <div class="editor-header">
            <div class="header-left">
                <button @click="handleClose" class="btn-icon" title="Close">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path
                            d="M10 8.586L3.707 2.293 2.293 3.707 8.586 10l-6.293 6.293 1.414 1.414L10 11.414l6.293 6.293 1.414-1.414L11.414 10l6.293-6.293-1.414-1.414L10 8.586z"
                        />
                    </svg>
                </button>
                <h1>{{ isEditMode ? surveyData.name || "Edit Survey" : "New Survey" }}</h1>
            </div>
            <div class="header-right">
                <div class="toggle-container">
                    <label class="toggle-label">
                        <span class="toggle-text">Active</span>
                        <div class="toggle-switch" :class="{ active: surveyData.active }">
                            <input type="checkbox" v-model="surveyData.active" class="toggle-input" />
                            <span class="toggle-slider"></span>
                        </div>
                    </label>
                </div>
                <button @click="handleSave" class="btn-primary" :disabled="saving">
                    {{ saving ? "Saving..." : "Save" }}
                </button>
            </div>
        </div>

        <!-- Main Content -->
        <div class="editor-content">
            <!-- Accordion Sections -->
            <div class="accordion">
                <!-- Details Section -->
                <div class="accordion-item" :class="{ open: activeSection === 'details' }">
                    <button
                        class="accordion-header"
                        @click="toggleSection('details')"
                        :class="{ complete: isSectionComplete('details') }"
                    >
                        <div class="header-content">
                            <svg class="checkmark" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                <path
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                />
                            </svg>
                            <span class="title">Details</span>
                            <span class="subtitle">{{ surveyData.name || "Name your survey" }}</span>
                        </div>
                        <svg class="chevron" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path
                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            />
                        </svg>
                    </button>
                    <div class="accordion-body" v-show="activeSection === 'details'">
                        <div class="form-group">
                            <label for="survey-name">Survey Name *</label>
                            <input
                                id="survey-name"
                                v-model="surveyData.name"
                                type="text"
                                placeholder="e.g., Customer Satisfaction Survey"
                                required
                            />
                        </div>

                        <div class="form-group">
                            <label for="survey-description">Description</label>
                            <textarea
                                id="survey-description"
                                v-model="surveyData.description"
                                rows="3"
                                placeholder="Optional description for internal use"
                            ></textarea>
                        </div>

                        <div class="form-group">
                            <label>Type</label>
                            <div class="radio-group">
                                <label class="radio-label">
                                    <input type="radio" v-model="surveyData.type" value="popover" />
                                    <span>Popover</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Questions Section -->
                <div class="accordion-item" :class="{ open: activeSection === 'questions' }">
                    <button
                        class="accordion-header"
                        @click="toggleSection('questions')"
                        :class="{ complete: isSectionComplete('questions') }"
                    >
                        <div class="header-content">
                            <svg class="checkmark" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                <path
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                />
                            </svg>
                            <span class="title">Questions</span>
                            <span class="subtitle">{{ surveyData.questions.length }} question(s)</span>
                        </div>
                        <svg class="chevron" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path
                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            />
                        </svg>
                    </button>
                    <div class="accordion-body" v-show="activeSection === 'questions'">
                        <div v-for="(question, index) in surveyData.questions" :key="index" class="question-item">
                            <div class="question-header">
                                <span class="question-number">Q{{ index + 1 }}</span>
                                <button @click="removeQuestion(index)" class="btn-icon-small" title="Delete">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                        <path
                                            d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"
                                        />
                                        <path
                                            d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"
                                        />
                                    </svg>
                                </button>
                            </div>

                            <div class="form-group">
                                <label>Question Text *</label>
                                <input v-model="question.text" type="text" placeholder="Enter your question" required />
                            </div>

                            <div class="form-group">
                                <label>Question Type</label>
                                <select v-model="question.type" @change="handleQuestionTypeChange(index)">
                                    <option value="radio">Radio Buttons (Single Choice)</option>
                                    <option value="text">Text Answer</option>
                                </select>
                            </div>

                            <!-- Options for Radio Buttons -->
                            <div v-if="question.type === 'radio'" class="form-group">
                                <label>Answer Options</label>
                                <div
                                    v-for="(option, optIndex) in question.options"
                                    :key="optIndex"
                                    class="option-row-hotjar"
                                >
                                    <div class="option-number">ANSWER {{ optIndex + 1 }}</div>
                                    <input
                                        v-model="option.text"
                                        type="text"
                                        :placeholder="`Option ${optIndex + 1}`"
                                        class="option-input-hotjar"
                                    />
                                    <button
                                        type="button"
                                        @click="option.requiresComment = !option.requiresComment"
                                        :class="['btn-icon-hotjar', { active: option.requiresComment }]"
                                        title="Enter comment when selecting this answer"
                                    >
                                        <img
                                            src="@/assets/icons/system/comment.svg"
                                            alt="Comment"
                                            width="18"
                                            height="18"
                                        />
                                    </button>
                                    <button
                                        v-if="question.options.length > 2"
                                        type="button"
                                        @click="removeOption(index, optIndex)"
                                        class="btn-icon-hotjar"
                                        title="Remove option"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                                            <path
                                                d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"
                                            />
                                            <path
                                                d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"
                                            />
                                        </svg>
                                    </button>
                                </div>

                                <!-- Bottom controls row -->
                                <div class="question-controls-row">
                                    <button type="button" @click="addOption(index)" class="btn-add-answer">
                                        + Add answer
                                    </button>
                                    <label class="checkbox-inline">
                                        <input type="checkbox" v-model="question.required" />
                                        <span>Required question</span>
                                    </label>
                                    <label class="checkbox-inline">
                                        <input type="checkbox" v-model="question.randomizeOptions" />
                                        <span>Randomize order</span>
                                    </label>
                                    <label class="checkbox-inline" v-if="question.options.length > 0">
                                        <input
                                            type="checkbox"
                                            v-model="question.options[question.options.length - 1].pinToBottom"
                                        />
                                        <span>Pin answer {{ question.options.length }} to bottom</span>
                                    </label>
                                </div>
                            </div>

                            <!-- For text questions, just show required checkbox -->
                            <div v-else class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" v-model="question.required" />
                                    <span>Required question</span>
                                </label>
                            </div>
                        </div>

                        <button @click="addQuestion" class="btn-secondary">+ Add Question</button>

                        <div class="form-group thank-you-section">
                            <label for="thank-you-message">Thank you message</label>
                            <p class="field-hint">Shown to users after they submit the survey (optional).</p>
                            <textarea
                                id="thank-you-message"
                                v-model="surveyData.thankYouMessage"
                                rows="3"
                                placeholder="Thank you for answering this survey. Your feedback is highly appreciated!"
                            ></textarea>
                        </div>
                    </div>
                </div>

                <!-- Appearance Section -->
                <div class="accordion-item" :class="{ open: activeSection === 'appearance' }">
                    <button
                        class="accordion-header"
                        @click="toggleSection('appearance')"
                        :class="{ complete: isSectionComplete('appearance') }"
                    >
                        <div class="header-content">
                            <svg class="checkmark" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                <path
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                />
                            </svg>
                            <span class="title">Appearance</span>
                            <span class="subtitle">Customize design</span>
                        </div>
                        <svg class="chevron" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path
                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            />
                        </svg>
                    </button>
                    <div class="accordion-body" v-show="activeSection === 'appearance'">
                        <div class="form-group">
                            <label>Widget Background Color</label>
                            <div class="color-picker">
                                <input
                                    type="color"
                                    v-model="surveyData.appearance.widgetBackgroundColor"
                                    class="color-input"
                                />
                                <input
                                    type="text"
                                    v-model="surveyData.appearance.widgetBackgroundColor"
                                    class="color-text"
                                    placeholder="#141a2c"
                                />
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Widget Background Opacity (0-1)</label>
                            <input
                                type="number"
                                v-model.number="surveyData.appearance.widgetBackgroundOpacity"
                                step="0.1"
                                min="0"
                                max="1"
                                placeholder="1.0"
                            />
                        </div>
                        <div class="form-group">
                            <label>Widget Border Radius</label>
                            <input type="text" v-model="surveyData.appearance.widgetBorderRadius" placeholder="8px" />
                        </div>
                        <div class="form-group">
                            <label>Text Color</label>
                            <div class="color-picker">
                                <input type="color" v-model="surveyData.appearance.textColor" class="color-input" />
                                <input
                                    type="text"
                                    v-model="surveyData.appearance.textColor"
                                    class="color-text"
                                    placeholder="#ffffff"
                                />
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Question Text Size</label>
                            <input type="text" v-model="surveyData.appearance.questionTextSize" placeholder="1em" />
                        </div>
                        <div class="form-group">
                            <label>Answer Font Size</label>
                            <input type="text" v-model="surveyData.appearance.answerFontSize" placeholder="0.875em" />
                        </div>
                        <div class="form-group">
                            <label>Button Background Color</label>
                            <div class="color-picker">
                                <input
                                    type="color"
                                    v-model="surveyData.appearance.buttonBackgroundColor"
                                    class="color-input"
                                />
                                <input
                                    type="text"
                                    v-model="surveyData.appearance.buttonBackgroundColor"
                                    class="color-text"
                                    placeholder="#2a44b7"
                                />
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Widget buttons</label>
                            <div class="checkbox-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" v-model="surveyData.appearance.showCloseButton" />
                                    <span>Show close button</span>
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" v-model="surveyData.appearance.showMinimizeButton" />
                                    <span>Show minimize button</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Targeting Section -->
                <div class="accordion-item" :class="{ open: activeSection === 'targeting' }">
                    <button
                        class="accordion-header"
                        @click="toggleSection('targeting')"
                        :class="{ complete: isSectionComplete('targeting') }"
                    >
                        <div class="header-content">
                            <svg class="checkmark" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                <path
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                />
                            </svg>
                            <span class="title">Targeting</span>
                            <span class="subtitle">{{
                                surveyData.targeting.pageType === "all" ? "All pages" : "Specific pages"
                            }}</span>
                        </div>
                        <svg class="chevron" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path
                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            />
                        </svg>
                    </button>
                    <div class="accordion-body" v-show="activeSection === 'targeting'">
                        <div class="form-group">
                            <label>Pages</label>
                            <div class="radio-group">
                                <label class="radio-label">
                                    <input type="radio" v-model="surveyData.targeting.pageType" value="all" />
                                    <span>All pages</span>
                                </label>
                                <label class="radio-label">
                                    <input type="radio" v-model="surveyData.targeting.pageType" value="specific" />
                                    <span>Specific pages</span>
                                </label>
                            </div>
                        </div>

                        <div v-if="surveyData.targeting.pageType === 'specific'" class="form-group">
                            <label>Page Rules</label>
                            <div v-for="(rule, index) in surveyData.targeting.pageRules" :key="index" class="rule-row">
                                <select v-model="rule.type" class="rule-type">
                                    <option value="exact">Exact URL match</option>
                                    <option value="contains">URL contains</option>
                                </select>
                                <input
                                    v-model="rule.value"
                                    type="text"
                                    placeholder="Enter URL or path"
                                    class="rule-value"
                                />
                                <button
                                    v-if="surveyData.targeting.pageRules.length > 1"
                                    @click="removePageRule(index)"
                                    class="btn-icon-small rule-remove"
                                    title="Remove rule"
                                >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                        <path
                                            d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"
                                        />
                                        <path
                                            d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"
                                        />
                                    </svg>
                                </button>
                            </div>
                            <button @click="addPageRule" class="btn-text">+ Add Rule</button>
                        </div>

                        <div class="form-group">
                            <label>Users</label>
                            <div class="radio-group">
                                <label class="radio-label">
                                    <input type="radio" v-model="surveyData.targeting.users" value="all" />
                                    <span>All users</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Behavior Section -->
                <div class="accordion-item" :class="{ open: activeSection === 'behavior' }">
                    <button
                        class="accordion-header"
                        @click="toggleSection('behavior')"
                        :class="{ complete: isSectionComplete('behavior') }"
                    >
                        <div class="header-content">
                            <svg class="checkmark" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                <path
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                />
                            </svg>
                            <span class="title">Behavior</span>
                            <span class="subtitle">Timing & frequency</span>
                        </div>
                        <svg class="chevron" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path
                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            />
                        </svg>
                    </button>
                    <div class="accordion-body" v-show="activeSection === 'behavior'">
                        <div class="form-group">
                            <label>Timing</label>
                            <p class="help-text">Select when to show this survey to users</p>
                            <div class="radio-group">
                                <label class="radio-label">
                                    <input type="radio" v-model="surveyData.behavior.timing" value="immediate" />
                                    <span>Immediately after the page loads</span>
                                </label>
                                <label class="radio-label">
                                    <input type="radio" v-model="surveyData.behavior.timing" value="delay" />
                                    <span>After a delay on the page</span>
                                </label>
                            </div>

                            <div v-if="surveyData.behavior.timing === 'delay'" class="delay-input">
                                <label>Display after</label>
                                <div class="input-with-unit">
                                    <input
                                        type="number"
                                        v-model.number="surveyData.behavior.delaySeconds"
                                        min="0"
                                        class="number-input"
                                    />
                                    <span class="unit">seconds</span>
                                </div>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Frequency</label>
                            <p class="help-text">Select how often users should see this survey</p>
                            <div class="radio-group">
                                <label class="radio-label">
                                    <input type="radio" v-model="surveyData.behavior.frequency" value="until_submit" />
                                    <span>Until they submit a response</span>
                                </label>
                                <label class="radio-label">
                                    <input type="radio" v-model="surveyData.behavior.frequency" value="once" />
                                    <span>Only once, even if they do not respond</span>
                                </label>
                                <label class="radio-label">
                                    <input type="radio" v-model="surveyData.behavior.frequency" value="always" />
                                    <span>Always, even after they submit a response</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Summary Section -->
                <div class="accordion-item" :class="{ open: activeSection === 'summary' }">
                    <button class="accordion-header" @click="toggleSection('summary')">
                        <div class="header-content">
                            <span class="title">Summary</span>
                            <span class="subtitle">Review your survey</span>
                        </div>
                        <svg class="chevron" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path
                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            />
                        </svg>
                    </button>
                    <div class="accordion-body" v-show="activeSection === 'summary'">
                        <div class="summary-section">
                            <h3>Survey Details</h3>
                            <div class="summary-item"><strong>Name:</strong> {{ surveyData.name || "Not set" }}</div>
                            <div class="summary-item"><strong>Type:</strong> Popover</div>
                            <div class="summary-item">
                                <strong>Questions:</strong> {{ surveyData.questions.length }}
                            </div>
                        </div>

                        <div class="summary-section">
                            <h3>Targeting</h3>
                            <div class="summary-item">
                                <strong>Pages:</strong>
                                {{
                                    surveyData.targeting.pageType === "all"
                                        ? "All pages"
                                        : `${surveyData.targeting.pageRules.length} rule(s)`
                                }}
                            </div>
                            <div class="summary-item"><strong>Users:</strong> All users</div>
                        </div>

                        <div class="summary-section">
                            <h3>Behavior</h3>
                            <div class="summary-item">
                                <strong>Timing:</strong>
                                {{
                                    surveyData.behavior.timing === "immediate"
                                        ? "Immediately"
                                        : `After ${surveyData.behavior.delaySeconds} seconds`
                                }}
                            </div>
                            <div class="summary-item">
                                <strong>Frequency:</strong>
                                {{
                                    surveyData.behavior.frequency === "until_submit"
                                        ? "Until they submit"
                                        : surveyData.behavior.frequency === "once"
                                        ? "Only once"
                                        : "Always"
                                }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Success Dialog -->
        <Dialog
            v-model:visible="showSuccessDialog"
            modal
            :closable="false"
            :style="{ width: '28rem' }"
            :pt="{
                root: { class: 'custom-dialog' },
                header: { class: 'custom-dialog-header success-header' },
            }"
        >
            <template #header>
                <div class="dialog-header-content">
                    <div class="dialog-icon success-icon-circle">
                        <svg
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.5"
                        >
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                    <h3>Success!</h3>
                </div>
            </template>
            <div class="dialog-body">
                <p>Your survey has been saved successfully and is ready to use.</p>
            </div>
            <template #footer>
                <div class="dialog-footer">
                    <button class="btn-dialog-primary" @click="closeSuccessAndNavigate">Got it</button>
                </div>
            </template>
        </Dialog>

        <!-- Error Dialog -->
        <Dialog
            v-model:visible="showErrorDialog"
            modal
            :closable="true"
            :style="{ width: '28rem' }"
            :pt="{
                root: { class: 'custom-dialog' },
                header: { class: 'custom-dialog-header error-header' },
            }"
        >
            <template #header>
                <div class="dialog-header-content">
                    <div class="dialog-icon error-icon-circle">
                        <svg
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.5"
                        >
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                    </div>
                    <h3>Error</h3>
                </div>
            </template>
            <div class="dialog-body">
                <p>{{ errorMessage }}</p>
            </div>
            <template #footer>
                <div class="dialog-footer">
                    <button class="btn-dialog-primary" @click="showErrorDialog = false">OK</button>
                </div>
            </template>
        </Dialog>

        <!-- Validation Dialog -->
        <Dialog
            v-model:visible="showValidationDialog"
            modal
            :closable="true"
            :style="{ width: '28rem' }"
            :pt="{
                root: { class: 'custom-dialog' },
                header: { class: 'custom-dialog-header warning-header' },
            }"
        >
            <template #header>
                <div class="dialog-header-content">
                    <div class="dialog-icon warning-icon-circle">
                        <svg
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.5"
                        >
                            <path
                                d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                            ></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                    </div>
                    <h3>Please check your input</h3>
                </div>
            </template>
            <div class="dialog-body">
                <p>{{ validationMessage }}</p>
            </div>
            <template #footer>
                <div class="dialog-footer">
                    <button class="btn-dialog-primary" @click="closeValidationDialog">Fix it</button>
                </div>
            </template>
        </Dialog>

        <!-- Confirm Close Dialog -->
        <Dialog
            v-model:visible="showCloseConfirmDialog"
            modal
            :closable="true"
            :style="{ width: '28rem' }"
            :pt="{
                root: { class: 'custom-dialog' },
                header: { class: 'custom-dialog-header confirm-header' },
            }"
        >
            <template #header>
                <div class="dialog-header-content">
                    <div class="dialog-icon confirm-icon-circle">
                        <svg
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.5"
                        >
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                        </svg>
                    </div>
                    <h3>Discard changes?</h3>
                </div>
            </template>
            <div class="dialog-body">
                <p>You have unsaved changes. Are you sure you want to close? All changes will be lost.</p>
            </div>
            <template #footer>
                <div class="dialog-footer">
                    <button class="btn-dialog-secondary" @click="showCloseConfirmDialog = false">Keep editing</button>
                    <button class="btn-dialog-danger" @click="confirmClose">Discard changes</button>
                </div>
            </template>
        </Dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import Dialog from "primevue/dialog";
import { useSitesStore } from "../stores/sites";
import { surveysApi } from "../services/api";

const router = useRouter();
const route = useRoute();
const sitesStore = useSitesStore();

const activeSection = ref("details");
const saving = ref(false);
const showSuccessDialog = ref(false);
const showErrorDialog = ref(false);
const showValidationDialog = ref(false);
const showCloseConfirmDialog = ref(false);
const errorMessage = ref("");
const validationMessage = ref("");
const validationTargetSection = ref("");
const isEditMode = computed(() => !!route.params.id);

interface QuestionOption {
    text: string;
    requiresComment?: boolean;
    pinToBottom?: boolean;
}

interface Question {
    text: string;
    type: "radio" | "text";
    options: QuestionOption[];
    required: boolean;
    randomizeOptions?: boolean;
}

interface PageRule {
    type: "exact" | "contains";
    value: string;
}

interface SurveyData {
    name: string;
    description: string;
    type: string;
    active: boolean;
    thankYouMessage: string;
    questions: Question[];
    appearance: {
        backgroundColor: string;
        showCloseButton: boolean;
        showMinimizeButton: boolean;
        widgetBackgroundColor: string;
        widgetBackgroundOpacity: number;
        widgetBorderRadius: string;
        textColor: string;
        questionTextSize: string;
        answerFontSize: string;
        buttonBackgroundColor: string;
    };
    targeting: {
        pageType: "all" | "specific";
        pageRules: PageRule[];
        users: "all";
    };
    behavior: {
        timing: "immediate" | "delay";
        delaySeconds: number;
        frequency: "until_submit" | "once" | "always";
    };
}

const surveyData = ref<SurveyData>({
    name: "",
    description: "",
    type: "popover",
    active: false,
    thankYouMessage: "",
    questions: [],
    appearance: {
        backgroundColor: "#667eea",
        showCloseButton: true,
        showMinimizeButton: false,
        widgetBackgroundColor: "#141a2c",
        widgetBackgroundOpacity: 1.0,
        widgetBorderRadius: "8px",
        textColor: "#ffffff",
        questionTextSize: "1em",
        answerFontSize: "0.875em",
        buttonBackgroundColor: "#2a44b7",
    },
    targeting: {
        pageType: "all",
        pageRules: [{ type: "exact", value: "" }],
        users: "all",
    },
    behavior: {
        timing: "immediate",
        delaySeconds: 0,
        frequency: "until_submit",
    },
});

function toggleSection(section: string) {
    activeSection.value = activeSection.value === section ? "" : section;
}

function isSectionComplete(section: string): boolean {
    switch (section) {
        case "details":
            return !!surveyData.value.name;
        case "questions":
            return (
                surveyData.value.questions.length > 0 &&
                surveyData.value.questions.every(
                    (q) => q.text && (q.type === "text" || q.options.every((o) => (typeof o === "string" ? o : o.text)))
                )
            );
        case "appearance":
            return !!surveyData.value.appearance.backgroundColor;
        case "targeting":
            return true; // Always complete with defaults
        case "behavior":
            return true; // Always complete with defaults
        default:
            return false;
    }
}

function addQuestion() {
    surveyData.value.questions.push({
        text: "",
        type: "radio",
        options: [{ text: "" }, { text: "" }],
        required: true,
        randomizeOptions: false,
    });
}

function removeQuestion(index: number) {
    surveyData.value.questions.splice(index, 1);
}

function handleQuestionTypeChange(index: number) {
    const question = surveyData.value.questions[index];
    if (question.type === "radio" && question.options.length === 0) {
        question.options = [{ text: "" }, { text: "" }];
    }
}

function addOption(questionIndex: number) {
    surveyData.value.questions[questionIndex].options.push({ text: "" });
}

function removeOption(questionIndex: number, optionIndex: number) {
    surveyData.value.questions[questionIndex].options.splice(optionIndex, 1);
}

function addPageRule() {
    surveyData.value.targeting.pageRules.push({ type: "exact", value: "" });
}

function removePageRule(index: number) {
    surveyData.value.targeting.pageRules.splice(index, 1);
}

function handleClose() {
    showCloseConfirmDialog.value = true;
}

function confirmClose() {
    showCloseConfirmDialog.value = false;
    router.push({ name: "surveys" });
}

async function handleSave() {
    // Validate
    if (!surveyData.value.name) {
        validationMessage.value = "Please enter a survey name";
        validationTargetSection.value = "details";
        showValidationDialog.value = true;
        return;
    }

    if (surveyData.value.questions.length === 0) {
        validationMessage.value = "Please add at least one question";
        validationTargetSection.value = "questions";
        showValidationDialog.value = true;
        return;
    }

    // Validate that all questions have text
    for (let i = 0; i < surveyData.value.questions.length; i++) {
        const q = surveyData.value.questions[i];
        if (!q.text.trim()) {
            validationMessage.value = `Please enter text for question ${i + 1}`;
            validationTargetSection.value = "questions";
            showValidationDialog.value = true;
            return;
        }
        // Validate radio options
        if (q.type === "radio") {
            const validOptions = q.options.filter((o) => (typeof o === "string" ? o.trim() : o.text?.trim()));
            if (validOptions.length < 2) {
                validationMessage.value = `Question ${i + 1} needs at least 2 answer options`;
                validationTargetSection.value = "questions";
                showValidationDialog.value = true;
                return;
            }
        }
    }

    // Check if site is selected
    if (!sitesStore.currentSite) {
        errorMessage.value = "Please select a site first";
        showErrorDialog.value = true;
        return;
    }

    saving.value = true;

    try {
        // Prepare survey data payload
        const surveyPayload = {
            name: surveyData.value.name,
            type: surveyData.value.type,
            description: surveyData.value.description,
            active: surveyData.value.active,
            thank_you_message: surveyData.value.thankYouMessage || null,
            questions: surveyData.value.questions.map((q) => ({
                text: q.text,
                type: q.type,
                options:
                    q.type === "radio"
                        ? q.options
                              .filter((opt) => opt.text?.trim())
                              .map((opt) => ({
                                  text: opt.text,
                                  requires_comment: opt.requiresComment ?? false,
                                  pin_to_bottom: opt.pinToBottom ?? false,
                              }))
                        : [],
                required: q.required,
                randomize_options: q.randomizeOptions ?? false,
            })),
            targeting: {
                pageType: surveyData.value.targeting.pageType,
                pageRules:
                    surveyData.value.targeting.pageType === "specific"
                        ? surveyData.value.targeting.pageRules.filter((r) => r.value.trim())
                        : [],
            },
            behavior: {
                timing: surveyData.value.behavior.timing,
                delaySeconds: surveyData.value.behavior.delaySeconds,
                frequency: surveyData.value.behavior.frequency,
            },
            appearance: {
                backgroundColor: surveyData.value.appearance.backgroundColor,
            },
            displaySettings: {
                show_close_button: surveyData.value.appearance.showCloseButton,
                show_minimize_button: surveyData.value.appearance.showMinimizeButton,
                widget_background_color: surveyData.value.appearance.widgetBackgroundColor,
                widget_background_opacity: surveyData.value.appearance.widgetBackgroundOpacity,
                widget_border_radius: surveyData.value.appearance.widgetBorderRadius,
                text_color: surveyData.value.appearance.textColor,
                question_text_size: surveyData.value.appearance.questionTextSize,
                answer_font_size: surveyData.value.appearance.answerFontSize,
                button_background_color: surveyData.value.appearance.buttonBackgroundColor,
            },
        };

        console.log("Saving survey with complete data:", surveyPayload);

        if (isEditMode.value) {
            // Update existing survey with all data
            await surveysApi.update(route.params.id as string, surveyPayload);
            console.log("Survey updated with all data");
        } else {
            // Create new survey with all data
            const response = await surveysApi.create({
                site_id: sitesStore.currentSite.id,
                ...surveyPayload,
            });
            console.log("Survey created with all data:", response);
        }

        showSuccessDialog.value = true;
    } catch (error: any) {
        console.error("Failed to save survey:", error);
        const data = error.response?.data;
        const msg = data?.message || data?.error || "Failed to save survey. Please try again.";
        errorMessage.value = typeof msg === "string" ? msg : JSON.stringify(data || msg);
        showErrorDialog.value = true;
    } finally {
        saving.value = false;
    }
}

function closeValidationDialog() {
    showValidationDialog.value = false;
    if (validationTargetSection.value) {
        activeSection.value = validationTargetSection.value;
    }
}

function closeSuccessAndNavigate() {
    showSuccessDialog.value = false;
    router.push({ name: "surveys" });
}

onMounted(async () => {
    // Load sites if not already loaded
    if (!sitesStore.hasSites) {
        await sitesStore.fetchSites();
    }

    if (isEditMode.value) {
        // Load survey data if editing
        try {
            const response = await surveysApi.get(route.params.id as string);
            const survey = response.survey as any;

            console.log("Loaded survey data:", survey);

            surveyData.value.name = survey.name;
            surveyData.value.type = survey.type;
            surveyData.value.description = survey.description || "";
            surveyData.value.active = survey.active || false;
            surveyData.value.thankYouMessage = survey.thank_you_message || "";

            // Load questions if they exist
            if (survey.questions && Array.isArray(survey.questions)) {
                console.log("Loading questions:", survey.questions);
                surveyData.value.questions = survey.questions.map((q: any) => ({
                    text: q.question_text || "",
                    type: q.question_type === "radio" ? "radio" : "text",
                    options: q.options
                        ? q.options.map((opt: any) => ({
                              text: opt.option_text || "",
                              requiresComment: opt.requires_comment ?? false,
                              pinToBottom: opt.pin_to_bottom ?? false,
                          }))
                        : [],
                    required: q.required || false,
                    randomizeOptions: q.randomize_options ?? false,
                }));
                console.log("Mapped questions:", surveyData.value.questions);
            } else {
                console.log("No questions found in survey data");
            }

            // Load appearance settings if they exist
            if (survey.appearance) {
                surveyData.value.appearance.backgroundColor = survey.appearance.backgroundColor || "#667eea";
            }
            if (survey.displaySettings) {
                surveyData.value.appearance.showCloseButton = survey.displaySettings.show_close_button !== false;
                surveyData.value.appearance.showMinimizeButton = survey.displaySettings.show_minimize_button === true;
                surveyData.value.appearance.widgetBackgroundColor =
                    survey.displaySettings.widget_background_color || "#141a2c";
                surveyData.value.appearance.widgetBackgroundOpacity =
                    survey.displaySettings.widget_background_opacity ?? 1.0;
                surveyData.value.appearance.widgetBorderRadius = survey.displaySettings.widget_border_radius || "8px";
                surveyData.value.appearance.textColor = survey.displaySettings.text_color || "#ffffff";
                surveyData.value.appearance.questionTextSize = survey.displaySettings.question_text_size || "1em";
                surveyData.value.appearance.answerFontSize = survey.displaySettings.answer_font_size || "0.875em";
                surveyData.value.appearance.buttonBackgroundColor =
                    survey.displaySettings.button_background_color || "#2a44b7";
            }

            // Load targeting rules if they exist
            if (survey.targetingRules && Array.isArray(survey.targetingRules) && survey.targetingRules.length > 0) {
                surveyData.value.targeting = {
                    pageType: "specific",
                    pageRules: survey.targetingRules.map((rule: any) => {
                        const config =
                            typeof rule.rule_config === "string" ? JSON.parse(rule.rule_config) : rule.rule_config;
                        return {
                            type: rule.rule_type,
                            value: config.value || "",
                        };
                    }),
                    users: "all",
                };
            } else {
                // No targeting rules means "all pages"
                surveyData.value.targeting = {
                    pageType: "all",
                    pageRules: [{ type: "exact", value: "" }],
                    users: "all",
                };
            }

            // Load behavior/display settings if they exist
            if (survey.displaySettings) {
                const ds = survey.displaySettings;
                surveyData.value.behavior = {
                    timing: ds.show_delay_ms > 0 ? "delay" : "immediate",
                    delaySeconds: Math.floor((ds.show_delay_ms || 0) / 1000),
                    frequency: ds.display_frequency || "until_submit",
                };
            }
        } catch (error) {
            console.error("Failed to load survey:", error);
            errorMessage.value = "Failed to load survey data";
            showErrorDialog.value = true;
        }
    }
});
</script>

<style scoped>
.survey-editor {
    min-height: 100vh;
    background: #f5f7fa;
    display: flex;
    flex-direction: column;
}

.editor-header {
    background: white;
    border-bottom: 1px solid #e1e4e8;
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 100;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 16px;
}

.header-left h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #333;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 20px;
}

.toggle-container {
    display: flex;
    align-items: center;
}

.toggle-label {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    user-select: none;
}

.toggle-text {
    font-size: 14px;
    font-weight: 500;
    color: #333;
}

.toggle-switch {
    position: relative;
    width: 48px;
    height: 26px;
    background: #ddd;
    border-radius: 13px;
    transition: background 0.3s;
}

.toggle-switch.active {
    background: #667eea;
}

.toggle-input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
}

.toggle-slider {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 50%;
    transition: transform 0.3s;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-switch.active .toggle-slider {
    transform: translateX(22px);
}

.btn-icon {
    background: none;
    border: none;
    color: #666;
    cursor: pointer;
    padding: 8px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
}

.btn-icon:hover {
    background: #f5f5f5;
}

.btn-primary {
    padding: 10px 24px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
    background: #5568d3;
}

.btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.editor-content {
    flex: 1;
    max-width: 900px;
    width: 100%;
    margin: 0 auto;
    padding: 24px;
}

.accordion {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.accordion-item {
    background: white;
    border-radius: 8px;
    border: 1px solid #e1e4e8;
    overflow: hidden;
}

.accordion-header {
    width: 100%;
    padding: 20px 24px;
    background: white;
    border: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    transition: background 0.2s;
    text-align: left;
}

.accordion-header:hover {
    background: #f8f9fa;
}

.accordion-header.complete .checkmark {
    color: #28a745;
}

.header-content {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
}

.checkmark {
    color: #ddd;
    flex-shrink: 0;
}

.title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
}

.subtitle {
    font-size: 14px;
    color: #666;
    margin-left: 8px;
}

.chevron {
    color: #666;
    transition: transform 0.2s;
    flex-shrink: 0;
}

.accordion-item.open .chevron {
    transform: rotate(180deg);
}

.accordion-body {
    padding: 0 24px 24px;
    animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #333;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group textarea,
.form-group select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
    outline: none;
    border-color: #667eea;
}

.form-group textarea {
    resize: vertical;
}

.help-text {
    margin: 4px 0 12px;
    font-size: 13px;
    color: #666;
}

.question-item {
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
    margin-bottom: 16px;
}

.question-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
}

.question-number {
    font-weight: 600;
    color: #667eea;
}

.btn-icon-small {
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.btn-icon-small:hover {
    color: #d73a49;
    background: #fee;
}

.option-input {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
}

.option-input input {
    flex: 1;
}

/* Hotjar-style option row */
.option-row-hotjar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
}

.option-number {
    font-size: 10px;
    font-weight: 600;
    color: #999;
    letter-spacing: 0.05em;
    min-width: 70px;
    flex-shrink: 0;
}

.option-input-hotjar {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
}

.option-input-hotjar:focus {
    outline: none;
    border-color: #667eea;
}

.btn-icon-hotjar {
    background: transparent;
    border: 1px solid #ddd;
    border-radius: 6px;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    padding: 0;
    flex-shrink: 0;
}

.btn-icon-hotjar:hover {
    background: #f5f5f5;
    border-color: #999;
}

.btn-icon-hotjar.active {
    background: #667eea;
    border-color: #667eea;
}

.btn-icon-hotjar.active img {
    filter: brightness(0) invert(1);
}

.btn-icon-hotjar svg {
    color: #666;
}

/* Question controls row at bottom */
.question-controls-row {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #e8e8e8;
}

.btn-add-answer {
    background: none;
    border: none;
    color: #667eea;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    padding: 0;
}

.btn-add-answer:hover {
    text-decoration: underline;
}

.checkbox-inline {
    display: flex;
    align-items: center;
    font-size: 14px;
    color: #333;
    cursor: pointer;
    white-space: nowrap;
}

.checkbox-inline input[type="checkbox"] {
    cursor: pointer;
    margin: 0 8px 0 0 !important;
    flex-shrink: 0;
    width: 16px;
    height: 16px;
}

.checkbox-inline span {
    user-select: none;
    line-height: 1.2;
}

.thank-you-section {
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid #e8e8e8;
}

.field-hint {
    margin: 4px 0 8px 0;
    font-size: 13px;
    color: #666;
}

.btn-text {
    background: none;
    border: none;
    color: #667eea;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    padding: 8px 0;
}

.btn-text:hover {
    text-decoration: underline;
}

.btn-secondary {
    width: 100%;
    padding: 12px;
    background: white;
    border: 2px dashed #ddd;
    border-radius: 6px;
    color: #667eea;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-secondary:hover {
    border-color: #667eea;
    background: #f0f4ff;
}

.radio-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;
}

.checkbox-label,
.radio-label {
    display: flex;
    align-items: center;
    padding: 8px 0;
    cursor: pointer;
    font-weight: 400;
}

.checkbox-label input[type="checkbox"],
.radio-label input[type="radio"] {
    width: 16px;
    height: 16px;
    margin: 0 8px 0 0 !important;
    padding: 0;
    cursor: pointer;
    flex-shrink: 0;
}

.checkbox-label span,
.radio-label span {
    line-height: 1.2;
    font-size: 14px;
    color: #333;
}

.color-picker {
    display: flex;
    gap: 12px;
    align-items: center;
}

.color-input {
    width: 60px;
    height: 40px;
    border: 1px solid #ddd;
    border-radius: 6px;
    cursor: pointer;
}

.color-text {
    flex: 1;
    max-width: 150px;
}

.rule-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
}

.rule-type {
    flex: 0 0 200px;
    min-width: 200px;
    max-width: 240px;
}

.rule-value {
    flex: 1;
    min-width: 200px;
}

.rule-remove {
    flex-shrink: 0;
}

.delay-input {
    margin-top: 12px;
    padding-left: 24px;
}

.input-with-unit {
    display: flex;
    align-items: center;
    gap: 8px;
}

.number-input {
    width: 100px;
}

.unit {
    font-size: 14px;
    color: #666;
}

.summary-section {
    margin-bottom: 24px;
}

.summary-section h3 {
    margin: 0 0 12px 0;
    font-size: 16px;
    font-weight: 600;
    color: #333;
}

.summary-item {
    padding: 8px 0;
    font-size: 14px;
    color: #666;
}

.summary-item strong {
    color: #333;
    margin-right: 8px;
}

/* Custom Dialog Styles */
:deep(.p-dialog.custom-dialog) {
    background: #ffffff !important;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

:deep(.custom-dialog .p-dialog-header) {
    background: #ffffff !important;
    padding: 24px 32px 16px;
    border: none;
}

:deep(.custom-dialog .p-dialog-content) {
    background: #ffffff !important;
    padding: 0 32px 24px;
}

:deep(.custom-dialog .p-dialog-footer) {
    background: #ffffff !important;
    padding: 20px 32px 28px;
    border: none;
}

.dialog-header-content {
    display: flex;
    align-items: center;
    gap: 16px;
}

.dialog-header-content h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #1a1a1a;
}

.dialog-icon {
    flex-shrink: 0;
    width: 56px;
    height: 56px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: iconPop 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes iconPop {
    0% {
        transform: scale(0);
        opacity: 0;
    }
    100% {
        transform: scale(1);
        opacity: 1;
    }
}

.success-icon-circle {
    background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
    color: #155724;
}

.error-icon-circle {
    background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
    color: #721c24;
}

.warning-icon-circle {
    background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
    color: #856404;
}

.confirm-icon-circle {
    background: linear-gradient(135deg, #e3e8ef 0%, #d6dce5 100%);
    color: #495057;
}

.dialog-body {
    animation: fadeIn 0.3s ease-out;
}

.dialog-body p {
    margin: 0;
    font-size: 15px;
    color: #4a5568;
    line-height: 1.6;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.dialog-footer {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
}

.btn-dialog-primary {
    padding: 11px 28px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.25);
}

.btn-dialog-primary:hover {
    background: #5568d3;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.35);
}

.btn-dialog-primary:active {
    transform: translateY(0);
}

.btn-dialog-secondary {
    padding: 11px 24px;
    background: white;
    color: #4a5568;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-dialog-secondary:hover {
    background: #f7fafc;
    border-color: #cbd5e0;
    color: #2d3748;
}

.btn-dialog-danger {
    padding: 11px 28px;
    background: #e53e3e;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(229, 62, 62, 0.25);
}

.btn-dialog-danger:hover {
    background: #c53030;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(229, 62, 62, 0.35);
}

.btn-dialog-danger:active {
    transform: translateY(0);
}

/* Dialog overlay */
:deep(.p-dialog-mask) {
    backdrop-filter: blur(6px);
    background-color: rgba(0, 0, 0, 0.55);
    animation: fadeInOverlay 0.2s ease-out;
}

@keyframes fadeInOverlay {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

:deep(.custom-dialog) {
    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}
</style>
