import { memo } from "react";
import ReactMarkdown from "react-markdown";
import { Highlight, PrismTheme } from "prism-react-renderer";

type MarkdownProps = {
  text?: string;
};

const Markdown = ({ text }: MarkdownProps) => (
  <ReactMarkdown
    components={{
      code({ className, children, ...props }) {
        const match = /language-(\w+)/.exec(className || "");
        return match ? (
          <Highlight theme={oneDarkTheme} code={String(children).replace(/\n$/, "")} language={match[1]}>
            {({ tokens, getLineProps, getTokenProps }) => (
              <>
                {tokens.map((line, i) => (
                  <div key={i} {...getLineProps({ line })}>
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </div>
                ))}
              </>
            )}
          </Highlight>
        ) : (
          <code {...props} className={className}>
            {children}
          </code>
        );
      },
    }}
  >
    {text || ""}
  </ReactMarkdown>
);

export default memo(Markdown);

const oneDarkTheme: PrismTheme = {
  plain: { color: "#abb2bf" },
  styles: [
    { types: ["comment", "prolog"], style: { color: "#5c6370", fontStyle: "italic" } },
    { types: ["punctuation", "operator"], style: { color: "#56b6c2" } },
    { types: ["variable"], style: { color: "#e06c75" } },
    { types: ["property", "constant"], style: { color: "#ef596f" } },
    { types: ["string", "url", "attr-value"], style: { color: "#98c379" } },
    { types: ["keyword", "selector"], style: { color: "#c678dd" } },
    { types: ["number", "boolean"], style: { color: "#d19a66" } },
    { types: ["function", "builtin"], style: { color: "#81cbff" } },
    { types: ["tag", "doctype"], style: { color: "#e06c75" } },
    { types: ["attr-name"], style: { color: "#d19a66" } },
    { types: ["class-name", "maybe-class-name"], style: { color: "#60b5ff" } },
    { types: ["namespace"], style: { color: "#ee9393" } },
    { types: ["deleted"], style: { color: "#de7474" } },
    { types: ["important", "bold"], style: { fontWeight: "bold" } },
    { types: ["regex"], style: { color: "#a9e942" } },
    { types: ["italic"], style: { fontStyle: "italic" } },
    { types: ["entity"], style: { color: "#f9c859" } },
    { types: ["inserted"], style: { color: "#9dd66a" } },
  ],
};
