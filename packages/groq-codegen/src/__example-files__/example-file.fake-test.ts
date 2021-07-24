// this file is never run, it's just use to test the pluck function.
// inspired by next.js use cases

// @ts-ignore
import sanity from './blah/configured-client';
// @ts-ignore
import groq from 'groq';

export const getStaticProps = async () => {
  const author = await sanity.query(
    'FakeBookAuthor',
    groq`
      *[_type == 'book'][0].author
    `,
  );

  sanity.query(
    'FakeBookTitles',
    groq`
      *[_type == 'book'].title
    `,
  );

  sanity.query('FakeAllBooks', groq`*[_type == 'book']`);

  return { props: { author } };
};

function BookPage({ author }: any) {
  return author.name;
}

export default BookPage;
