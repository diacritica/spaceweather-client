export function sound(src, options = {}) {
  options = Object.assign({
    volume: 1.0,
    loop: false,
    mute: false
  }, options);

  const element = document.createElement("audio");
  element.src = src;
  element.volume = options.volume;
  element.loop = options.loop;
  return element;
}

export function initSounds() {

  document.addEventListener("visibilitychange", (e) => {
    if (document.visibilityState === "visible") {
      ambient.play();
    } else {
      ambient.pause();
    }
  });

  const ambient = sound("sounds/background.mp3", { loop: true });
  ambient.play();

  function handleMouseOver(e) {
    const over = sound("sounds/over.mp3");
    over.play();
  }

  Array.prototype.slice.call(document.querySelectorAll("[class*=item], [class*=menuItem]")).map((el) => {
    el.addEventListener("mouseover", handleMouseOver, false);
    return el;
  });

  let volume = 1.0;
  return {
    set volume(value) {
      ambient.volume = volume = value;
    },
    get volume() {
      return volume;
    }
  };

}