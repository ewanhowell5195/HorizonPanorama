<script>
const preload = new Image()
preload.src = "/cauldrons/loading.webp"
preload.decode().catch(() => {})
</script>

<template>
  <div class="loading-emblem">
    <div class="rows">
      <img src="/cauldrons/loading.webp" alt="" />
    </div>
  </div>
</template>

<style scoped>
.loading-emblem {
  width: 180px;
  aspect-ratio: 120 / 64;
  overflow: hidden;
}

/* 174 frames at 15 fps in 6 columns and 29 rows, the grid tools/game/build_cauldrons.py writes */
.rows {
  width: 600%;
  will-change: transform;
  animation: loading-rows 11.6s steps(29) infinite;
}

.rows img {
  display: block;
  width: 100%;
  will-change: transform;
  animation: loading-columns 0.4s steps(6) infinite;
}

@keyframes loading-rows {
  to {
    transform: translateY(-100%);
  }
}

@keyframes loading-columns {
  to {
    transform: translateX(-100%);
  }
}
</style>
