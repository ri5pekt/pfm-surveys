import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";
import LoginView from "../views/LoginView.vue";
import DashboardLayout from "../views/DashboardLayout.vue";
import SurveysView from "../views/SurveysView.vue";
import SurveyEditorView from "../views/SurveyEditorView.vue";
import SurveyResponsesView from "../views/SurveyResponsesView.vue";
import AddSiteView from "../views/AddSiteView.vue";
import WebsitesView from "../views/WebsitesView.vue";
import TeamView from "../views/TeamView.vue";
import ProfileView from "../views/ProfileView.vue";
import OperationsView from "../views/OperationsView.vue";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: "/login",
            name: "login",
            component: LoginView,
            meta: { requiresAuth: false },
        },
        {
            path: "/",
            component: DashboardLayout,
            meta: { requiresAuth: true },
            children: [
                {
                    path: "",
                    name: "surveys",
                    component: SurveysView,
                },
                {
                    path: "survey/new",
                    name: "survey-new",
                    component: SurveyEditorView,
                },
                {
                    path: "survey/:id/responses",
                    name: "survey-responses",
                    component: SurveyResponsesView,
                },
                {
                    path: "survey/:id",
                    name: "survey-edit",
                    component: SurveyEditorView,
                },
                {
                    path: "websites",
                    name: "websites",
                    component: WebsitesView,
                },
                {
                    path: "team",
                    name: "team",
                    component: TeamView,
                },
                {
                    path: "operations",
                    name: "operations",
                    component: OperationsView,
                },
                {
                    path: "profile",
                    name: "profile",
                    component: ProfileView,
                },
                {
                    path: "add-site",
                    name: "add-site",
                    component: AddSiteView,
                },
            ],
        },
    ],
});

// Auth guard
router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore();
    const requiresAuth = to.meta.requiresAuth !== false;

    if (requiresAuth && !authStore.isAuthenticated) {
        next({ name: "login" });
    } else if (to.name === "login" && authStore.isAuthenticated) {
        next({ name: "surveys" });
    } else {
        next();
    }
});

export default router;
