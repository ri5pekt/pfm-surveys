<template>
    <RouterView />
</template>

<script setup lang="ts">
import { RouterView } from "vue-router";
</script>

<style>
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

#app {
    width: 100%;
    min-height: 100vh;
}

/* Global checkbox/radio label spacing */
label:has(input[type="checkbox"]),
label:has(input[type="radio"]) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
}

label:has(input[type="checkbox"]) input[type="checkbox"],
label:has(input[type="radio"]) input[type="radio"] {
    cursor: pointer;
}
</style>
