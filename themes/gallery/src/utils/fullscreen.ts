// 检查是否在浏览器环境中
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

// 全屏 API 帮助函数
export function getFullscreenAPI() {
  if (!isBrowser) return null;

  let api: Record<string, any>;
  let enterFS: string;
  let exitFS: string;
  let elementFS: string;
  let changeEvent: string;
  let errorEvent: string;

  if (typeof document.documentElement.requestFullscreen === "function") {
    enterFS = "requestFullscreen";
    exitFS = "exitFullscreen";
    elementFS = "fullscreenElement";
    changeEvent = "fullscreenchange";
    errorEvent = "fullscreenerror";

    if (enterFS) {
      api = {
        request: function (el: Element) {
          if (enterFS === "webkitRequestFullscreen") {
            // WebKit 的 ALLOW_KEYBOARD_INPUT 值为 1
            (el as any)[enterFS](1);
          } else {
            (el as any)[enterFS]();
          }
        },

        exit: function () {
          return (document as any)[exitFS]();
        },

        isFullscreen: function () {
          return (document as any)[elementFS];
        },

        change: changeEvent,
        error: errorEvent,
      };
      return api;
    }
  }
}

export function getContainer() {
  if (!isBrowser) return null;

  const pswpContainer = document.createElement("div");
  pswpContainer.style.background = "#000";
  pswpContainer.style.width = "100%";
  pswpContainer.style.height = "100%";
  pswpContainer.style.display = "none";
  document.body.appendChild(pswpContainer);
  return pswpContainer;
}

export function getFullscreenPromise(pswpContainer: HTMLElement) {
  if (!isBrowser) return Promise.resolve();

  const fullscreenAPI = getFullscreenAPI();
  return new Promise<void>((resolve, reject) => {
    if (!fullscreenAPI || fullscreenAPI.isFullscreen()) {
      resolve();
      return;
    }

    // 监听全屏变化事件
    document.addEventListener(
      fullscreenAPI.change,
      () => {
        pswpContainer.style.display = "block";
        setTimeout(function () {
          resolve();
        }, 300);
      },
      { once: true },
    );

    // 监听全屏错误事件
    document.addEventListener(
      fullscreenAPI.error,
      (e) => {
        reject(new Error("全屏请求失败"));
      },
      { once: true },
    );

    // 只在用户交互时尝试请求全屏
    if (document.hasFocus()) {
      fullscreenAPI.request(pswpContainer);
    } else {
      resolve(); // 如果不是用户交互，就直接 resolve
    }
  });
}
