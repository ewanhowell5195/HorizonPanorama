export function pin(color, label) {
  const element = document.createElement("div")
  element.className = "marker"
  element.innerHTML = `<svg viewBox="0 0 24 32" width="24" height="32"><path d="M12 31C12 31 22 18.5 22 11.5A10 10 0 0 0 2 11.5C2 18.5 12 31 12 31Z" fill="${color}" stroke="#000" stroke-opacity="0.5"/><circle cx="12" cy="11.5" r="3.5" fill="#000" fill-opacity="0.45"/></svg>`
  if (label) {
    element.insertAdjacentHTML("beforeend", `<span class="tag">${label}</span>`)
  }
  return element
}

export function answerMarker(label) {
  const element = document.createElement("div")
  element.className = "marker answer"
  element.innerHTML = `<span class="dot"></span>${label ? `<span class="tag">${label}</span>` : ""}`
  return element
}
