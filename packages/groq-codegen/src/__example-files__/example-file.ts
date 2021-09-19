// this file is never run, it's just use to test the pluck function.
// inspired by next.js use cases

// @ts-ignore
import sanity from './blah/configured-client';
// @ts-ignore
import groq from 'groq';
import bookType, { bookProjection, alias } from './example-queries';
import bookTypeAgain from './export-default';
import { defaultAlias } from './default-reexport';
import * as FromStar from './export-star'

export const getStaticProps = async () => {
  const author = await sanity.query(
    'BookAuthorUsesDefaultAlias',
    groq`
      *[_type == '${defaultAlias}'][0].author
    `,
  );

  sanity.query(
    'BookTitlesUsesDefaultExport',
    groq`
      *[_type == '${bookType}'].title
    `,
  );

  sanity.query(
    'AllBooksUsesDefaultReexport',
    groq`*[_type == '${bookTypeAgain}'].title`,
  );

  sanity.query(
    'AllBooksUsesNamedDeclaredExport',
    groq`*[_type == 'book'] ${bookProjection}`,
  );

  sanity.query(
    'AllBooksUsesNameSpecifiedExport',
    groq`*[_type == 'book'] ${alias}`,
  );

  sanity.query(
    'ImportStarExportStar',
    groq`*[_type == 'book'] ${FromStar.alias}`
  )

  return { props: { author } };
};

function BookPage({ author }: any) {
  return author.name;
}

export default BookPage;
