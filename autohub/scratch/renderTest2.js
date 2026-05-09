const fs = require('fs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

async function test() {
  const ReactMarkdown = (await import('react-markdown')).default;
  const remarkGfm = (await import('remark-gfm')).default;
  const rehypeRaw = (await import('rehype-raw')).default;

  const el = React.createElement(ReactMarkdown, {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeRaw]
  }, '<div class="my-class">Test</div>');
  
  console.log(renderToStaticMarkup(el));
}

test();
