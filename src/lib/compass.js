const COMPASS_WIDTH = 2048
const CARDINALS = [["N", 0], ["E", 512], ["S", 1024], ["W", 1536]]

export function createCompass() {
  const element = document.createElement("div")
  element.className = "compass"
  element.innerHTML = `<div class="compass-shadow"></div><div class="compass-marks"><div class="compass-bar"><div class="compass-ticks"></div>${CARDINALS.map(([text]) => `<span>${text}</span>`).join("")}</div><div class="compass-line"></div></div>`
  const ticks = element.querySelector(".compass-ticks")
  const letters = Array.from(element.querySelectorAll(".compass-bar span"))
  let shown = null

  function setHeading(degrees) {
    if (degrees === shown) {
      return
    }
    shown = degrees
    const position = degrees * COMPASS_WIDTH / 360
    ticks.style.setProperty("--x", COMPASS_WIDTH - position)
    CARDINALS.forEach(([, offset], n) => {
      const x = ((offset - position + COMPASS_WIDTH / 2) % COMPASS_WIDTH + COMPASS_WIDTH) % COMPASS_WIDTH - COMPASS_WIDTH / 2
      letters[n].style.setProperty("--x", x)
    })
  }

  setHeading(0)
  return { element, setHeading }
}
