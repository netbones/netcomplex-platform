import { Mark } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontFamily: {
      setFontFamily: (fontFamily: string) => ReturnType;
      unsetFontFamily: () => ReturnType;
    };
  }
}

export const FontFamily = Mark.create({
  name: 'fontFamily',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: element => {
          const style = (element as HTMLElement).style.fontFamily;
          return style ? { fontFamily: style.replace(/["']/g, '') } : null;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', { style: `font-family: ${HTMLAttributes.fontFamily}` }, 0];
  },

  addCommands() {
    return {
      setFontFamily: (fontFamily: string) => {
        return ({ commands }) => {
          return commands.updateAttributes('textStyle', { fontFamily });
        };
      },
      unsetFontFamily: () => {
        return ({ commands }) => {
          return commands.updateAttributes('textStyle', { fontFamily: null });
        };
      },
    };
  },
});
