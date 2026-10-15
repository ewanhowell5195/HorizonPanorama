<script setup>
defineProps({ visible: Boolean, label: { type: String, default: "Horizon Wayfinder" }, width: Number })
</script>

<template>
  <section class="screen" :class="{ visible }">
    <header class="screen-top">
      <span class="mark mark-slot" aria-hidden="true"><i class="mark-emblem"></i>{{ label }}</span>
      <slot name="top" />
    </header>
    <div class="screen-main" :style="width ? { maxWidth: `${width}px` } : null">
      <slot />
    </div>
    <slot name="bottom" />
  </section>
</template>
