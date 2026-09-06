import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  h1: (props) => <h1 className="text-center text-xl font-bold" {...props} />,
  h2: (props) => <h2 className="mt-8 text-base font-semibold" {...props} />,
  h3: (props) => <h3 className="mt-4 text-sm font-semibold" {...props} />,
  p: (props) => <p className="mt-3 text-justify leading-relaxed" {...props} />,
  ol: (props) => <ol className="mt-3 list-decimal space-y-2 pl-5" {...props} />,
  ul: (props) => <ul className="mt-3 list-disc space-y-2 pl-5" {...props} />,
  li: (props) => <li className="pl-1" {...props} />,
  table: (props) => (
    <table className="mt-3 w-full border-collapse text-left" {...props} />
  ),
  th: (props) => <th className="border border-black/15 p-2 font-semibold" {...props} />,
  td: (props) => <td className="border border-black/15 p-2" {...props} />,
  strong: (props) => <strong className="font-semibold" {...props} />,
};

export default function DocumentPreview({ markdown }: { markdown: string }) {
  return (
    <article className="mx-auto max-w-[720px] bg-white p-8 text-[13px] leading-relaxed text-black shadow-sm print:shadow-none sm:p-10">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </Markdown>
    </article>
  );
}
