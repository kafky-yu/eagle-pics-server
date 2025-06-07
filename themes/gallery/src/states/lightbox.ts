import { atom } from 'recoil';

export const lightboxOpenState = atom<boolean>({
  key: 'lightboxOpenState',
  default: false,
});
