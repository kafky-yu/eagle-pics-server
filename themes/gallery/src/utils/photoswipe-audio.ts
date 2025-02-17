"use client";

import type PhotoSwipeLightbox from "photoswipe/dist/types/lightbox/lightbox";
import type Content from "photoswipe/dist/types/slide/content";

interface AudioContent extends Content {
  audioElement: HTMLAudioElement;
}

const initLightboxAudioPlugin = (lightbox: PhotoSwipeLightbox) => {
  lightbox.on("contentLoad", (e) => {
    const content = e.content as AudioContent;
    if (content.type.includes("audio")) {
      // stop default content load
      e.preventDefault();

      const audio = document.createElement("audio");
      audio.controls = true;
      audio.preload = "auto";
      audio.setAttribute("poster", content.data.msrc ?? "");
      audio.src = content.data.src!;

      content.audioElement = audio;
      content.element = document.createElement("div");
      content.element.classList.add("pswp__audio-container");
      content.element.appendChild(audio);
    }
  });

  lightbox.on("contentActivate", (e) => {
    const content = e.content as AudioContent;
    if (content.audioElement) {
      void content.audioElement.play();
    }
  });

  lightbox.on("contentDeactivate", (e) => {
    const content = e.content as AudioContent;
    if (content.audioElement) {
      content.audioElement.pause();
    }
  });
};

export default initLightboxAudioPlugin;
