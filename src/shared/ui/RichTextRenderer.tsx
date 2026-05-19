interface TipTapNode {
  type: string;
  content?: TipTapNode[];
  attrs?: Record<string, unknown>;
  text?: string;
  marks?: Array<{ type: string }>;
}

function renderText(node: TipTapNode): React.ReactNode {
  let result: React.ReactNode = node.text || '';
  if (node.marks) {
    for (const mark of node.marks) {
      if (mark.type === 'bold') result = <strong>{result}</strong>;
      if (mark.type === 'italic') result = <em>{result}</em>;
      if (mark.type === 'underline') result = <u>{result}</u>;
      if (mark.type === 'strike') result = <s>{result}</s>;
    }
  }
  return result;
}

function renderNode(node: TipTapNode, key: number): React.ReactNode {
  const { type, content, attrs } = node;
  if (!type) return null;

  switch (type) {
    case 'heading': {
      const level = (attrs?.level as number) || 2;
      const headingStyles: Record<number, string> = {
        1: 'text-3xl font-bold text-gray-900 mt-8 mb-4',
        2: 'text-2xl font-bold text-gray-900 mt-6 mb-3',
        3: 'text-xl font-semibold text-gray-900 mt-4 mb-2',
      };
      const HeadingElement = level === 1 ? 'h1' : level === 3 ? 'h3' : 'h2';
      return (
        <HeadingElement key={key} className={headingStyles[level] || headingStyles[2]}>
          {content?.map((child, i) => renderText(child))}
        </HeadingElement>
      );
    }
    case 'paragraph':
      return (
        <p key={key} className="text-gray-700 leading-relaxed mb-4">
          {content?.map((child, i) => renderText(child))}
        </p>
      );
    case 'bulletList':
      return (
        <ul key={key} className="list-disc list-inside space-y-2 mb-4 text-gray-700">
          {content?.map((item, i) => (
            <li key={i}>{item.content?.map((child, j) => renderNode(child, j))}</li>
          ))}
        </ul>
      );
    case 'orderedList':
      return (
        <ol key={key} className="list-decimal list-inside space-y-2 mb-4 text-gray-700">
          {content?.map((item, i) => (
            <li key={i}>{item.content?.map((child, j) => renderNode(child, j))}</li>
          ))}
        </ol>
      );
    case 'blockquote':
      return (
        <blockquote key={key} className="border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-4">
          {content?.map((child, i) => renderNode(child, i))}
        </blockquote>
      );
    case 'codeBlock':
      return (
        <pre key={key} className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
          <code>{content?.[0]?.text || ''}</code>
        </pre>
      );
    case 'horizontalRule':
      return <hr key={key} className="my-6 border-gray-200" />;
    case 'text':
      return <span key={key}>{renderText(node)}</span>;
    default:
      return null;
  }
}

export interface RichTextRendererProps {
  content: string | Record<string, unknown>;
  className?: string;
}

export function RichTextRenderer({ content, className }: RichTextRendererProps) {
  if (typeof content === 'string') {
    return <p className={`text-gray-700 leading-relaxed ${className || ''}`}>{content}</p>;
  }

  if (content && typeof content === 'object' && 'type' in content) {
    const doc = content as unknown as TipTapNode;

    if (doc.type === 'doc' && doc.content) {
      return (
        <div className={className}>{doc.content.map((node, idx) => renderNode(node, idx))}</div>
      );
    }

    return renderNode(doc, 0);
  }

  return <p className={`text-gray-700 ${className || ''}`}>{String(content)}</p>;
}
