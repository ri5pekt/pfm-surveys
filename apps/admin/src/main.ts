import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import router from './router';
import App from './App.vue';
import './assets/primevue-vars.css';

document.title = `${import.meta.env.VITE_APP_NAME} - Admin`;

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(PrimeVue);

app.mount('#app');
