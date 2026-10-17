function numbered(round) {
  return round >= 1 && round <= 5 ? `-${round}` : ""
}

export function pin() {
  const element = document.createElement("div")
  element.className = "marker guess"
  element.innerHTML = `<img src="/pins/target.webp" alt="" draggable="false">`
  return element
}

export function answerMarker(round) {
  const element = document.createElement("div")
  element.className = "marker answer"
  element.innerHTML = `<img class="dot" src="/pins/arrow${numbered(round)}.webp" alt="" draggable="false">`
  return element
}

export function devMarker(colour) {
  const element = document.createElement("div")
  element.className = "marker dev"
  element.innerHTML = `<span class="dot"></span>`
  element.firstChild.style.background = colour
  return element
}
