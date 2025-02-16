import { useEffect, useRef, useState } from "react";
import PhotoSwipeLightbox from "photoswipe/lightbox";

import { getFullscreenAPI, getFullscreenPromise } from "~/utils/fullscreen";
import initLightboxVideoPlugin from "~/utils/photoswipe-video";

export function useGalleryLightbox() {
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState<number | null>(
    null,
  );
  const autoPlayIntervalRef = useRef<NodeJS.Timeout>();
  const lightboxRef = useRef<PhotoSwipeLightbox>();

  const getAutoPlayButtonHtml = (playing: boolean) => `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
      class="rounded-full p-2 transition-colors text-white"
      style="backdrop-filter: blur(8px);"
    >
      ${
        playing
          ? '<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />'
          : '<path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653Z" />'
      }
    </svg>
  `;

  const getFullscreenButtonHtml = (fullscreen: boolean) => `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
      class="rounded-full p-2 transition-colors text-white"
      style="backdrop-filter: blur(8px);"
    >
      ${
        fullscreen
          ? '<path stroke-linecap="round" stroke-linejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />'
          : '<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />'
      }
    </svg>
  `;

  useEffect(() => {
    const fullscreenAPI = getFullscreenAPI();

    const lightbox = new PhotoSwipeLightbox({
      pswpModule: () => import("photoswipe"),
      loop: false,
      showAnimationDuration: 0,
      hideAnimationDuration: 0,
      preloadFirstSlide: false,
      children: "a",
      initialZoomLevel: "fit",
      secondaryZoomLevel: 1.5,
      maxZoomLevel: 1,
    });

    lightbox.on("uiRegister", function () {
      lightbox?.pswp?.ui?.registerElement({
        name: "auto-play-button",
        order: 8,
        isButton: true,
        ariaLabel: "Toggle auto play",
        html: getAutoPlayButtonHtml(false),
        onClick: (event, el) => {
          setIsAutoPlaying((prevState) => {
            const newState = !prevState;
            el.innerHTML = getAutoPlayButtonHtml(newState);
            return newState;
          });
        },
      });

      lightbox?.pswp?.ui?.registerElement({
        name: "fullscreen-button",
        order: 9,
        isButton: true,
        ariaLabel: "Toggle fullscreen",
        html: getFullscreenButtonHtml(false),
        onClick: (event, el) => {
          const pswpElement = document.querySelector(".pswp");

          if (
            pswpElement instanceof HTMLElement &&
            !fullscreenAPI?.isFullscreen()
          ) {
            getFullscreenPromise(pswpElement)
              .then(() => (el.innerHTML = getFullscreenButtonHtml(true)))
              .catch((error) => {
                console.warn("全屏API调用有误:", error);
              });
          }

          if (fullscreenAPI?.isFullscreen()) {
            fullscreenAPI.exit();
            el.innerHTML = getFullscreenButtonHtml(false);
          }
        },
      });
    });

    initLightboxVideoPlugin(lightbox);

    // lightbox.on("change", () => {
    //   setCurrentImageIndex(lightbox.pswp?.currIndex ?? null);
    // });

    lightbox.on("close", () => {
      setIsAutoPlaying(false);
      setCurrentImageIndex(null);
      if (fullscreenAPI?.isFullscreen()) {
        fullscreenAPI.exit();
      }
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
      }
    });

    lightbox.init();
    lightboxRef.current = lightbox;

    return () => {
      lightbox.destroy();
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!lightboxRef.current?.pswp || currentImageIndex === null) return;

    if (isAutoPlaying) {
      autoPlayIntervalRef.current = setInterval(() => {
        lightboxRef.current?.pswp?.next();
      }, 3000);
    } else if (autoPlayIntervalRef.current) {
      clearInterval(autoPlayIntervalRef.current);
    }

    return () => {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
      }
    };
  }, [isAutoPlaying, currentImageIndex]);

  return {
    isAutoPlaying,
    setIsAutoPlaying,
    currentImageIndex,
    setCurrentImageIndex,
    lightboxRef,
    autoPlayIntervalRef,
  };
}
