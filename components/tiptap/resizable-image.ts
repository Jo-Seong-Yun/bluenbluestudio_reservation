import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ResizableImageView } from "./resizable-image-view";

/**
 * 기본 Image 확장에 폭(width)과 커스텀 NodeView를 더한 것.
 * NodeView가 이미지를 에디터 안에서 바로 자르고/크기 조절하고/
 * 드래그로 위치를 옮길 수 있게 해준다 — 별도 팝업 없이.
 */
export const ResizableImage = Image.extend({
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => {
          const value = element.getAttribute("width");
          return value ? Number(value) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});
