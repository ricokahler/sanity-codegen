// this file is never run, it's just use to test the pluck function.
// inspired by next.js use cases

// @ts-ignore
import sanity from './blah/configured-client';
// @ts-ignore
import groq from 'groq';

export const getStaticProps = async () => {
  const author = await sanity.query(
    'BookAuthor',
    groq`
      *[_type == 'book'][0].author
    `,
  );

  sanity.query(
    'BookTitles',
    groq`
      *[_type == 'book'].title
    `,
  );

  return { props: { author } };
};

function BookPage({ author }: any) {
  return author.name;
}

export default BookPage;
