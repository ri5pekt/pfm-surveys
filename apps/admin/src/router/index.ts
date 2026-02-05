import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: "/login",
            name: "login",
            component: () => import("../views/LoginView.vue"),
            meta: { requiresAuth: false },
        },
        {
            path: "/",
            component: () => import("../views/DashboardLayout.vue"),
            meta: { requiresAuth: true },
            children: [
                {
                    path: "",
                    name: "surveys",
                    component: () => import("../views/SurveysView.vue"),
                },
                {
                    path: "survey/new",
                    name: "survey-new",
                    component: () => import("../views/SurveyEditorView.vue"),
                },
                {
                    path: "survey/:id/responses",
                    name: "survey-responses",
                    component: () => import("../views/SurveyResponsesView.vue"),
                },
                {
                    path: "survey/:id",
                    name: "survey-edit",
                    component: () => import("../views/SurveyEditorView.vue"),
                },
                {
                    path: "websites",
                    name: "websites",
                    component: () => import("../views/WebsitesView.vue"),
                },
                {
                    path: "team",
                    name: "team",
                    component: () => import("../views/TeamView.vue"),
                },
                {
                    path: "operations",
                    name: "operations",
                    component: () => import("../views/OperationsView.vue"),
                },
                {
                    path: "profile",
                    name: "profile",
                    component: () => import("../views/ProfileView.vue"),
                },
                {
                    path: "add-site",
                    name: "add-site",
                    component: () => import("../views/AddSiteView.vue"),
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
