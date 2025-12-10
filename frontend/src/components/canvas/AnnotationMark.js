import { Mark, mergeAttributes } from '@tiptap/core'

/**
 * Custom TipTap mark for annotation highlights.
 * Renders annotated text with a purple background and underline.
 */
const AnnotationMark = Mark.create({
  name: 'annotationMark',

  addOptions() {
    return {
      annotations: [],
      onAnnotationClick: () => {},
      HTMLAttributes: {
        class: 'annotation-highlight',
      },
    }
  },

  addAttributes() {
    return {
      annotationId: {
        default: null,
        parseHTML: element => element.getAttribute('data-annotation-id'),
        renderHTML: attributes => {
          if (!attributes.annotationId) {
            return {}
          }
          return {
            'data-annotation-id': attributes.annotationId,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-annotation-id]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        style: `
          background-color: rgba(168, 85, 247, 0.15);
          border-bottom: 2px solid rgba(168, 85, 247, 0.6);
          padding: 0 2px;
          border-radius: 2px;
          cursor: pointer;
        `,
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setAnnotation: (annotationId) => ({ commands }) => {
        return commands.setMark(this.name, { annotationId })
      },
      unsetAnnotation: () => ({ commands }) => {
        return commands.unsetMark(this.name)
      },
    }
  },
})

export default AnnotationMark
